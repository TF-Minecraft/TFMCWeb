"""Cancel post on the weekly review, driven with fakes for Config, the API and the channel.

Needs discord.py and Red (discord/requirements-test.txt). Run from the repository root:
python -m pytest -q discord/patchnotes/test_cancel.py
"""

from __future__ import annotations

import asyncio
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import discord  # noqa: E402

from patchnotes import patchnotes as pn  # noqa: E402

WEEK = "2026-W45"
BEFORE = datetime(2026, 11, 6, 12, 0, tzinfo=timezone.utc)  # 13:00 in Berlin
AFTER = datetime(2026, 11, 6, 17, 30, tzinfo=timezone.utc)  # 18:30 in Berlin


class _Value:
    def __init__(self, value):
        self.value = value

    async def __call__(self):
        return self.value

    async def set(self, value):
        self.value = value


class _Config:
    def __init__(self, **values):
        for key, value in values.items():
            setattr(self, key, _Value(value))


class _Message:
    def __init__(self, message_id: int, channel: "_Channel | None" = None):
        self.id = message_id
        self.channel = channel
        self.view = None

    async def delete(self):
        if self.id in self.channel.undeletable:
            raise discord.HTTPException(SimpleNamespace(status=500, reason="boom"), "boom")
        self.channel.deleted.append(self.id)

    async def edit(self, *, view=None, **_):
        self.view = view


class _Channel:
    def __init__(self, undeletable=()):
        self.deleted: list[int] = []
        self.sent: list[str] = []
        self.undeletable = set(undeletable)
        self.gate: asyncio.Event | None = None
        self.sending = asyncio.Event()

    async def fetch_message(self, message_id):
        return _Message(message_id, self)

    async def send(self, content, **_):
        self.sending.set()
        if self.gate is not None:
            await self.gate.wait()
        self.sent.append(content)
        return _Message(1000 + len(self.sent), self)


class _Interaction:
    def __init__(self):
        self.said: list[str] = []
        self.message = _Message(1)

        async def send(text, **_):
            self.said.append(text)

        self.followup = SimpleNamespace(send=send)


def _cog(status: dict, *, posts: dict | None = None, undeletable=(), status_error: bool = False):
    cog = pn.PatchNotes.__new__(pn.PatchNotes)
    cog.bot = SimpleNamespace(add_view=lambda view: None)
    posts = posts or {}
    cog.config = _Config(
        cancelled_weeks=[],
        week_cancel_confirm=[],
        week_postpone_undo=[WEEK] if status.get("postponed") else [],
        week_post_messages=dict(posts),
        week_messages={week: ids[0] for week, ids in posts.items()},
        postponement_messages={},
        published_weeks=[],
        review_posted_weeks=[WEEK],
        announced_weeks=[],
    )
    cog.zone = pn.resolve_zone("Europe/Berlin")
    cog.updates_channel_id = 5
    cog.channel = _Channel(undeletable)
    cog.calls = []
    cog.approve_answers = []
    cog._week_lock = asyncio.Lock()
    cog.update_ping_role_id = 0

    async def channel(_channel_id):
        return cog.channel

    async def fetch_week_status(_week):
        if status_error:
            raise RuntimeError("Could not load the week")
        return dict(status)

    async def api_request(method, path, payload=None):
        cog.calls.append((method, path))
        if path.endswith("/undo-postpone"):
            status["postponed"] = False
        elif path.endswith("/postpone"):
            status["postponed"] = True
        elif path.endswith("/auto-approve"):
            answer = 409 if status.get("postponed") else 200
            cog.approve_answers.append(answer)
            if answer == 409:
                return 409, '{"detail": "Week is postponed"}', {"detail": "Week is postponed"}
        return 200, "{}", {}

    async def fetch_post(_week):
        return {"messages": ["# Update 5.7"], "source": "writer"}

    async def publish_post(week, post, *, ping=True):
        cog.calls.append(("PUBLISH", week))

    async def fetch_week(_week):
        return [{"id": "1"}]

    cog._channel = channel
    cog.fetch_week_status = fetch_week_status
    cog.api_request = api_request
    cog.fetch_post = fetch_post
    cog.publish_post = publish_post
    cog.fetch_week = fetch_week
    return cog


def _at(moment: datetime):
    real = pn.datetime

    class Fixed(real):
        @classmethod
        def now(cls, tz=None):
            return moment

    return mock.patch.object(pn, "datetime", Fixed)


