"""Host rewrite worker tests with HTTP and the writer processes mocked."""

from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path
from unittest import mock

_BACKEND_SRC = Path(__file__).resolve().parents[1]
if str(_BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(_BACKEND_SRC))

from patchnotes import rewrite_worker as worker  # noqa: E402


_CODEX_ONLY = {"PATCHNOTES_WRITERS": "codex:gpt-6.1-sol"}
_CLAUDE = {"CLAUDE_CODE_OAUTH_TOKEN": "token", "STAFF_KEY": "staff", "PATCHNOTES_WRITERS": "claude:a,claude:b,codex:c"}
_SCHEMA = {"type": "object", "required": ["lines"]}


def _claude_reply(**fields) -> str:
    return json.dumps({"is_error": False, "result": "", **fields})


class WritersTest(unittest.TestCase):
    def _run(self, env, outcomes, review=None, week=None):
        calls = []

        def run(command, **kwargs):
            calls.append((command, kwargs))
            outcome = outcomes[len(calls) - 1]
            if isinstance(outcome, BaseException):
                raise outcome
            if isinstance(outcome, str) and "-o" in command:
                Path(command[command.index("-o") + 1]).write_text(outcome)
                return subprocess.CompletedProcess(command, 0, "", "")
            if isinstance(outcome, str):
                return subprocess.CompletedProcess(command, 0, outcome, "")
            return outcome

        with mock.patch.dict("os.environ", env, clear=True), \
                mock.patch("patchnotes.rewrite_worker.subprocess.run", side_effect=run):
            result = worker.run_job("Sort", _SCHEMA, review, week)
        return result, calls

    def test_the_writer_checks_its_own_draft(self) -> None:
        draft, fixed = ({"lines": [text]} for text in ("draft", "fixed"))
        replies = [_claude_reply(structured_output=value) for value in (draft, fixed)]
        result, calls = self._run(_CLAUDE, replies, "Check:")
        self.assertEqual(json.loads(result["output"]), fixed)
        self.assertTrue(calls[1][1]["input"].startswith("Check:"))
        self.assertIn('"draft"', calls[1][1]["input"])

    def _run_with_configs(self, outcomes, **patches):
        env = {**_CLAUDE, "PATCHNOTES_CLAUDE_USER": "tfmc-patchnotes", "PATCHNOTES_BACKUPS_DIR": "/backups"}
        identity = {"user": 1, "group": 2, "extra_groups": []}
        with mock.patch("patchnotes.rewrite_worker._claude_user", return_value=identity), \
                mock.patch("patchnotes.rewrite_worker.os.chown", create=True), \
                mock.patch("patchnotes.rewrite_worker._fill_lookup", **patches) as fill:
            result, calls = self._run(env, outcomes, "Check:", "2026-W41")
        return result, calls, fill

    def test_the_check_may_read_the_configs_as_the_restricted_account(self) -> None:
        replies = [_claude_reply(structured_output={"lines": [text]}) for text in ("draft", "fixed")]
        result, calls, fill = self._run_with_configs(replies, return_value=True)
        self.assertEqual(json.loads(result["output"]), {"lines": ["fixed"]})
        tools = [command[command.index("--tools") + 1] for command, _ in calls]
        self.assertEqual(tools, ["", "Read,Grep,Glob"])
        self.assertIn("dontAsk", calls[1][0])
        self.assertIn("you may also look things up", calls[1][1]["input"])
        self.assertNotIn("you may also look things up", calls[0][1]["input"])
        self.assertEqual([kwargs["user"] for _, kwargs in calls], [1, 1])
        self.assertEqual(["DISABLE_PROMPT_CACHING" in kwargs["env"] for _, kwargs in calls], [True, False])
        fill.assert_called_once_with(calls[1][1]["cwd"], "2026-W41")

    def test_a_failed_lookup_check_is_repeated_without_configs(self) -> None:
        replies = [_claude_reply(structured_output={"lines": ["draft"]}), subprocess.TimeoutExpired("claude", 1),
                   _claude_reply(structured_output={"lines": ["fixed"]})]
        result, calls, _ = self._run_with_configs(replies, return_value=True)
        self.assertEqual(json.loads(result["output"]), {"lines": ["fixed"]})
        self.assertEqual(calls[2][0][calls[2][0].index("--tools") + 1], "")

    def test_no_files_are_read_without_the_restricted_account(self) -> None:
        replies = [_claude_reply(structured_output={"lines": []})] * 2
        with mock.patch("patchnotes.rewrite_worker._fill_lookup", return_value=True) as fill:
            _, calls = self._run(_CLAUDE, replies, "Check:", "2026-W41")
        fill.assert_not_called()
        self.assertEqual(calls[1][0][calls[1][0].index("--tools") + 1], "")

    def test_a_missing_account_falls_through_to_codex(self) -> None:
        import types

        def missing(_name):
            raise KeyError

        env = {**_CLAUDE, "PATCHNOTES_CLAUDE_USER": "nobody-here"}
        with mock.patch.dict("sys.modules", {"pwd": types.SimpleNamespace(getpwnam=missing)}):
            result, calls = self._run(env, ['{"lines":[]}'])
        self.assertEqual(result, {"output": '{"lines":[]}'})
        self.assertEqual([call[0][0] for call in calls], ["codex"])

    def test_configs_that_cannot_be_prepared_are_skipped(self) -> None:
        with mock.patch.dict("os.environ", {}, clear=True):
            self.assertFalse(worker._fill_lookup("/tmp", "2026-W41"))
        with mock.patch.dict("os.environ", {"PATCHNOTES_BACKUPS_DIR": "/does/not/exist"}, clear=True):
            self.assertFalse(worker._fill_lookup("/tmp", "2026-W41"))

    @mock.patch("patchnotes.rewrite_worker._request")
    @mock.patch("patchnotes.rewrite_worker.run_job", return_value={"output": "{}"})
    def test_a_rewrite_after_feedback_reads_no_configs(self, run_job, request) -> None:
        for feedback, week in ((None, "2026-W41"), ("Shorter", None)):
            request.side_effect = [
                {"job": {"id": "j", "week": "2026-W41", "feedback": feedback}, "prompt": "p", "schema": {}}, {},
            ]
            worker.work_once("http://api", "key")
            self.assertEqual(run_job.call_args.args[-2:], (week, None))

    def test_claude_only_answers_the_friday_run_and_its_owner(self) -> None:
        env = {**_CLAUDE, "PATCHNOTES_CLAUDE_OWNER": "42"}
        for requester, allowed in (("weekly", True), ("42", True), ("7", False), ("", False), (None, False)):
            with self.subTest(requester), mock.patch.dict("os.environ", env, clear=True):
                self.assertEqual(worker.claude_allowed(requester), allowed)
                expected = ["claude", "claude", "codex"] if allowed else ["codex"]
                self.assertEqual([cli for cli, _ in worker.writers(requester)], expected)
        with mock.patch.dict("os.environ", _CLAUDE, clear=True):
            self.assertTrue(worker.claude_allowed("weekly"))
            self.assertFalse(worker.claude_allowed(""))
            self.assertFalse(worker.claude_allowed("42"))

    @mock.patch("patchnotes.rewrite_worker._request")
    @mock.patch("patchnotes.rewrite_worker.run_job", return_value={"output": "{}"})
    def test_the_requester_reaches_the_writers(self, run_job, request) -> None:
        request.side_effect = [{"job": {"id": "j"}, "prompt": "p", "schema": {}, "requester": "42"}, {}]
        worker.work_once("http://api", "key")
        self.assertEqual(run_job.call_args.args[-1], "42")

    def test_a_failed_check_keeps_the_draft(self) -> None:
        draft = _claude_reply(structured_output={"lines": ["draft"]})
        for failure in (subprocess.TimeoutExpired("claude", 1), _claude_reply(is_error=True), RuntimeError("boom")):
            with self.subTest(str(failure)):
                result, calls = self._run(_CLAUDE, [draft, failure], "Check:")
                self.assertEqual(json.loads(result["output"]), {"lines": ["draft"]})
                self.assertEqual(len(calls), 2)

    @mock.patch("patchnotes.rewrite_worker.time.monotonic", side_effect=[0, 0, 0, 800])
    def test_no_check_without_enough_time(self, _clock) -> None:
        _, calls = self._run(_CLAUDE, [_claude_reply(structured_output={"lines": []})], "Check:")
        self.assertEqual(len(calls), 1)

    def test_claude_writes_without_tools_or_other_secrets(self) -> None:
        result, calls = self._run(_CLAUDE, [_claude_reply(structured_output={"lines": ["é"]})])
        self.assertEqual(json.loads(result["output"]), {"lines": ["é"]})
        command, kwargs = calls[0]
        self.assertEqual(command[command.index("--tools") + 1], "")
        self.assertEqual(command[command.index("--setting-sources") + 1], "")
        self.assertEqual(kwargs["input"], "Sort")
        self.assertEqual(kwargs["env"]["CLAUDE_CODE_OAUTH_TOKEN"], "token")
        self.assertNotIn("STAFF_KEY", kwargs["env"])
        self.assertEqual(kwargs["env"]["HOME"], kwargs["cwd"])

    def test_an_api_key_works_when_there_is_no_token(self) -> None:
        env = {"PATCHNOTES_ANTHROPIC_API_KEY": "key", "PATCHNOTES_WRITERS": "claude:a"}
        _, calls = self._run(env, [_claude_reply(result='{"lines":[]}')])
        self.assertEqual(calls[0][1]["env"]["ANTHROPIC_API_KEY"], "key")
        self.assertNotIn("CLAUDE_CODE_OAUTH_TOKEN", calls[0][1]["env"])

    def test_each_failure_falls_through_to_the_next_writer(self) -> None:
        failures = {
            "usage limit": subprocess.CompletedProcess([], 1, _claude_reply(is_error=True, result="usage limit"), ""),
            "signed out": subprocess.CompletedProcess([], 1, "", "Please run /login"),
            "error reply": _claude_reply(is_error=True),
            "wrong shape": _claude_reply(result="Sure, here is the post."),
            "missing key": _claude_reply(structured_output={"other": 1}),
            "timeout": subprocess.TimeoutExpired("claude", 1),
            "not installed": FileNotFoundError("claude"),
            "unexpected": RuntimeError("boom"),
        }
        for name, failure in failures.items():
            with self.subTest(name):
                result, calls = self._run(_CLAUDE, [failure, failure, '{"lines":[]}'])
                self.assertEqual(result, {"output": '{"lines":[]}'})
                self.assertEqual([call[0][0] for call in calls], ["claude", "claude", "codex"])
                self.assertNotIn("CLAUDE_CODE_OAUTH_TOKEN", calls[2][1]["env"])
                self.assertNotIn("STAFF_KEY", calls[2][1]["env"])

    def test_without_a_claude_login_codex_runs_first(self) -> None:
        result, calls = self._run({}, ['{"lines":[]}'])
        self.assertEqual(result, {"output": '{"lines":[]}'})
        self.assertEqual([call[0][0] for call in calls], ["codex"])

    def test_all_writers_out_of_usage_says_so(self) -> None:
        limited = subprocess.CompletedProcess([], 1, "", "You've hit your usage limit.")
        result, calls = self._run(_CLAUDE, [limited, limited, limited])
        self.assertEqual(result, {"error": "The rewrite agent hit its usage limit."})
        self.assertEqual(len(calls), 3)

    def test_the_default_order(self) -> None:
        with mock.patch.dict("os.environ", {}, clear=True):
            self.assertEqual(worker.writers(), [
                ("claude", "claude-opus-5-5"), ("claude", "claude-sonnet-5-5"), ("codex", "gpt-6.1-sol"),
            ])

    def test_unknown_writers_are_ignored(self) -> None:
        with mock.patch.dict("os.environ", {"PATCHNOTES_WRITERS": "grok:x, codex:y ,claude,"}, clear=True):
            self.assertEqual(worker.writers(), [("codex", "y")])

    @mock.patch("patchnotes.rewrite_worker.time.monotonic", side_effect=[0, 0, 0, 670, 680, 680])
    def test_slow_writers_leave_time_for_the_last_one(self, _clock) -> None:
        result, calls = self._run(_CLAUDE, [subprocess.TimeoutExpired("claude", 390), '{"lines":[]}'])
        self.assertEqual(result, {"output": '{"lines":[]}'})
        self.assertEqual([(call[0][0], call[1]["timeout"]) for call in calls], [("claude", 390.0), ("codex", 160.0)])


