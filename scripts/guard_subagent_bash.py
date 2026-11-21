#!/usr/bin/env python3
"""サブエージェントの Bash コマンドを検査する PreToolUse フック（エージェント定義の frontmatter から呼ぶ）。

使い方:
  python3 scripts/guard_subagent_bash.py --mode readonly   # evaluator: 読み取りと検証の実行だけ
  python3 scripts/guard_subagent_bash.py --mode nogit      # generator / designer: git の履歴を変える操作を禁止

stdin の JSON（tool_input.command）を読み、違反があれば理由を stderr に出して終了コード 2 を返す。
これは「うっかり」を防ぐ対策であり、文字列の組み立てやスクリプト経由の意図的な迂回は防げない。
（ヒアドキュメントの本文と引用符内の文字列は、誤検出を避けるため検査から除く）
"""
import json
import re
import sys

# git の履歴・リモート・作業ツリーを変える操作（全モード共通）。CLAUDE.md「サブエージェントに commit / push をさせない」
GIT_WRITE = r"\bgit\s+(?:-[Cc]\s+\S+\s+|--[\w-]+(?:=\S+)?\s+)*(commit|push|tag|rebase|merge|reset|clean|stash|restore|checkout|switch|cherry-pick|revert|am|apply)\b"

COMMON = [
    (GIT_WRITE, "git の履歴・リモート・作業ツリーを変える操作（commit / push / reset / checkout など）"),
]

# evaluator 専用（読み取りと検証の実行だけを許す）
READONLY = [
    (r"\bgit\s+(?:-[Cc]\s+\S+\s+|--[\w-]+(?:=\S+)?\s+)*(add|rm|mv)\b", "git add / rm / mv"),
    (r"(^|[;&|(]\s*|\s)(rm|rmdir|mv|cp|mkdir|touch|tee|chmod|chown|ln|truncate|dd|install)\s", "ファイルの作成・変更・削除コマンド"),
    (r"\bsed\s+(?:-[a-zA-Z]*\s+)*-[a-zA-Z]*i", "sed -i によるファイル編集"),
    (r"\b(npm|pnpm|yarn|bun)\s+(install|i|add|remove|uninstall|update|upgrade)\b", "パッケージのインストール・変更"),
    (r"\b(pip3?|uv|poetry|pipx)\s+(install|add|remove|uninstall|sync)\b", "パッケージのインストール・変更"),
    (r"\b(apt|apt-get|brew|choco|winget|scoop)\s+(install|remove|uninstall)\b", "パッケージのインストール・変更"),
    (r"\b(Set-Content|Out-File|Add-Content|Remove-Item|New-Item|Move-Item|Copy-Item)\b", "PowerShell のファイル書き込み・削除"),
]
# 出力先ファイルへのリダイレクト（/dev/null と fd 複製は許す）
REDIRECT = r"(?<![=<>|&-])(?:\d|&)?>>?\s*(?!&\d|&-|/dev/null\b|&\s)[^\s>]"


def strip_literals(cmd: str) -> str:
    """ヒアドキュメントの本文と引用符内の文字列を除く（コード中の `>` などの誤検出を避ける）。"""
    cmd = re.sub(r"<<-?\s*(['\"]?)(\w+)\1[^\n]*\n.*?\n\s*\2\b", "<<HEREDOC", cmd, flags=re.S)
    cmd = re.sub(r'"(?:\\.|[^"\\])*"', '""', cmd, flags=re.S)
    cmd = re.sub(r"'[^']*'", "''", cmd, flags=re.S)
    return cmd


def check(command: str, mode: str):
    rules = list(COMMON)
    if mode == "readonly":
        rules += READONLY
    text = strip_literals(command)
    hits = [reason for pattern, reason in rules if re.search(pattern, text)]
    if mode == "readonly" and re.search(REDIRECT, text):
        hits.append("リダイレクトによるファイル書き込み")
    return list(dict.fromkeys(hits))


def main(argv) -> int:
    mode = argv[argv.index("--mode") + 1] if "--mode" in argv and argv.index("--mode") + 1 < len(argv) else "nogit"
    if mode not in ("readonly", "nogit"):
        _err(f"不明な --mode です: {mode}")
        return 2
    try:
        payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
        command = payload["tool_input"]["command"]
        if not isinstance(command, str):
            raise TypeError("command が文字列ではありません")
    except Exception as e:  # 検査できないものは通さない
        _err(f"Bash コマンドを検査できないため拒否しました（{type(e).__name__}: {e}）")
        return 2

    hits = check(command, mode)
    if hits:
        who = "evaluator は読み取りと検証の実行だけが許されています" if mode == "readonly" else "サブエージェントは git の commit / push などを行えません"
        _err("Bash コマンドを拒否しました:\n" + "\n".join(f"  - {h}" for h in hits) + f"\n{who}。必要な作業はメインセッションに報告してください。")
        return 2
    return 0


def _err(message: str) -> None:
    sys.stderr.buffer.write((message + "\n").encode("utf-8"))
    sys.stderr.flush()


if __name__ == "__main__":
    sys.exit(main(sys.argv))
