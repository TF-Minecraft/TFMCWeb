"""Post the sample war history to a running backend, or write the frontend fixture.

    python backend/scripts/seed_war_history.py --api http://127.0.0.1:8000 --plugin-key dev-plugin-key
    python backend/scripts/seed_war_history.py --write-fixture frontend/lib/wars/sampleWar.json

The sample (`src/wars/history_sample.py`) is one war in progress, one ended war and
one known only from backfilled battle records. Posting twice changes nothing: the
routes are idempotent. The fixture is the page models the backend builds from the
same sample, so the frontend tests render exactly what the API would return.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_BACKEND))

from src.wars.history_model import (  # noqa: E402
    build_battle_report,
    build_war_model,
    build_war_summary,
    parse_instant,
)
from src.wars.history_sample import (  # noqa: E402
    ACTIVE_WAR,
    BACKFILL_WAR,
    ENDED_WAR,
    sample_batches,
    sample_province_name,
)


def _post(api: str, path: str, key: str, body: dict) -> dict:
    request = urllib.request.Request(
        api.rstrip("/") + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-Plugin-Key": key},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310 - a URL the caller names
        return json.loads(response.read())


def seed(api: str, key: str, realm: str) -> None:
    events, battles = sample_batches(realm)
    acked = _post(api, "/wars/plugin/events", key, events)
    print(f"events: {len(acked['acked'])} acked, {len(acked.get('rejected', []))} rejected")
    acked = _post(api, "/wars/plugin/battles", key, battles)
    print(f"battles: {len(acked['acked'])} acked, {len(acked.get('rejected', []))} rejected")


def fixture() -> dict:
    events_body, battles_body = sample_batches()

    def war(key: str) -> tuple[list[dict], list[dict]]:
        events = [dict(e, at=parse_instant(e["at"])) for e in events_body["events"] if e["war_key"] == key]
        return events, [r for r in battles_body["records"] if r["warKey"] == key]

    models = {}
    for key in (ACTIVE_WAR, ENDED_WAR, BACKFILL_WAR):
        events, records = war(key)
        models[key] = {"map_id": "main", **build_war_model(key, events, records, province_name=sample_province_name)}
    events, records = war(ACTIVE_WAR)
    report = build_battle_report(ACTIVE_WAR, events, records, records[1]["id"], province_name=sample_province_name)
    return {
        "list": {"map_id": "main", "wars": [build_war_summary(models[k]) for k in (ACTIVE_WAR, ENDED_WAR, BACKFILL_WAR)]},
        "active": models[ACTIVE_WAR],
        "ended": models[ENDED_WAR],
        "backfill": models[BACKFILL_WAR],
        "battle": {"map_id": "main", **report},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--api", help="Backend base URL to post the sample to")
    parser.add_argument("--plugin-key", default="dev-plugin-key")
    parser.add_argument("--realm", default="main")
    parser.add_argument("--write-fixture", type=Path, help="Write the frontend fixture JSON here")
    args = parser.parse_args()
    if not args.api and not args.write_fixture:
        parser.error("give --api, --write-fixture or both")
    if args.write_fixture:
        args.write_fixture.write_text(json.dumps(fixture(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {args.write_fixture}")
    if args.api:
        seed(args.api, args.plugin_key, args.realm)


if __name__ == "__main__":
    main()
