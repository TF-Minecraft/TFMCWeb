"""Write the weekly Discord post from the week's facts.

The facts are the start of the note week against its end on TFMCMain, plus
the commits behind each plugin update. The rewrite agent turns them into a
few Discord messages in the staff style: Balance, then Gameplay, then Fixes,
with old --> new numbers and a short human reason for each part. Staff
feedback rewrites the whole post. If the agent fails, a plain list built
from the facts stands in so the week is never empty.
"""

from __future__ import annotations

import json
import re
from datetime import date
from typing import Any

from .feedback import FeedbackError
from .safety import hidden_knowledge_warning
from .summarize import (
    _COORDS,
    _DIFF,
    _EXPLOIT,
    _KIND_SECTION,
    _NOT_PLAYER_FACING,
    _PERMISSION,
    _SECRET,
    _split_conventional,
)

DISCORD_LIMIT = 2000
# The bot puts the role ping in front of the first message.
FIRST_LIMIT = 1900
# The writer aims for TARGET_MESSAGES. A busy week may run longer, up to MAX_MESSAGES.
TARGET_MESSAGES = 6
TARGET_WORDS = 1400
MAX_MESSAGES = 15
_FACTS_BUDGET = 240_000
_MENTION = re.compile(r"@(everyone|here)|<@[!&]?\d+>")
# Emoji only: pictographs, any symbol asking for emoji style (U+FE0F), the symbols
# that always show as emoji, and leftover joiners. Plain symbols such as arrows,
# stars, check marks and the music sharp stay.
_EMOJI = re.compile(
    r"[\U0001F000-\U0001FAFF]"
    r"|[\u2000-\u2BFF\u3000-\u33FF]\uFE0F"
    r"|[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653"
    r"\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2"
    r"\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757"
    r"\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]"
    r"|[\uFE0F\u200D\u20E3]"
)
_FENCE = re.compile(r"^```[a-z]*\n?|\n?```$")
_MONTHS = (
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December",
)