class RewriteWorkerTest(unittest.TestCase):
    def setUp(self) -> None:
        patcher = mock.patch.dict("os.environ", _CODEX_ONLY)
        patcher.start()
        self.addCleanup(patcher.stop)

    @mock.patch.dict("os.environ", _CODEX_ONLY, clear=True)
    @mock.patch("patchnotes.rewrite_worker.subprocess.run")
    @mock.patch("patchnotes.rewrite_worker.urllib.request.urlopen")
    def test_success_claims_runs_and_posts_output(self, urlopen, run) -> None:
        job = {"id": "job-1"}
        claimed = {"job": job, "prompt": "Answer from the message.", "schema": {"type": "object"}}
        urlopen.return_value.__enter__.return_value.read.side_effect = [
            json.dumps(claimed).encode(), b'{"job":{"status":"done"}}',
        ]
        directories = []

        def complete(command, **kwargs):
            directory = Path(command[command.index("-C") + 1])
            directories.append(directory)
            self.assertEqual(json.loads((directory / "schema.json").read_text()), claimed["schema"])
            self.assertEqual(kwargs["input"], claimed["prompt"])
            self.assertEqual(kwargs["timeout"], 390)
            self.assertIn("gpt-6.1-sol", command)
            self.assertIn("model_reasoning_effort=low", command)
            self.assertIn("read-only", command)
            self.assertIn("--ephemeral", command)
            self.assertEqual(command[-1], "-")
            (directory / "out.json").write_text('{"lines":[]}')
            return subprocess.CompletedProcess(command, 0, "", "")

        run.side_effect = complete
        self.assertTrue(worker.work_once("http://api", "staff-key"))
        requests = [call.args[0] for call in urlopen.call_args_list]
        self.assertEqual(requests[0].full_url, "http://api/patchnotes/staff/jobs/claim")
        self.assertEqual(requests[0].get_header("X-staff-key"), "staff-key")
        self.assertEqual(requests[1].full_url, "http://api/patchnotes/staff/jobs/job-1/result")
        self.assertEqual(json.loads(requests[1].data), {"output": '{"lines":[]}'})
        self.assertFalse(directories[0].exists())

    @mock.patch("patchnotes.rewrite_worker._request")
    @mock.patch("patchnotes.rewrite_worker.subprocess.run")
    def test_usage_limit_posts_friendly_error(self, run, request) -> None:
        request.side_effect = [{"job": {"id": "j"}, "prompt": "Sort", "schema": {}}, {}]
        run.return_value = subprocess.CompletedProcess([], 1, "", "You've hit your usage limit.")
        worker.work_once("http://api", "key")
        self.assertEqual(request.call_args.args[-1], {"error": "The rewrite agent hit its usage limit."})

    @mock.patch("patchnotes.rewrite_worker._request")
    @mock.patch("patchnotes.rewrite_worker.subprocess.run")
    def test_timeout_posts_error(self, run, request) -> None:
        request.side_effect = [{"job": {"id": "j"}, "prompt": "Sort", "schema": {}}, {}]
        run.side_effect = subprocess.TimeoutExpired("codex", 420)
        worker.work_once("http://api", "key")
        self.assertEqual(request.call_args.args[-1], {"error": "The rewrite agent failed."})

    @mock.patch("patchnotes.rewrite_worker.subprocess.run")
    def test_empty_output_and_nonzero_exit_fail(self, run) -> None:
        for code in (0, 1):
            run.return_value = subprocess.CompletedProcess([], code, "", "")
            self.assertEqual(worker.run_job("Sort", {}), {"error": "The rewrite agent failed."})

    @mock.patch("patchnotes.rewrite_worker._request", return_value={"job": None})
    @mock.patch("patchnotes.rewrite_worker.subprocess.run")
    def test_empty_queue_does_not_run_cli(self, run, _request) -> None:
        self.assertFalse(worker.work_once("http://api", "key"))
        run.assert_not_called()

    @mock.patch.dict("os.environ", {"STAFF_KEY": "key"}, clear=True)
    @mock.patch("patchnotes.rewrite_worker.work_once", side_effect=RuntimeError("network error"))
    def test_once_does_not_crash_on_a_bad_job(self, _once) -> None:
        self.assertEqual(worker.main(["--once"]), 0)

    @mock.patch.dict("os.environ", {"STAFF_KEY": "key", "PATCHNOTES_WORKER_POLL": "0"}, clear=True)
    @mock.patch("patchnotes.rewrite_worker.time.sleep")
    @mock.patch("patchnotes.rewrite_worker.work_once")
    def test_loop_continues_after_failure(self, once, sleep) -> None:
        once.side_effect = [RuntimeError("bad job"), False]
        sleep.side_effect = [None, KeyboardInterrupt]
        with self.assertRaises(KeyboardInterrupt):
            worker.main([])
        self.assertEqual(once.call_count, 2)

    @mock.patch.dict("os.environ", {}, clear=True)
    def test_staff_key_is_required(self) -> None:
        with self.assertRaises(SystemExit):
            worker.main(["--once"])

    def test_host_import_needs_only_standard_library(self) -> None:
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run([
            sys.executable, "-S", "-c",
            "import sys; sys.path.insert(0, sys.argv[1]); import patchnotes.rewrite_worker",
            str(root),
        ], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
