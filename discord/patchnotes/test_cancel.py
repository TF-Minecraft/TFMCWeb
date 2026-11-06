"""Cancel post on the weekly review, driven with fakes for Config, the API and the channel.

Needs discord.py and Red (discord/requirements-test.txt). Run from the repository root:
python -m pytest -q discord/patchnotes/test_cancel.py
"""

from __future__ import annotations

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

    async def fetch_message(self, message_id):
        return _Message(message_id, self)

    async def send(self, content, **_):
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
    return ("POST", f"/patchnotes/staff/weeks/{WEEK}/auto-approve") in cog.calls


class CancelPostTest(unittest.IsolatedAsyncioTestCase):
    async def test_cancel_takes_back_a_postponement_and_posts_nothing_at_18(self) -> None:
        cog = _cog({"postponed": True, "deferred_to": None})
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

    async def test_messages_that_could_not_be_deleted_are_kept(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None}, posts={WEEK: [11, 12]}, undeletable={12})
        with _at(AFTER):
            await cog.confirm_week_cancel(_Interaction(), WEEK)
        self.assertEqual(cog.channel.deleted, [11])
        self.assertEqual(await cog.config.week_post_messages(), {WEEK: [12]})
        self.assertEqual(await cog.config.week_messages(), {WEEK: 12})

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

    async def test_back_keeps_the_confirm_when_the_status_fails(self) -> None:
        cog = _cog({"postponed": True, "deferred_to": None}, status_error=True)
        cog.config.week_cancel_confirm.value = [WEEK]
        interaction = _Interaction()
        await cog.back_from_week_cancel(interaction, WEEK)
        self.assertIsNone(interaction.message.view)
        self.assertEqual(await cog.config.week_cancel_confirm(), [WEEK])

    async def test_publish_refuses_a_cancelled_week(self) -> None:
        cog = _cog({"postponed": False, "deferred_to": None})
        cog.config.cancelled_weeks.value = [WEEK]
        with self.assertRaises(RuntimeError):
            await cog.publish_week(WEEK)
        self.assertNotIn(("PUBLISH", WEEK), cog.calls)

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