def _approved(cog) -> bool:
    """The fake API accepted an auto-approve, which it refuses (409) while the week is postponed."""
    return 200 in cog.approve_answers


class CancelPostTest(unittest.IsolatedAsyncioTestCase):
    async def test_cancel_takes_back_a_postponement_and_posts_nothing_at_18(self) -> None:
        status = {"postponed": True, "deferred_to": None}
        cog = _cog(status)
        interaction = _Interaction()
        with _at(BEFORE):
            await cog.begin_week_cancel(interaction, WEEK)
            self.assertIsInstance(interaction.message.view, pn.WeekCancelConfirmView)
            self.assertEqual(await cog.config.week_cancel_confirm(), [WEEK])
            await cog.confirm_week_cancel(interaction, WEEK)
        self.assertIn(("POST", f"/patchnotes/staff/weeks/{WEEK}/undo-postpone"), cog.calls)
        self.assertEqual(await cog.config.week_postpone_undo(), [])
        self.assertEqual(await cog.config.week_cancel_confirm(), [])
        self.assertTrue(await cog.is_cancelled(WEEK))
        self.assertIsInstance(interaction.message.view, pn.WeekUndoCancelView)
        self.assertEqual(await cog.config.published_weeks(), [])

        await cog._publish_due_weeks(AFTER, [])
        self.assertNotIn(("PUBLISH", WEEK), cog.calls)
        self.assertFalse(any(path.endswith("/defer") for _, path in cog.calls))
        self.assertEqual(cog.channel.sent, [])
        self.assertTrue(_approved(cog))
        self.assertEqual(await cog.config.published_weeks(), [WEEK])

    async def test_undo_after_18_reopens_and_posts(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})
        with _at(AFTER):
            await cog.confirm_week_cancel(_Interaction(), WEEK)
            self.assertEqual(await cog.config.published_weeks(), [WEEK])
            interaction = _Interaction()
            await cog.undo_week_cancel(interaction, WEEK)
        self.assertIn(("PUBLISH", WEEK), cog.calls)
        self.assertFalse(await cog.is_cancelled(WEEK))
        self.assertIsInstance(interaction.message.view, pn.WeekReviewView)
        self.assertEqual(await cog.config.published_weeks(), [WEEK])

    async def test_cancel_removes_a_post_already_in_updates(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None}, posts={WEEK: [11, 12, 13]})
        interaction = _Interaction()
        with _at(AFTER):
            await cog.confirm_week_cancel(interaction, WEEK)
        self.assertEqual(sorted(cog.channel.deleted), [11, 12, 13])
        self.assertEqual(await cog.config.week_post_messages(), {})
        self.assertEqual(await cog.config.week_messages(), {})
        self.assertIn("was removed", interaction.said[-1])
        self.assertNotIn("could not be removed", interaction.said[-1])

    async def test_messages_that_could_not_be_deleted_are_kept(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None}, posts={WEEK: [11, 12]}, undeletable={12})
        interaction = _Interaction()
        with _at(AFTER):
            await cog.confirm_week_cancel(interaction, WEEK)
        self.assertEqual(cog.channel.deleted, [11])
        self.assertEqual(await cog.config.week_post_messages(), {WEEK: [12]})
        self.assertEqual(await cog.config.week_messages(), {WEEK: 12})
        self.assertIn("could not be removed", interaction.said[-1])

    async def test_a_deferred_week_cannot_be_cancelled(self) -> None:
        cog = _cog({"postponed": True, "deferred_to": "2026-W46"})
        interaction = _Interaction()
        with _at(AFTER):
            await cog.begin_week_cancel(interaction, WEEK)
            await cog.confirm_week_cancel(interaction, WEEK)
        self.assertFalse(await cog.is_cancelled(WEEK))
        self.assertIn("2026-W46", interaction.said[-1])

    async def test_back_restores_the_postponed_buttons(self) -> None:
        cog = _cog({"postponed": True, "deferred_to": None})
        interaction = _Interaction()
        with _at(BEFORE):
            await cog.begin_week_cancel(interaction, WEEK)
            await cog.back_from_week_cancel(interaction, WEEK)
        self.assertIsInstance(interaction.message.view, pn.WeekUndoPostponeView)
        self.assertEqual(await cog.config.week_cancel_confirm(), [])

    async def test_a_stale_back_or_undo_postpone_keeps_undo_cancel(self) -> None:
        status = {"postponed": False, "deferred_to": None}
        cog = _cog(status)
        cog.config.cancelled_weeks.value = [WEEK]
        cog.config.week_cancel_confirm.value = [WEEK]
        cog.config.week_postpone_undo.value = [WEEK]
        back = _Interaction()
        await cog.back_from_week_cancel(back, WEEK)
        self.assertIsInstance(back.message.view, pn.WeekUndoCancelView)
        self.assertIn("already cancelled", back.said[-1])
        undo = _Interaction()
        await cog.undo_week_postpone(undo, WEEK)
        self.assertIsInstance(undo.message.view, pn.WeekUndoCancelView)
        self.assertEqual(cog.calls, [])
        self.assertEqual(await cog.config.week_cancel_confirm(), [])
        self.assertEqual(await cog.config.week_postpone_undo(), [])
        self.assertTrue(await cog.is_cancelled(WEEK))

    async def test_back_waits_for_a_cancel_in_progress(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})
        interaction = _Interaction()
        async with cog._week_lock:
            back = asyncio.create_task(cog.back_from_week_cancel(interaction, WEEK))
            await asyncio.sleep(0)
            cog.config.cancelled_weeks.value = [WEEK]
        await back
        self.assertIsInstance(interaction.message.view, pn.WeekUndoCancelView)

    async def test_back_keeps_the_confirm_when_the_status_fails(self) -> None:
        cog = _cog({"postponed": True, "deferred_to": None}, status_error=True)
        cog.config.week_cancel_confirm.value = [WEEK]
        interaction = _Interaction()
        confirm = pn.WeekCancelConfirmView(cog, WEEK)
        interaction.message.view = confirm
        await cog.back_from_week_cancel(interaction, WEEK)
        self.assertIs(interaction.message.view, confirm)
        self.assertEqual(await cog.config.week_cancel_confirm(), [WEEK])

    async def test_publish_refuses_a_cancelled_week(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})
        cog.config.cancelled_weeks.value = [WEEK]
        with self.assertRaises(RuntimeError):
            await cog.publish_week(WEEK)
        self.assertNotIn(("PUBLISH", WEEK), cog.calls)

    async def test_a_cancelled_week_cannot_be_postponed_or_approved(self) -> None:
        status = {"postponed": False, "deferred_to": None}
        cog = _cog(status)
        cog.config.cancelled_weeks.value = [WEEK]
        interaction = _Interaction()
        await cog.begin_week_postpone(interaction, WEEK)
        await cog.confirm_week_postpone(interaction, WEEK)
        await cog.confirm_postpone(interaction, WEEK, "bullet-1")
        await cog.approve_week_review(interaction, WEEK)
        self.assertEqual(interaction.said, [pn._CANCELLED_REPLY] * 4)
        self.assertEqual(cog.calls, [])
        self.assertFalse(status["postponed"])

    async def test_the_poller_takes_back_a_hold_on_a_cancelled_week(self) -> None:
        status = {"postponed": True, "deferred_to": None}
        cog = _cog(status)
        cog.config.cancelled_weeks.value = [WEEK]
        await cog._publish_due_weeks(AFTER, [])
        self.assertIn(("POST", f"/patchnotes/staff/weeks/{WEEK}/undo-postpone"), cog.calls)
        self.assertTrue(_approved(cog))
        self.assertEqual(await cog.config.published_weeks(), [WEEK])
        self.assertEqual(cog.channel.sent, [])

    async def test_the_poller_retries_when_the_approval_fails(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})
        cog.config.cancelled_weeks.value = [WEEK]
        real = cog.api_request

        async def failing(method, path, payload=None):
            if path.endswith("/auto-approve"):
                return 502, "down", None
            return await real(method, path, payload)

        cog.api_request = failing
        await cog._publish_due_weeks(AFTER, [])
        self.assertEqual(await cog.config.published_weeks(), [])
        cog.api_request = real
        await cog._publish_due_weeks(AFTER, [])
        self.assertEqual(await cog.config.published_weeks(), [WEEK])

    async def test_a_reposted_review_of_a_cancelled_week_keeps_undo_cancel(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})
        self.assertIsInstance(await cog._review_view(WEEK), pn.WeekReviewView)
        cog.config.cancelled_weeks.value = [WEEK]
        self.assertIsInstance(await cog._review_view(WEEK), pn.WeekUndoCancelView)

    async def test_publish_post_refuses_a_cancelled_week(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})
        cog.config.cancelled_weeks.value = [WEEK]
        with self.assertRaises(RuntimeError):
            await pn.PatchNotes.publish_post(cog, WEEK, {"messages": ["# Update"]})
        self.assertEqual(cog.channel.sent, [])

    async def test_cancel_waits_for_an_in_flight_publish_and_removes_it(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})
        gate = asyncio.Event()
        started = asyncio.Event()

        async def slow_publish(week, post, *, ping=True):
            started.set()
            await gate.wait()
            await cog.config.week_post_messages.set({week: [21, 22]})
            cog.calls.append(("PUBLISH", week))

        cog.publish_post = slow_publish
        with _at(AFTER):
            poller = asyncio.create_task(cog._publish_due_weeks(AFTER, []))
            await started.wait()
            cancel = asyncio.create_task(cog.confirm_week_cancel(_Interaction(), WEEK))
            await asyncio.sleep(0)
            self.assertFalse(await cog.is_cancelled(WEEK))
            gate.set()
            await asyncio.gather(poller, cancel)
        self.assertTrue(await cog.is_cancelled(WEEK))
        self.assertEqual(sorted(cog.channel.deleted), [21, 22])

    async def test_undo_twice_posts_once(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})
        cog.config.cancelled_weeks.value = [WEEK]
        cog.config.published_weeks.value = [WEEK]
        gate = asyncio.Event()
        started = asyncio.Event()

        async def slow_publish(week, post, *, ping=True):
            started.set()
            await gate.wait()
            cog.calls.append(("PUBLISH", week))

        cog.publish_post = slow_publish
        with _at(AFTER):
            first = _Interaction()
            second = _Interaction()
            one = asyncio.create_task(cog.undo_week_cancel(first, WEEK))
            await started.wait()
            two = asyncio.create_task(cog.undo_week_cancel(second, WEEK))
            await asyncio.sleep(0)
            gate.set()
            await asyncio.gather(one, two)
        self.assertEqual(cog.calls.count(("PUBLISH", WEEK)), 1)
        self.assertIn("not cancelled", second.said[-1])

    async def test_a_staff_publish_racing_a_cancel_is_removed(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})
        cog.publish_post = pn.PatchNotes.publish_post.__get__(cog)
        cog.channel.gate = asyncio.Event()
        with _at(AFTER):
            approve = asyncio.create_task(cog.publish_post(WEEK, {"messages": ["# Update 5.7"]}, ping=False))
            await cog.channel.sending.wait()
            await cog.confirm_week_cancel(_Interaction(), WEEK)
            cog.channel.gate.set()
            await approve
        self.assertEqual(cog.channel.sent, ["# Update 5.7"])
        self.assertEqual(cog.channel.deleted, [1001])
        self.assertEqual(await cog.config.week_post_messages(), {})

    async def test_undo_holds_the_poller_off_until_it_has_posted(self) -> None:
        # Cancelled before 18:00 and undone just after, before the poller released it.
        cog = _cog({"postponed": False, "deferred_to": None})
        cog.config.cancelled_weeks.value = [WEEK]
        gate = asyncio.Event()
        started = asyncio.Event()

        async def slow_publish(week, post, *, ping=True):
            started.set()
            await gate.wait()
            cog.calls.append(("PUBLISH", week))

        cog.publish_post = slow_publish
        with _at(AFTER):
            undo = asyncio.create_task(cog.undo_week_cancel(_Interaction(), WEEK))
            await started.wait()
            poller = asyncio.create_task(cog._publish_due_weeks(AFTER, []))
            await asyncio.sleep(0)
            gate.set()
            await asyncio.gather(undo, poller)
        self.assertEqual(cog.calls.count(("PUBLISH", WEEK)), 1)
        self.assertEqual(await cog.config.published_weeks(), [WEEK])

    async def test_a_line_postpone_waits_for_a_cancel_and_then_refuses(self) -> None:
        status = {"postponed": False, "deferred_to": None}
        cog = _cog(status)
        interaction = _Interaction()
        async with cog._week_lock:
            postpone = asyncio.create_task(cog.confirm_postpone(interaction, WEEK, "bullet-1"))
            await asyncio.sleep(0)
            cog.config.cancelled_weeks.value = [WEEK]
        await postpone
        self.assertEqual(interaction.said, [pn._CANCELLED_REPLY])
        self.assertFalse(status["postponed"])

    async def test_a_plain_list_post_racing_a_cancel_is_removed(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})

        async def no_post(_week):
            return None

        cog.fetch_post = no_post
        cog.page_url = "https://www.tfminecraft.net/updates"
        cog.channel.gate = asyncio.Event()
        with _at(AFTER):
            publish = asyncio.create_task(pn.PatchNotes.publish_week(cog, WEEK, ping=False))
            await cog.channel.sending.wait()
            await cog.confirm_week_cancel(_Interaction(), WEEK)
            cog.channel.gate.set()
            await publish
        self.assertEqual(len(cog.channel.sent), 1)
        self.assertEqual(cog.channel.deleted, [1001])
        self.assertEqual(await cog.config.week_messages(), {})

    async def test_a_postpone_waits_for_a_cancel_and_then_refuses(self) -> None:
        status = {"postponed": False, "deferred_to": None}
        cog = _cog(status)
        interaction = _Interaction()
        async with cog._week_lock:
            postpone = asyncio.create_task(cog.confirm_week_postpone(interaction, WEEK))
            await asyncio.sleep(0)
            cog.config.cancelled_weeks.value = [WEEK]
        await postpone
        self.assertEqual(interaction.said, [pn._CANCELLED_REPLY])
        self.assertFalse(status["postponed"])
        self.assertNotIn(("POST", f"/patchnotes/staff/weeks/{WEEK}/postpone"), cog.calls)

    async def test_a_refused_approval_leaves_the_week_for_the_poller(self) -> None:
        status = {"postponed": True, "deferred_to": None}
        cog = _cog(status)
        cog.config.cancelled_weeks.value = [WEEK]
        real = cog.api_request

        async def sticky_hold(method, path, payload=None):
            if path.endswith("/undo-postpone"):
                cog.calls.append((method, path))
                return 200, "{}", {}
            return await real(method, path, payload)

        cog.api_request = sticky_hold
        await cog._publish_due_weeks(AFTER, [])
        self.assertEqual(cog.approve_answers, [409])
        self.assertEqual(await cog.config.published_weeks(), [])

    async def test_cancel_is_rolled_back_when_the_api_is_unreachable(self) -> None:
        cog = _cog({"postponed": True, "deferred_to": None})

        async def unreachable(method, path, payload=None):
            raise OSError("connection refused")

        cog.api_request = unreachable
        interaction = _Interaction()
        await cog.confirm_week_cancel(interaction, WEEK)
        self.assertFalse(await cog.is_cancelled(WEEK))
        self.assertIn("connection refused", interaction.said[-1])

    async def test_cog_load_reattaches_the_cancel_buttons(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})
        views = []
        cog.bot = SimpleNamespace(add_view=views.append)
        state = {
            "review_messages": {},
            "test_weeks": [],
            "postpone_confirm": {},
            "postpone_undo": {},
            "review_bundles": {},
            "week_postpone_confirm": [],
            "week_postpone_undo": [],
            "week_cancel_confirm": ["2026-W44"],
            "cancelled_weeks": [WEEK],
        }
        for key, value in state.items():
            setattr(cog.config, key, _Value(value))

        async def no_poll():
            return None

        cog.load_settings = lambda: {}
        cog.apply_settings = lambda settings: None
        cog._poll_loop = no_poll
        cog.poll_interval = 60
        cog.api_base_url = ""
        await cog.cog_load()
        await cog._poll_task
        attached = {(type(view).__name__, view.week) for view in views}
        self.assertIn(("WeekCancelConfirmView", "2026-W44"), attached)
        self.assertIn(("WeekUndoCancelView", WEEK), attached)

    async def test_buttons_have_unique_persistent_ids(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})
        views = (
            pn.WeekReviewView(cog, WEEK),
            pn.WeekUndoPostponeView(cog, WEEK),
            pn.WeekCancelConfirmView(cog, WEEK),
            pn.WeekUndoCancelView(cog, WEEK),
        )
        ids = [item.custom_id for view in views for item in view.children]
        self.assertEqual(len(ids), 9)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(view.is_persistent() for view in views))


if __name__ == "__main__":
    unittest.main()
