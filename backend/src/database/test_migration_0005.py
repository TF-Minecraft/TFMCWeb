"""0005 on data written at 0004: war declare codes gain a kind and may drop the goal."""

import psycopg
import pytest
from psycopg.rows import dict_row

from src.database import migrate


def _at(version: str, url: str, monkeypatch) -> None:
    files = [m for m in migrate.discover() if m.version <= version]
    monkeypatch.setattr(migrate, "discover", lambda directory=None: files)
    migrate.migrate(url)
    monkeypatch.undo()


def _insert(conn, code_hash: str, goal: str | None, kind: str | None = None) -> None:
    """A code row; `kind` None leaves the column out, as a 0004-era insert does."""
    extra = {} if kind is None else {"kind": kind}
    values = {"code_hash": code_hash, "attacker_faction_id": "a", "defender_faction_id": "d", "goal": goal, **extra}
    conn.execute(f"INSERT INTO war_declaration_codes ({', '.join(values)}, created_at, expires_at) "
                 f"VALUES ({', '.join(['%s'] * len(values))}, now(), now())", tuple(values.values()))


def test_0005_keeps_codes_as_war_declarations(scratch_database, monkeypatch):
    url = scratch_database
    _at("0004", url, monkeypatch)
    with psycopg.connect(url) as conn:
        _insert(conn, "h1", "subjugate")
    migrate.migrate(url)
    with psycopg.connect(url, row_factory=dict_row) as conn:
        row = conn.execute("SELECT kind, goal FROM war_declaration_codes").fetchone()
        assert row == {"kind": "war_declare", "goal": "subjugate"}
        _insert(conn, "h2", None)
        _insert(conn, "h3", None, "coalition_offensive")
        assert [r["kind"] for r in conn.execute("SELECT kind FROM war_declaration_codes ORDER BY code_hash")] == [
            "war_declare", "war_declare", "coalition_offensive"]

    for kind, goal in (("truce", None), ("coalition_offensive", "subjugate")):
        with pytest.raises(psycopg.errors.CheckViolation):
            with psycopg.connect(url) as conn:
                _insert(conn, f"bad-{kind}", goal, kind)