_GUIDE = """Answer from this message only. Do not run commands or read files.
You write the weekly update post for TFMC, a roleplay Minecraft server, in the voice of its staff.
Players read it in Discord. Write for a normal player: plain words, no file names, config keys,
plugin names, class ids or programming terms.
The goal: a player who read the last post learns what is different now, from what they knew to how it is today.

Voice: a staff member who plays here, telling the community what changed this week.
- Short plain sentences and contractions. Vary them, so groups and bullets don't all follow one pattern.
- Say the problem and what changes for the player: "A staff holds four runes and a wand only two, so nearly
  every Mage carried a staff." Tell them what to do when they have to do something: "Pick your path with `/class`".
- A reason must come from the notes, a developer description or an earlier post. With no reason, go straight to the
  bullets. Never fill in a sentence that only repeats the bullets below it.
- No hype, no marketing words, no "we are excited", nothing that reads like a changelog or a generated list.

Structure, in this order:
1. Title. {title_rule} Then `-# {week_line}` on its own line.
   Add a `## ` subtitle naming the biggest change only when one change clearly stands out. Most weeks need none.
   Then one or two sentences with the three or four things players will talk about, named concretely.
2. `# <act> Changes`, for example `# Act 2 Changes`: only when an act starts this week, meaning an act
   change week or a week whose facts show a class cap rising to the next act's cap. It holds the act
   changes described in "The Act System" below. Leave it out on every other week.
3. `# Balance Changes`: classes, attributes, skills and spells, new skills, and number changes that
   matter in a fight (damage, health, armour, cooldowns, weapon stats). Act changes never go here.
4. `# Gameplay Changes`: anything that changes how an existing system works, such as a node producing
   faster, something dropping more, a new mechanic, crafting, professions, farming, animals, factions, trade.
5. `# Fixes`: only the fixes players will notice most, as short bullets. Never a corrected spelling or name.
6. End with exactly this line: `-# Smaller and technical changes are on the website: <{page_url}>`

Rules:
- Use `## ` and `### ` subheadings inside a section to group related changes, bullets with `- `, and
  **bold** for the thing that changed. `-# ` is small text for side notes.
- Group changes by what a player does with them, the biggest first. A subheading can start with a sentence when
  there is a reason or something to know.
- When many values moved by the same share, say the share once and give the old and new numbers of the ones players
  know best. Put several changes to one class or item into one bullet.
- Write numbers as `Old --> New`. Use only numbers that appear in the facts. Never invent a number or a reason.
  Say what a number is: "cooldown 20 --> 17 s". When a whole list is cooldowns, one sentence above it can say so.
- Give a number when it changed or when players need it to act. Other settings, such as a radius or a timer of
  something new, are better in words.
- Say who an effect reaches exactly as the facts do: you, your allies, or both. What several classes or items share
  belongs to all of them, never to one.
  When you do not understand what a value means, describe the change in words without the number. A raw modifier
  players never see, such as `-55% --> -50%` damage or `0.01 --> 0.02` upkeep, is better as "hits harder" or "twice as
  much". A share that a whole class gains or loses, such as 15% less magic damage, is fine as a number.
- The config changes compare the start of the week with its end, so they are the only full picture: a value that moved
  several times shows as one step. Write that one step and mention each change once.
- Commits, developer descriptions and staff notes are listed oldest first and can hold a value, name or plan that
  changed again later that week. When they disagree with the config changes, the config changes are right. When two of
  them disagree, the later one is right. Something added and taken back in the same week is not in the post.
- Plugin updates and configs come from many developers, and most changes have no staff note. Judge every change by
  the facts: a change without a note matters as much as one with a note.
- Something marked added is new this week: describe it as it is now, not as a change.
- Leave out runtime data, staff-only tools, logging, performance work and anything technical.
- `(hidden)` stands for a name players must not learn. Leave out what it belongs to.
- Never name or describe anything under hidden. You may say there are new things to discover.
- Never reveal lore items, codex or research entries, dungeon names or details, hidden magic schools,
  exact crafting recipes or hit counts, coordinates, commands, permissions or exploits.
- Never write @everyone, @here or any mention. The bot adds the role ping itself.
- Never use an em dash or emojis.
- Write only about changes general players notice and care about. Leave out single players, admin and
  staff commands, the world border, edge-case fixes and technical cleanup.
- Never mention a skin a player made, even when a commit or a note does. A new way for players to
  make or upload skins is fine.
- Never give drop chances, roll counts, resource costs of hidden systems or creature stats, and never the caps and
  exceptions that stop farming, such as an hourly limit or a creature that gives nothing. Say "more",
  "less", "stronger" or "weaker" instead. Never name new traits or creature tricks.
- A passive or effect that only appears in class config may be internal. Describe what players feel, not its name,
  unless a plugin update line also mentions it.
- Features players cannot use yet stay out. If the facts do not show that something is usable, leave it out.
- Before answering, check every number, name and behaviour against the facts once more, and delete
  any line the facts do not clearly support. A shorter post is better than a wrong line.
- Keep the whole post to at most {target} messages and about {words} words, however busy the week is. Fold small related
  changes into one short line each, use at most three bullets or sentences on anything few players touch, and leave
  minor ones to the website instead of listing everything.
- Split the post into Discord messages in order. Each message must stay under 1900 characters.
  Start a new message at a heading, never in the middle of a list.
- Section headings are fixed. Leave a section out only when nothing belongs in it.

Return one JSON object and nothing else: {{"messages": ["first message", "second message"]}}
"""

_GLOSSARY = """Reading the facts:
- `attributes.max_health.base: 30 --> 28` is a class's starting health; `per-level` is gained per level.
- `damage-reduction`, `physical-damage`, `projectile_damage`, `critical_strike_chance` and `weapon_damage`
  are percentages. `health-regeneration` is health per second. `max-mana` and `mana-regeneration` work the same way.
- A skill's `level` in a class is the class level that unlocks it.
- `at level 1` is what players see on a skill at level 1. Those numbers are final. A skill's plain `base` is its value
  at level 1 too, and `per-level` is added per skill level.
- One line can list many names that all changed the same way.
- `time_modifier(N)` adds N percent to production time, so lower is faster. `prestige(N)` and `upkeep(N)`
  are Dowsing node values.
- `required-class` lists the classes that may use an item.
- Plugin updates list the code changes behind them, some with a developer description. Use them to explain
  new mechanics and fixes in plain words. A description may cover internal work, earlier drafts and staff
  tools: use only what a player can see or do.
"""

