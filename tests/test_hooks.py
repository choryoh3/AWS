import json
import re
import subprocess
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS))
import block_serena_secrets as bss  # noqa: E402
import guard_subagent_bash as gsb  # noqa: E402


def serena_hits(code):
    return [r for p, r in bss.RULES if re.search(p, code, re.IGNORECASE)]


class SerenaGuard(unittest.TestCase):
    def test_blocks(self):
        for code in [
            'open(".env")',
            'x = "config/.env"',
            's.fs.read("prod.env")',
            'p = "certs/server.pem"',
            'p = "~/.ssh/id_rsa"',
            "import os",
            "__import__('os')",
        ]:
            self.assertTrue(serena_hits(code), code)

    def test_allows(self):
        for code in [
            "x = self.env",
            "name = item.key",
            's.lsp.find_symbol("Foo")',
            's.fs.read("README.md")',
            'p = "docs/.env.example"',
        ]:
            self.assertEqual(serena_hits(code), [], code)

    def run_script(self, payload):
        return subprocess.run(
            [sys.executable, "-I", str(SCRIPTS / "block_serena_secrets.py")],
            input=json.dumps(payload).encode(), capture_output=True,
        ).returncode

    def test_exit_codes(self):
        self.assertEqual(self.run_script({"tool_input": {"code": 's.lsp.find_symbol("A")'}}), 0)
        self.assertEqual(self.run_script({"tool_input": {"code": 'open(".env")'}}), 2)
        self.assertEqual(self.run_script({"tool_input": {}}), 2)  # 検査できなければ拒否


class SubagentBashGuard(unittest.TestCase):
    def test_nogit_blocks_history_changes(self):
        for cmd in ["git commit -m x", "git push origin main", "git -C . reset --hard", "git checkout -- a.py"]:
            self.assertTrue(gsb.check(cmd, "nogit"), cmd)

    def test_nogit_allows_normal_work(self):
        for cmd in ["git status", "git diff --stat", "npm test", "echo hi > out.txt", "rm tmp.txt"]:
            self.assertEqual(gsb.check(cmd, "nogit"), [], cmd)

    def test_readonly_blocks_writes(self):
        for cmd in [
            "echo x > a.txt", "echo x >> a.txt", "cat a | tee b", "rm -rf build", "mv a b",
            "sed -i s/a/b/ f", "npm install left-pad", "git add .", "git commit -m x",
            "Set-Content a.txt hi",
        ]:
            self.assertTrue(gsb.check(cmd, "readonly"), cmd)

    def test_readonly_allows_verification(self):
        for cmd in [
            "npm test", "curl -s http://localhost:3000/items/999", "git status", "git diff --stat",
            "node app.js 2>&1", "pytest -q 2>/dev/null", "ls -la", "cat docs/project.md",
            'curl -s -H "X: a>b" http://localhost/',
            "python - <<'EOF'\nimport m\nprint(m.f(3) > 2)\nEOF",
        ]:
            self.assertEqual(gsb.check(cmd, "readonly"), [], cmd)

    def test_exit_codes(self):
        def run(payload, mode="readonly"):
            return subprocess.run(
                [sys.executable, "-I", str(SCRIPTS / "guard_subagent_bash.py"), "--mode", mode],
                input=json.dumps(payload).encode(), capture_output=True,
            ).returncode
        self.assertEqual(run({"tool_input": {"command": "npm test"}}), 0)
        self.assertEqual(run({"tool_input": {"command": "rm -rf x"}}), 2)
        self.assertEqual(run({"tool_input": {}}), 2)


if __name__ == "__main__":
    unittest.main()
