"""Route tests for the weekly Discord post (database fully mocked)."""

from __future__ import annotations

import json
import os
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_BACKEND_SRC = _BACKEND_ROOT / "src"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))
if str(_BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(_BACKEND_SRC))

os.environ.setdefault("SKINS_DEV", "1")

from fastapi.testclient import TestClient  # noqa: E402

from server import app  # noqa: E402
from src.api import patchnotes_routes as routes  # noqa: E402
from src.patchnotes.db import JobActive, PatchnotesDBError  # noqa: E402

_HEADERS = {"X-Staff-Key": "dev-staff-key"}
_ROUTES = "src.api.patchnotes_routes"
_FACTS = {
    "files": [
        {
            "path": "MMOCore/classes/juggernaut.yml",
            "plugin": "MMOCore",
            "kind": "changed",
            "entries": [{"name": "Juggernaut", "kind": "changed", "details": ["max_health.base: 30 --> 28"]}],
        }
    ],
    "plugins": [],
    "hidden": {},
}
_UPDATED = datetime(2026, 10, 9, 10, 5, tzinfo=timezone.utc)


def _job(**overrides):
    row = {
        "id": "22222222-2222-2222-2222-222222222222",
        "week": "2026-W41",
        "kind": "compose",
        "feedback": None,
        "status": "queued",
        "error": None,
        "changed": None,
        "created_at": _UPDATED,
        "finished_at": None,
    }
    row.update(overrides)
    return row


def _post(**overrides):
    row = {
        "week": "2026-W41",
        "messages": ["# Update 5.3\nHello"],
        "source": "writer",
        "status": "draft",
        "updated_at": _UPDATED,
    }
    row.update(overrides)
    return row


class PostRoutesTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        for name, value in (("migrate", None), ("patch_label", "5.3"), ("get_act", None), ("recent_posts", []), ("list_player_notes", [])):
            patcher = mock.patch(f"{_ROUTES}.{name}", return_value=value)
            self.addCleanup(patcher.stop)
            patcher.start()

    def tearDown(self) -> None:
        self.client.close()

    def test_routes_require_staff(self) -> None:
        self.assertEqual(self.client.get("/patchnotes/staff/weeks/2026-W41/post").status_code, 401)
        self.assertEqual(
            self.client.post("/patchnotes/staff/weeks/2026-W41/facts", json={"facts": {}}).status_code, 401
        )
        self.assertEqual(self.client.put("/patchnotes/staff/weeks/2026-W41/meta", json={}).status_code, 401)

    def test_player_notes_can_be_added_listed_and_removed(self) -> None:
        note = {"id": 4, "week": "2026-W41", "body": "Horses are faster.", "author": "staff", "created_at": _UPDATED}
        with mock.patch(f"{_ROUTES}.add_player_note", return_value=note) as add:
            response = self.client.post(
                "/patchnotes/staff/player-notes", json={"body": "Horses are faster.", "author": "staff"}, headers=_HEADERS
            )
        self.assertEqual((response.status_code, response.json()["note"]["id"]), (201, 4))
        add.assert_called_once_with("Horses are faster.", author="staff", week=None)
        with mock.patch(f"{_ROUTES}.list_player_notes", return_value=[note]) as listing:
            response = self.client.get("/patchnotes/staff/player-notes?week=2026-W41", headers=_HEADERS)
        self.assertEqual(response.json()["notes"][0]["body"], "Horses are faster.")
        listing.assert_called_once_with("2026-W41")
        with mock.patch(f"{_ROUTES}.remove_player_note", side_effect=[True, False]):
            self.assertEqual(
                [self.client.delete("/patchnotes/staff/player-notes/4", headers=_HEADERS).status_code for _ in "ab"],
                [200, 404],
            )
        self.assertEqual(self.client.post("/patchnotes/staff/player-notes", json={"body": "x"}).status_code, 401)
        self.assertEqual(self.client.get("/patchnotes/staff/player-notes").status_code, 401)
        self.assertEqual(self.client.delete("/patchnotes/staff/player-notes/4").status_code, 401)

    def test_the_writer_gets_the_notes_and_a_check(self) -> None:
        job = _job()
        with mock.patch(f"{_ROUTES}.claim_job", return_value=job), mock.patch(
            f"{_ROUTES}.get_facts", return_value={"facts": _FACTS}
        ), mock.patch(f"{_ROUTES}.list_player_notes", return_value=[{"body": "Horses are faster."}]):
            data = self.client.post("/patchnotes/staff/jobs/claim", headers=_HEADERS).json()
        self.assertIn("- Horses are faster.", data["prompt"])
        self.assertTrue(data["review"].startswith(data["prompt"]))
        self.assertTrue(data["improve"].startswith(data["prompt"]))
        self.assertFalse(data["may_wait"])

    def test_facts_are_stored_and_start_the_writer(self) -> None:
        with mock.patch(f"{_ROUTES}.save_facts") as save, mock.patch(
            f"{_ROUTES}.create_job", return_value=_job()
        ) as create:
            response = self.client.post(
                "/patchnotes/staff/weeks/2026-W41/facts", json={"facts": _FACTS}, headers=_HEADERS
            )
        self.assertEqual(response.status_code, 200)
        save.assert_called_once_with("2026-W41", _FACTS)
        create.assert_called_once_with("2026-W41", "compose", requester="weekly")
        self.assertEqual(response.json()["job"]["kind"], "compose")

    def test_facts_while_the_writer_runs_only_replace_the_facts(self) -> None:
        with mock.patch(f"{_ROUTES}.save_facts"), mock.patch(
            f"{_ROUTES}.create_job", side_effect=JobActive("2026-W41")
        ):
            response = self.client.post(
                "/patchnotes/staff/weeks/2026-W41/facts", json={"facts": _FACTS}, headers=_HEADERS
            )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["job"])

    def test_missing_facts_are_404(self) -> None:
        with mock.patch(f"{_ROUTES}.get_facts", return_value=None):
            response = self.client.get("/patchnotes/staff/weeks/2026-W41/facts", headers=_HEADERS)
        self.assertEqual(response.status_code, 404)

    def test_post_while_the_first_version_is_written(self) -> None:
        with mock.patch(f"{_ROUTES}.get_post", return_value=None), mock.patch(
            f"{_ROUTES}.latest_job", return_value=_job(status="running")
        ) as latest:
            response = self.client.get("/patchnotes/staff/weeks/2026-W41/post", headers=_HEADERS)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "composing")
        self.assertEqual(body["messages"], [])
        self.assertEqual(body["label"], "5.3")
        self.assertEqual(latest.call_args.args[1], ("compose",))

    def test_post_falls_back_to_the_facts_when_the_writer_failed(self) -> None:
        with mock.patch(f"{_ROUTES}.get_post", return_value=None), mock.patch(
            f"{_ROUTES}.latest_job", return_value=_job(status="failed", error="usage limit")
        ), mock.patch(f"{_ROUTES}.get_facts", return_value={"facts": _FACTS}), mock.patch(
            f"{_ROUTES}.save_post", side_effect=lambda week, messages, source: _post(messages=messages, source=source)
        ):
            response = self.client.get("/patchnotes/staff/weeks/2026-W41/post", headers=_HEADERS)
        body = response.json()
        self.assertEqual(body["source"], "fallback")
        self.assertTrue(body["messages"][0].startswith("# Update 5.3"))
        self.assertEqual(body["job"]["error"], "usage limit")

    def test_post_without_facts_is_404(self) -> None:
        with mock.patch(f"{_ROUTES}.get_post", return_value=None), mock.patch(
            f"{_ROUTES}.latest_job", return_value=None
        ), mock.patch(f"{_ROUTES}.get_facts", return_value=None):
            response = self.client.get("/patchnotes/staff/weeks/2026-W41/post", headers=_HEADERS)
        self.assertEqual(response.status_code, 404)

    def test_feedback_needs_a_post_and_a_free_writer(self) -> None:
        url = "/patchnotes/staff/weeks/2026-W41/post/feedback"
        with mock.patch(f"{_ROUTES}.get_post", return_value=None):
            self.assertEqual(self.client.post(url, json={"feedback": "Shorter"}, headers=_HEADERS).status_code, 409)
        with mock.patch(f"{_ROUTES}.get_post", return_value=_post()), mock.patch(
            f"{_ROUTES}.create_job", side_effect=JobActive("2026-W41")
        ):
            self.assertEqual(self.client.post(url, json={"feedback": "Shorter"}, headers=_HEADERS).status_code, 409)
        with mock.patch(f"{_ROUTES}.get_post", return_value=_post()), mock.patch(
            f"{_ROUTES}.create_job", return_value=_job(feedback="Shorter")
        ) as create:
            response = self.client.post(url, json={"feedback": "Shorter"}, headers=_HEADERS)
        self.assertEqual(response.status_code, 202)
        create.assert_called_once_with("2026-W41", "compose", "Shorter", requester=None)

    def test_jobs_carry_who_asked(self) -> None:
        base = "/patchnotes/staff/weeks/2026-W41/post"
        with mock.patch(f"{_ROUTES}.get_post", return_value=_post()), mock.patch(
            f"{_ROUTES}.get_facts", return_value={"facts": _FACTS}
        ), mock.patch(f"{_ROUTES}.create_job", return_value=_job()) as create:
            self.client.post(f"{base}/feedback", json={"feedback": "Shorter", "requester_id": "42"}, headers=_HEADERS)
            create.assert_called_with("2026-W41", "compose", "Shorter", requester="42")
            self.client.post(f"{base}/compose", json={"requester_id": "42"}, headers=_HEADERS)
            create.assert_called_with("2026-W41", "compose", None, requester="42")
            # Asking for a rewrite by hand never counts as the Friday run.
            self.client.post(f"{base}/compose", json={"automatic": True}, headers=_HEADERS)
            create.assert_called_with("2026-W41", "compose", None, requester=None)
            self.client.post(f"{base}/compose", headers=_HEADERS)
            create.assert_called_with("2026-W41", "compose", None, requester=None)
            for bad in ("weekly", "", "4 2"):
                response = self.client.post(
                    f"{base}/feedback", json={"feedback": "x", "requester_id": bad}, headers=_HEADERS
                )
                self.assertEqual(response.status_code, 422)
        with mock.patch(f"{_ROUTES}.claim_job", return_value=_job(requester="42")), mock.patch(
            f"{_ROUTES}.get_facts", return_value={"facts": _FACTS}
        ):
            claimed = self.client.post("/patchnotes/staff/jobs/claim", headers=_HEADERS).json()
        self.assertEqual(claimed["requester"], "42")

    def test_approve_and_act(self) -> None:
        with mock.patch(f"{_ROUTES}.approve_post", return_value=True):
            response = self.client.post("/patchnotes/staff/weeks/2026-W41/post/approve", headers=_HEADERS)
        self.assertEqual(response.json(), {"week": "2026-W41", "approved": True})
        with mock.patch(f"{_ROUTES}.set_act") as set_act:
            response = self.client.put(
                "/patchnotes/staff/weeks/2026-W41/meta", json={"act": "Act 1"}, headers=_HEADERS
            )
        self.assertEqual(response.status_code, 200)
        set_act.assert_called_once_with("2026-W41", "Act 1")

    def test_claim_gives_the_writer_the_facts(self) -> None:
        with mock.patch(f"{_ROUTES}.claim_job", return_value=_job(status="running")), mock.patch(
            f"{_ROUTES}.get_facts", return_value={"facts": _FACTS}
        ):
            response = self.client.post("/patchnotes/staff/jobs/claim", headers=_HEADERS)
        body = response.json()
        self.assertIn("Start with `# Update 5.3`.", body["prompt"])
        self.assertIn("Juggernaut (changed): max_health.base: 30 --> 28", body["prompt"])
        self.assertEqual(body["schema"]["required"], ["messages"])

    def test_writer_result_is_stored_as_a_draft(self) -> None:
        output = json.dumps({"messages": ["# Update 5.3\nHi @here", "# 🔧 Fixes\n- Fixed knockouts"]})
        with mock.patch(f"{_ROUTES}.get_job", return_value=_job(status="running")), mock.patch(
            f"{_ROUTES}.save_post"
        ) as save, mock.patch(f"{_ROUTES}.finish_job", return_value=_job(status="done", changed=2)) as finish:
            response = self.client.post(
                "/patchnotes/staff/jobs/22222222-2222-2222-2222-222222222222/result",
                json={"output": output},
                headers=_HEADERS,
            )
        self.assertEqual(response.status_code, 200)
        # Short messages are joined, and an older worker does not say who wrote it.
        save.assert_called_once_with("2026-W41", ["# Update 5.3\nHi\n\n# Fixes\n- Fixed knockouts"], "writer", None)
        finish.assert_called_once_with("22222222-2222-2222-2222-222222222222", changed=1)

    def test_staff_learn_who_wrote_it_and_which_numbers_to_check(self) -> None:
        messages = ["# Update 5.3", "- Bash 9 --> 7 s"]
        body = {"output": json.dumps({"messages": messages}), "writer": "claude:claude-opus-5-5", "checks": 2,
                "unconfirmed": [["- Bash 9 --> 7 s \u2694\ufe0f", "9 --> 7"], ["- Removed 2 --> 1 s", "2 --> 1"]]}
        report = {"writer": "claude:claude-opus-5-5", "checks": 2, "unconfirmed": [["- Bash 9 --> 7 s", "9 --> 7"]]}
        url = "/patchnotes/staff/jobs/22222222-2222-2222-2222-222222222222/result"
        # A rewrite after feedback keeps the messages as staff asked for them.
        for feedback, stored in ((None, ["# Update 5.3\n\n- Bash 9 --> 7 s"]), ("Split it", messages)):
            with mock.patch(f"{_ROUTES}.get_job", return_value=_job(status="running", feedback=feedback)), mock.patch(
                f"{_ROUTES}.save_post"
            ) as save, mock.patch(f"{_ROUTES}.finish_job", return_value=_job(status="done")):
                self.assertEqual(self.client.post(url, json=body, headers=_HEADERS).status_code, 200)
            save.assert_called_once_with("2026-W41", stored, "writer", report)
        with mock.patch(f"{_ROUTES}.get_post", return_value=_post(report=report, has_previous=True)), mock.patch(
            f"{_ROUTES}.latest_job", return_value=_job(status="done")
        ):
            post = self.client.get("/patchnotes/staff/weeks/2026-W41/post", headers=_HEADERS).json()
        self.assertEqual((post["report"], post["has_previous"], post["job"]["retry_at"]), (report, True, None))

    def test_a_friday_run_out_of_usage_is_tried_again_while_there_is_time(self) -> None:
        url = "/patchnotes/staff/jobs/22222222-2222-2222-2222-222222222222/result"
        early = datetime(2026, 10, 9, 10, 10, tzinfo=timezone.utc)  # 12:10 in Berlin
        late = datetime(2026, 10, 9, 12, 20, tzinfo=timezone.utc)
        weekly = _job(status="running", requester="weekly")
        self.assertEqual(routes._retry_at(weekly, early), datetime(2026, 10, 9, 11, 10, tzinfo=timezone.utc))
        self.assertIsNone(routes._retry_at(weekly, late))
        self.assertIsNone(routes._retry_at(_job(requester="42"), early))
        self.assertIsNone(routes._retry_at(_job(requester="weekly", kind="sort"), early))
        for job, moment, requeued in ((weekly, early, True), (weekly, None, True), (_job(status="running"), None, False)):
            with mock.patch(f"{_ROUTES}.get_job", return_value=job), mock.patch(
                f"{_ROUTES}._retry_at", return_value=moment
            ), mock.patch(f"{_ROUTES}.requeue_job", return_value=_job(not_before=early)) as requeue, mock.patch(
                f"{_ROUTES}.finish_job", return_value=_job(status="failed")
            ) as finish, mock.patch(f"{_ROUTES}.get_post", return_value=_post()):
                body = self.client.post(url, json={"retry": True}, headers=_HEADERS).json()
            self.assertEqual((requeue.called, finish.called), (requeued, not requeued))
            self.assertEqual(body["job"]["retry_at"] is not None, requeued)
            if requeued:
                self.assertLessEqual(requeue.call_args.args[1], moment or datetime.now(timezone.utc))

    def test_the_replaced_version_can_be_put_back(self) -> None:
        url = "/patchnotes/staff/weeks/2026-W41/post/restore"
        self.assertEqual(self.client.post(url).status_code, 401)
        for job, post, status in (
            (_job(status="running"), _post(), 409), (None, None, 404), (_job(status="done"), _post(), 200),
        ):
            with mock.patch(f"{_ROUTES}.latest_job", return_value=job), mock.patch(
                f"{_ROUTES}.restore_post", return_value=post
            ):
                response = self.client.post(url, headers=_HEADERS)
            self.assertEqual(response.status_code, status)
        self.assertEqual(response.json()["messages"], ["# Update 5.3\nHello"])
        with mock.patch(f"{_ROUTES}.latest_job", side_effect=PatchnotesDBError("down")):
            self.assertEqual(self.client.post(url, headers=_HEADERS).status_code, 502)

    def test_writer_failure_keeps_a_plain_post(self) -> None:
        with mock.patch(f"{_ROUTES}.get_job", return_value=_job(status="running")), mock.patch(
            f"{_ROUTES}.get_post", return_value=None
        ), mock.patch(f"{_ROUTES}.get_facts", return_value={"facts": _FACTS}), mock.patch(
            f"{_ROUTES}.save_post"
        ) as save, mock.patch(f"{_ROUTES}.finish_job", return_value=_job(status="failed")) as finish:
            self.client.post(
                "/patchnotes/staff/jobs/22222222-2222-2222-2222-222222222222/result",
                json={"error": "The rewrite agent hit its usage limit."},
                headers=_HEADERS,
            )
        finish.assert_called_once_with(
            "22222222-2222-2222-2222-222222222222", error="The rewrite agent hit its usage limit."
        )
        self.assertEqual(save.call_args.args[2], "fallback")


if __name__ == "__main__":
    unittest.main()