_ACT_SYSTEM = """The Act System:
- A season moves through acts. Each act raises the class level cap, sets the standard metal most players
  can make all their gear from, and adds a small, rare trickle of the next act's materials:

  | Act | Class level cap | Standard metal | Trickle of the next act |
  | Prologue | 6 | Iron | Ignitium |
  | Act 1 | 11 | Steel | Raw tin and abyssalite fragments |
  | Act 2 | 16 | Abyssalite | Mythril fragments and mythrilite |
  | Act 3 | 21 | Mythril | none yet |

- These are act changes, not balance changes:
  - a class `max-level` rising to the next act's cap (for example 6 --> 11);
  - skill slots and skill points at levels 7, 12 and 17, the first levels of Acts 1, 2 and 3;
  - the next act's materials starting to drop, or a drop list or reward pool switching to the new act
    (lucky miner, Geiger counters, activity rewards, fishing treasure, world bosses);
  - metal steal values being recalculated for the new act's supply;
  - a one-time class EXP catch-up for discoveries made while players were at the old cap.
- Never list act changes under Balance Changes and never call them a buff or a nerf. A higher level cap
  means the season moved on, not that a class got stronger.
- When an act starts, describe them together in the `# <act> Changes` section as what the new act brings.
  An act starts on an act change week, or on any other week whose facts show a class cap rising to the
  next act's cap.
- Changing how much of an act material drops within the same act is a Gameplay change. Explain it in act
  terms: the next act's materials stay rare on purpose until that act arrives.
"""

POST_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {"messages": {"type": "array", "items": {"type": "string"}}},
    "required": ["messages"],
}


def week_line(week: str) -> str:
    """`Week of 5 October 2026` for the Monday of an ISO week."""
    match = re.fullmatch(r"(\d{4})-W(\d{2})", week)
    if match is None:
        return week
    monday = date.fromisocalendar(int(match.group(1)), int(match.group(2)), 1)
    return f"Week of {monday.day} {_MONTHS[monday.month - 1]} {monday.year}"


def title_lines(label: str, act: str | None) -> list[str]:
    if act:
        return [f"# {act}", f"## Update {label}"]
    return [f"# Update {label}"]


def _title_rule(label: str, act: str | None) -> str:
    if act:
        return (
            f"This is an act change week: start with `# {act}`, then `## Update {label}`. "
            f"Explain what the new act changes for players in `# {act} Changes`, before Balance Changes."
        )
    return f"Start with `# Update {label}`."


# Balance first, then systems, then skill mechanics, then looks and vehicles.
_FILE_RANKS = (
    ("MMOCore/", 0),
    ("MythicLib/", 1),
    ("MMOItems/", 1),
    ("AdvancedCrafting/", 1),
    ("Magic/", 1),
    ("MythicMobs/", 3),
    ("VehicleFramework/vehicles/", 4),
    ("ArmourShop/", 4),
    ("ItemsAdder/", 4),
)
_FILE_BUDGET = 30_000
_ENTRY_DETAILS = 80
_GROUP_FROM = 3
_GROUP_NAMES = 15


def _file_rank(path: str) -> int:
    for prefix, rank in _FILE_RANKS:
        if path.startswith(prefix):
            return rank
    return 2


def _grouped(entries: list[Any]) -> list[tuple[list[str], str, list[str]]]:
    """Entries as names, kind and details. Entries that changed the same way become one."""
    groups: dict[tuple[str, tuple[str, ...]], list[str]] = {}
    for entry in entries:
        if isinstance(entry, dict):
            details = tuple(str(detail) for detail in entry.get("details") or [])
            groups.setdefault((str(entry.get("kind")), details), []).append(str(entry.get("name")))
    found: list[tuple[list[str], str, list[str]]] = []
    for (kind, details), names in groups.items():
        if len(names) >= _GROUP_FROM and details:
            found.append((names, kind, list(details)))
        else:
            found += [([name], kind, list(details)) for name in names]
    return found


def _render_file(item: dict[str, Any]) -> str:
    lines = [f"## {item.get('path')} ({item.get('kind')})"]
    for names, kind, details in _grouped(item.get("entries") or []):
        if len(details) > _ENTRY_DETAILS:
            details = details[:_ENTRY_DETAILS] + [f"and {len(details) - _ENTRY_DETAILS} more"]
        shown = ", ".join(names[:_GROUP_NAMES])
        if len(names) > 1:
            more = f" and {len(names) - _GROUP_NAMES} more" if len(names) > _GROUP_NAMES else ""
            head = f"- {len(names)} of them ({kind}): {shown}{more}"
        else:
            head = f"- {shown} ({kind})"
        lines.append(head + (": " + "; ".join(details) if details else ""))
    text = "\n".join(lines)
    if len(text) > _FILE_BUDGET:
        text = text[:_FILE_BUDGET].rsplit("\n", 1)[0] + "\n- (more changes in this file)"
    return text


