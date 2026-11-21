import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import validate_docs as v  # noqa: E402

CFG = {"features": (2, 4), "contract": (5, 15), "allowed": []}


def sprint(items, features=("機能A: a", "機能B: b")):
    return (
        "## Sprint 1: テスト\n### 実装する機能\n"
        + "".join(f"- {f}\n" for f in features)
        + "### 対象外（このスプリントでやらないこと）\n- なし\n### スプリント契約（完了条件）\n"
        + "".join(f"- [ ] {i}\n" for i in items)
    )


GOOD = [f"項目{n}を入力して送信すると、一覧に表示される" for n in range(5)]


class CheckSprint(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(v.check_sprint("x", sprint(GOOD), CFG), [])

    def test_vague(self):
        errs = v.check_sprint("x", sprint(GOOD[:4] + ["UIが直感的であること、を確認する"]), CFG)
        self.assertTrue(any("曖昧" in e for e in errs))

    def test_defer(self):
        errs = v.check_sprint("x", sprint(GOOD[:4] + ["この条件は後で対応する、と記録される"]), CFG)
        self.assertTrue(any("先送り" in e for e in errs))

    def test_itsu_ka_is_not_defer(self):
        # 「いずれかの」は正当な契約文。誤検出しない
        ok = GOOD[:4] + ["いずれかの項目を選択して削除すると、一覧から消える"]
        self.assertEqual(v.check_sprint("x", sprint(ok), CFG), [])

    def test_item_count(self):
        errs = v.check_sprint("x", sprint(GOOD[:3]), CFG)
        self.assertTrue(any("契約項目が 3 個" in e for e in errs))

    def test_feature_count(self):
        errs = v.check_sprint("x", sprint(GOOD, features=("機能A: a",)), CFG)
        self.assertTrue(any("実装する機能が 1 個" in e for e in errs))

    def test_impl_detail_and_allowlist(self):
        items = GOOD[:4] + ["useState で状態を保持し、ボタン押下で値が増える"]
        self.assertTrue(any("実装詳細" in e for e in v.check_sprint("x", sprint(items), CFG)))
        self.assertEqual(v.check_sprint("x", sprint(items), {**CFG, "allowed": ["useState"]}), [])


class WarnSprint(unittest.TestCase):
    def test_warns_without_error_case(self):
        self.assertTrue(any("異常系" in w for w in v.warn_sprint("x", sprint(GOOD))))

    def test_no_warn_with_error_case(self):
        items = GOOD[:4] + ["空のタイトルで送信すると、エラーが表示され追加されない"]
        self.assertEqual(v.warn_sprint("x", sprint(items)), [])

    def test_persist_warning(self):
        items = GOOD[:4] + ["空のタイトルで送信すると、エラーが表示され追加されない"]
        warns = v.warn_sprint("x", sprint(items, features=("保存: 項目を保存する", "一覧: 表示する")))
        self.assertTrue(any("永続化" in w for w in warns))


class CheckEval(unittest.TestCase):
    def test_no_verdict(self):
        self.assertTrue(v.check_eval("x", "なにもない"))

    def test_fail_requires_return_to_in_latest_attempt(self):
        text = "VERDICT: FAIL\nRETURN_TO: generator\n---\nVERDICT: FAIL\n本文のみ\n"
        self.assertTrue(v.check_eval("x", text))

    def test_pass_after_fail(self):
        text = "VERDICT: FAIL\nRETURN_TO: generator\n---\nVERDICT: PASS\nRETURN_TO: none\n"
        self.assertEqual(v.check_eval("x", text), [])


class CheckProjectAndSpec(unittest.TestCase):
    def test_web_ui_requires_ui_eval(self):
        text = "- 種別: web-ui\n- 起動コマンド: a\n- 検証コマンド: b\n- UI評価: なし\n"
        self.assertTrue(any("web-ui" in e for e in v.check_project("x", text)))

    def test_spec_defer(self):
        text = "".join(f"## {h}\nx\n" for h in v.SPEC_HEADINGS) + "TODO: あとで\n"
        self.assertTrue(any("先送り" in e for e in v.check_spec("x", text)))


if __name__ == "__main__":
    unittest.main()
