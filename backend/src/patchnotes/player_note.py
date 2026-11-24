"""Add, list or remove the lines staff want in the week's Discord post.

    python -m src.patchnotes.player_note add "Horses run faster."
    python -m src.patchnotes.player_note list
    python -m src.patchnotes.player_note remove 12

Run it in the backend container. `--week` defaults to the note week that is still open.
"""

from __future__ import annotations

import argparse

from . import db


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    add = commands.add_parser("add")
    add.add_argument("body", nargs="+")
    add.add_argument("--author", default="")
    add.add_argument("--week")
    listing = commands.add_parser("list")
    listing.add_argument("--week")
    remove = commands.add_parser("remove")
    remove.add_argument("id", type=int)
    args = parser.parse_args(argv)
    db.migrate()
    if args.command == "add":
        for body in args.body:
            note = db.add_player_note(body, author=args.author, week=args.week)
            print(f"{note['week']} #{note['id']}: {note['body']}")
    elif args.command == "list":
        for note in db.list_player_notes(args.week or db.current_week()):
            print(f"{note['week']} #{note['id']} ({note['author'] or 'unknown'}): {note['body']}")
    else:
        if not db.remove_player_note(args.id):
            print(f"No note #{args.id}.")
            return 1
        print(f"Removed #{args.id}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