def render_facts(facts: dict[str, Any], budget: int = _FACTS_BUDGET) -> str:
    """The facts as plain text for the writer, trimmed to fit the prompt."""
    lines: list[str] = []
    if facts.get("partial"):
        lines.append("Note: the oldest backup is newer than the start of the week, so early changes may be missing.")
    plugins = [item for item in facts.get("plugins") or [] if isinstance(item, dict)]
    if plugins:
        lines.append("Plugin updates on the main server:")
        for item in plugins:
            old, new = item.get("old") or "none", item.get("new") or "removed"
            lines.append(f"- {item.get('plugin')}: {old} --> {new}")
            for subject in item.get("commits") or []:
                lines.append(f"  - {subject}")
                detail = (item.get("details") or {}).get(subject)
                if detail:
                    lines.append(f"    Developer description: {detail}")
    files = [item for item in facts.get("files") or [] if isinstance(item, dict)]
    if files:
        lines.append("Config changes, start of week --> end of week:")
        for item in sorted(files, key=lambda found: (_file_rank(str(found.get("path") or "")), found.get("path"))):
            lines.append(_render_file(item))
    hidden = facts.get("hidden") or {}
    if isinstance(hidden, dict) and hidden:
        lines.append("Hidden (count only, never name or describe):")
        for plugin, count in sorted(hidden.items()):
            lines.append(f"- {plugin}: {count} changed entries")
    text = "\n".join(lines)
    if len(text) > budget:
        text = text[:budget].rsplit("\n", 1)[0] + "\n(more changes were left out to fit)"
    return text or "No changes were found this week."


def compose_prompt(
    facts: dict[str, Any],
    *,
    week: str,
    label: str,
    act: str | None,
    page_url: str,
    previous: list[str] | None = None,
    feedback: str | None = None,
    examples: list[list[str]] | None = None,
    notes: list[str] | None = None,
) -> str:
    guide = _GUIDE.format(
        title_rule=_title_rule(label, act),
        week_line=week_line(week),
        page_url=f"{page_url.rstrip('/')}/{week}",
        target=TARGET_MESSAGES,
        words=TARGET_WORDS,
    )
    parts = [guide, _GLOSSARY, _ACT_SYSTEM]
    if examples:
        parts.append(
            "Earlier posts, newest first. Use them for tone and layout, and for what players were already told. "
            "The facts can overlap with them: never announce a change again. When an earlier post already announced "
            "part of a number change, start from the newest post's final value: if it said `18 --> 15` and the facts say "
            "`18 --> 11`, write `15 --> 11`. If it already gave the final value, leave the change out:"
        )
        parts += [json.dumps(example, ensure_ascii=False) for example in examples]
    if notes:
        parts.append(
            "Staff notes for this week, oldest first. Staff wrote them for players while shipping the changes, and they "
            "say why. They cover only part of the week. Every note belongs in the post unless an earlier post already "
            "told players or a later change undid it. A note wins over the developer descriptions, but when the config "
            "changes end on another number, that final number is right and the note only gives the reason. Fit the "
            "wording to the rest:"
        )
        parts.append("\n".join(f"- {note}" for note in notes))
    parts += ["Facts:", render_facts(facts)]
    if previous and feedback:
        parts += [
            "Current post:",
            json.dumps(previous, ensure_ascii=False),
            "Staff feedback on the current post. It is an instruction, not new wording, unless staff clearly "
            "give a sentence to publish. Apply every point of it. Staff know the server: what they state is true "
            "even when the facts do not show it, and it wins over the facts and the rules on length, structure "
            "and what to leave out. The rules on mentions, hidden things and message size still apply. Keep every line "
            "the feedback is not about exactly as it is in the current post:",
            feedback,
        ]
    return "\n\n".join(parts)


def feedback_review_prompt(previous: list[str], feedback: str) -> str:
    """The second pass of a rewrite after staff feedback. The worker puts the draft after it.

    It leaves the facts out: staff decide what is true here, and the call stays small.
    """
    return "\n\n".join([
        "Answer from this message only. A weekly update post was rewritten after staff feedback. Check the draft "
        'below and return the corrected post as one JSON object and nothing else: {"messages": ["first", "second"]}\n'
        "- Every point of the staff feedback is applied, everywhere it fits. What staff state counts as true.\n"
        "- Every line of the current post that the feedback is not about is still there, word for word.\n"
        "- A number is the same as in the current post, unless the feedback is about it or asks for new details.\n"
        "- Each message stays under 1900 characters, with no mentions, emojis or em dashes.\n"
        "Change nothing else.",
        "Current post:",
        json.dumps(previous, ensure_ascii=False),
        "Staff feedback:",
        feedback,
        "Draft:",
    ])


