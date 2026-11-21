# 汎用マルチエージェント・ハーネス

短い依頼から、仕様書 → スプリント契約 → 実装 → デザイン → 実操作による評価までを、4 つのサブエージェントで回すための一式。
プロジェクトの種類（web-ui / api / cli / library）を問わず使える。

## 中身

```
（リポジトリのルート）
├── CLAUDE.md                 オーケストレーションのルール（ルートに置く）
├── .mcp.json                 Playwright / Context7 / Serena
├── .serena/project.yml       Serena の設定（language_servers は技術スタックに合わせる）
├── .claude/
│   ├── agents/               planner / generator / designer / evaluator
│   ├── commands/             /init-project /kickoff /sprint /status /replan
│   └── settings.json         権限（.env 保護、force push 禁止など）とフック
├── scripts/
│   ├── validate_docs.py      ドキュメントの機械検証
│   ├── guard_subagent_bash.py  サブエージェントの Bash 検査（エージェントの hooks から呼ぶ）
│   └── block_serena_secrets.py serena_repl の機密情報検査（PreToolUse）
├── tests/                    上記スクリプトのテスト（python3 -m unittest discover -s tests）
├── .github/workflows/        CI（validate-docs.yml）
└── docs/
    ├── project.md            プロジェクト設定のテンプレート
    └── design/tokens.md      デザイントークンのテンプレート
```

## 導入手順

1. このリポジトリの中身（`.git` を除く）を、対象プロジェクトのルートへコピーする。
   ```
   rsync -a --exclude .git ./ /path/to/your-project/
   ```
   既に `CLAUDE.md` / `.mcp.json` / `.claude/settings.json` がある場合は、上書きせず内容を統合する。
2. 前提を確認する: Python 3、Node.js（`npx`）、Serena 用に `uv`（`uvx`）と git。Windows では、`python` / `python3` が Microsoft Store のスタブ（実体なし）になっていることがある。`python3 -c "print(1)"` で実際に動くか確認し、動かなければ Python をインストールする（動かないとフックと CI の検証が働かない。フックは警告を出すだけで止まらない）。
3. Claude Code を起動し、環境変数 `CONTEXT7_API_KEY` を設定してから起動する（Context7 の API キー。`.mcp.json` は `${CONTEXT7_API_KEY}` で参照するだけで、値は書かない。設定後 `/mcp` で接続を確認する）。Playwright と Serena は初回の有効化を承認する。`.serena/project.yml` の `project_name` と `language_servers` を対象プロジェクトに合わせる。
4. `/init-project` を実行して `docs/project.md` を作る。
5. web-ui なら `docs/design/tokens.md` を埋める（またはデザイン資料を提供する）。
6. `/kickoff <作りたいもの>` → 承認 → `/sprint 1` → `/sprint 2` …

## 設計の要点

- **オーケストレーターはメインセッション。** サブエージェントは会話履歴を持たないため、契約ファイルのパス・前段の報告・スプリント番号を毎回渡す。
- **生成と評価を分ける。** 実装者は自己採点せず、`evaluator` が実際に動かして判定する。判定は `VERDICT: PASS|FAIL` / `RETURN_TO:` で機械的に読める。
- **契約は検証可能に。** `scripts/validate_docs.py` が、曖昧な表現・実装詳細・先送りを含む契約、機能数・項目数の逸脱を、書いた瞬間にフックで差し戻す。
- **種別に応じて工程が変わる。** `UI評価: なし`（api / cli / library）では `designer` とデザイン採点を省略し、`evaluator` は curl・CLI 実行・検証コードで確かめる。
- **品質ゲート。** evaluator の前に、静的検査・テスト・ビルドをメインセッションが実行する。
- **回帰確認。** evaluator は前スプリントの主要項目も再テストする。
- **差し戻しは最大 3 回。** 超えたらユーザーに判断を仰ぐ。

## カスタマイズ

| 目的 | 場所 |
|---|---|
| モデルの変更 | `.claude/agents/*.md` の `model:`（既定: planner / evaluator = opus、generator / designer = sonnet） |
| 機能数・契約項目数の閾値 | `docs/project.md` の「ハーネス設定」 |
| 契約に書いてよい実装寄りの語 | `docs/project.md` の「契約で許可する語」 |
| プロダクト固有の評価の例外 | `docs/project.md` の「評価上の注意」 |
| デザインの採点閾値 | `.claude/agents/evaluator.md` の表 |
| 禁止・確認するコマンド | `.claude/settings.json` の `permissions` |
| MCP の追加（DB・決済など） | `.mcp.json`、担当エージェントの `tools` / `mcpServers`、`CLAUDE.md` の役割表 |

## 注意

- `evaluator` は `Bash` を持つ（api / cli / library の検証に必要）。書き込みの禁止は、エージェント定義の規律に加えて、frontmatter の `hooks`（`scripts/guard_subagent_bash.py --mode readonly`）で、リダイレクト・`rm` / `mv`・`git add` / `commit`・パッケージのインストールなどを拒否している。generator / designer は `--mode nogit` で git の commit / push などを拒否する。いずれも「うっかり」を防ぐ対策であり、文字列の組み立てなどによる意図的な迂回までは防げない。
- 書き込み権限を持つ MCP（DB・決済）を追加するときは、開発用・テスト用の接続先に限定し、認証情報はシェルの環境変数か OAuth にして、ファイルに書かない。
- `scripts/validate_docs.py` の検証対象は `docs/` 配下の決まった名前のファイルだけ。
- 秘密情報（`.env`、鍵、トークン）はリポジトリに置かない。`settings.json` の deny と Serena の `ignored_paths`・フックはあくまで防御の層であり、根本対策は「置かない」こと。
- Windows で `npx` の MCP が起動しない場合は、`.mcp.json` の playwright を `"command": "cmd", "args": ["/c", "npx", "@playwright/mcp@0.0.84"]` に変える。

## バージョンと更新

- このハーネスはコピーして使うため、配布元の更新は自動では届かない。配布元をテンプレートリポジトリ（GitHub の「Use this template」）にしておくと、新規プロジェクトの作成が簡単になる。
- 既存プロジェクトへ更新を取り込むときは、配布元を別名のリモートとして追加し、差分を確認してから取り込む（`CLAUDE.md` の「プロジェクト固有のルール」と `docs/project.md`、`.serena/project.yml`、`docs/design/` は上書きしない）。
  ```
  git remote add harness <配布元のURL>
  git fetch harness
  git diff HEAD harness/main -- .claude scripts tests CLAUDE.md README.md .github
  git checkout harness/main -- .claude scripts tests .github   # 取り込む範囲を選ぶ
  ```
- プラグイン化（agents / commands / hooks を同梱して配布する）は、複数プロジェクトで頻繁に更新する段階になってから検討する。現状は未対応。