def improve_prompt(prompt: str) -> str:
    """The second pass: what is missing and how it reads. The worker puts the draft after it."""
    return "\n\n".join([
        prompt,
        "The message above was the writing task, and a draft was written for it. Read the draft below as a player and "
        "as the staff member who signs it, and return a better version in the same JSON form:\n"
        "- Go through the staff notes, the plugin updates and the config changes one by one. Add every change players "
        "would notice that the draft misses, such as a new thing they can do, how something they use now works, or a "
        "new stat of a class. Fold small ones into a line that is already there.\n"
        "- Say why where the notes, a developer description or an earlier post give the reason and the draft leaves "
        "it out. Most big changes should have one short reason.\n"
        "- Make every line clear to someone who has not followed the week. A number says what it is, such as a "
        "cooldown. Cut settings players never think about and lines that only a few would care about.\n"
        "- Rewrite a sentence that only repeats the bullets below it, gives a reason nothing supports, or sounds like "
        "a generated list. Vary bullets that all follow one pattern. Match the voice of the earlier posts.\n"
        f"- Count the words. When it is over about {TARGET_WORDS}, shorten: cut what few players would miss, such as "
        "small extras of a new feature, before anything that changes how people play. "
        f"At most {TARGET_MESSAGES} messages.\n"
        "- Keep what is already good, and use only what the facts and notes support.",
        "Draft:",
    ])


def review_prompt(prompt: str) -> str:
    """The last pass: is every line right. The worker puts the draft after it."""
    return "\n\n".join([
        prompt,
        "The message above was the writing task, and a draft was written for it. Check the draft below now and "
        "return the corrected post in the same JSON form:\n"
        "- Compare every number, name and behaviour with the staff notes and the facts. Correct or delete what "
        "neither supports. Every staff note is in the post, unless an earlier post already told players or a later "
        "change undid it.\n"
        "- Compare every `Old --> New` with the earlier posts. The old number is what players were last told or had at "
        "the start of the week, and the new number is the one at the end of the week. Remove anything already "
        "announced and any step in between.\n"
        "- Check who each effect reaches, and that a stat several classes or items share is not given to one of them.\n"
        "- Apply every rule again: nothing hidden, nothing staff-only, no chances, roll counts or creature stats.\n"
        "- Keep the wording of every line that is already right. Keep the order and the message limits.",
        "Draft:",
    ])


def unsafe_line(line: str) -> bool:
    return bool(
        hidden_knowledge_warning(line)
        or _SECRET.search(line)
        or _DIFF.search(line)
        or _EXPLOIT.search(line)
        or _PERMISSION.search(line)
        or _COORDS.search(line)
    )


def clean_message(text: str) -> str:
    text = _FENCE.sub("", text.strip()).strip()
    text = _MENTION.sub("", text).replace("—", ", ").replace("–", "-")
    text = _EMOJI.sub("", text)
    # Removed emojis and mentions leave double spaces. Leading indentation stays for nested lists.
    text = re.sub(r"(?<=\S) {2,}", " ", text)
    lines = [line.rstrip() for line in text.splitlines() if not unsafe_line(line)]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def split_message(text: str, limit: int) -> list[str]:
    """Pieces under `limit`, cut at headings first and then at line breaks."""
    if len(text) <= limit:
        return [text]
    pieces: list[str] = []
    current = ""
    for line in text.splitlines(keepends=True):
        if len(line) > limit:
            line = line[: limit - 2] + "…\n"
        heading = line.startswith("#")
        if current and (len(current) + len(line) > limit or (heading and len(current) > limit * 0.6)):
            pieces.append(current.strip())
            current = ""
        current += line
    if current.strip():
        pieces.append(current.strip())
    return pieces


def fit_messages(messages: list[str]) -> list[str]:
    fitted: list[str] = []
    for message in messages:
        limit = FIRST_LIMIT if not fitted else DISCORD_LIMIT - 50
        fitted.extend(piece for piece in split_message(message, limit) if piece)
    return fitted


def pack_messages(messages: list[str]) -> list[str]:
    """Join short neighbours, so the post takes as few Discord messages as its text needs."""
    packed: list[str] = []
    for message in messages:
        limit = FIRST_LIMIT if len(packed) < 2 else DISCORD_LIMIT - 50
        if packed and len(packed[-1]) + 2 + len(message) <= limit:
            packed[-1] += "\n\n" + message
        else:
            packed.append(message)
    return packed


def messages_from_response(payload: dict[str, Any], *, pack: bool = False) -> list[str]:
    """The post's messages. `pack` joins short ones, which would undo a split staff asked for."""
    raw = payload.get("messages")
    if not isinstance(raw, list):
        raise FeedbackError("The writer did not return any messages.")
    cleaned = [clean_message(item) for item in raw if isinstance(item, str)]
    messages = fit_messages([item for item in cleaned if item])
    if pack:
        messages = pack_messages(messages)
    if not messages:
        raise FeedbackError("The writer returned an empty post.")
    if len(messages) > MAX_MESSAGES:
        raise FeedbackError("The writer returned a post that is too long for Discord.")
    return messages


def _plain_subject(subject: str) -> str:
    """A commit subject without its `fix:` prefix, or empty for technical work."""
    kind, text = _split_conventional(subject)
    if _KIND_SECTION.get(kind) == "technical" or _NOT_PLAYER_FACING.search(text) or _TEST_WORK.search(text):
        return ""
    return text[:1].upper() + text[1:]


_TEST_WORK = re.compile(r"(?i)\b(coverage|tests?|ci|refactor)\b")


_VAGUE_KEYS = frozenset({"base", "per-level", "value", "amount"})


def _readable(detail: str) -> str:
    """`attributes.max_health.base: 30 --> 28` as `max health base: 30 --> 28`."""
    path, _, change = detail.partition(": ")
    parts = path.split(".")
    keep = parts[-2:] if len(parts) > 1 and parts[-1] in _VAGUE_KEYS else parts[-1:]
    name = " ".join(keep).replace("_", " ").replace("-", " ")
    return f"{name}: {change}" if change else detail


def _unsettled(note: str, facts: dict[str, Any]) -> bool:
    """A note with numbers about something the configs also changed.

    The plain post has no writer to settle which number is final, so the configs speak alone.
    """
    if not re.search(r"\d", note):
        return False
    names: set[str] = set()
    for item in facts.get("files") or []:
        for entry in (item or {}).get("entries") or []:
            if not isinstance(entry, dict):
                continue
            names.add(str(entry.get("name") or ""))
            for detail in entry.get("details") or []:
                # A skill inside a class is a capitalised part of the path.
                names.update(part for part in str(detail).partition(": ")[0].split(".") if part[:1].isupper())
    return any(len(name) > 2 and re.search(rf"(?i)\b{re.escape(name)}", note) for name in names)


def fallback_messages(
    facts: dict[str, Any],
    *,
    week: str,
    label: str,
    act: str | None,
    page_url: str,
    notes: list[str] | None = None,
) -> list[str]:
    """A plain post from the staff notes and the facts, for when the writer is unavailable."""
    lines = title_lines(label, act) + [f"-# {week_line(week)}", "", "Here is what changed on the server this week."]
    plugins = [item for item in facts.get("plugins") or [] if isinstance(item, dict)]
    subjects = [
        _plain_subject(str(subject))
        for item in plugins
        for subject in item.get("commits") or []
        if _plain_subject(str(subject))
    ]
    notes = [note for note in notes or [] if not _unsettled(note, facts)]
    if notes:
        lines += ["", "## This week"] + [f"- {note}" for note in notes]
    if subjects:
        lines += ["", "## Changes"]
        lines += [f"- {subject}" for subject in subjects[:25]]
    entries = []
    for item in facts.get("files") or []:
        for entry in (item or {}).get("entries") or []:
            if not isinstance(entry, dict) or entry.get("name") == "settings":
                continue
            details = [_readable(str(detail)) for detail in entry.get("details") or []][:4]
            if entry.get("kind") == "added":
                entries.append(f"- **{entry.get('name')}** is new")
            elif entry.get("kind") == "removed":
                entries.append(f"- **{entry.get('name')}** was removed")
            elif details:
                entries.append(f"- **{entry.get('name')}:** " + "; ".join(details))
    if entries:
        lines += ["", "## Adjustments"] + entries[:40]
    if facts.get("hidden"):
        lines += ["", "-# There are also new things to discover."]
    lines += ["", f"-# Smaller and technical changes are on the website: <{page_url.rstrip('/')}/{week}>"]
    text = clean_message("\n".join(lines))
    return fit_messages([text])[:MAX_MESSAGES]
