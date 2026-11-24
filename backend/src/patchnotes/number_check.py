"""Find `Old --> New` numbers in a post that no change of the week shows.

Standard library only: the rewrite worker runs it on the host.
"""

from __future__ import annotations

import re

_NUMBER = r"-?\d[\d,]*(?:\.\d+)?"
_PAIR = re.compile(rf"(?<![\w.,])({_NUMBER})([^\d\n>|;]{{0,24}}?)-->[^\d\n|;-]{{0,12}}?({_NUMBER})")
# The same change in another unit: shares and percentages, ticks, minutes and hours.
_SCALES = (1.0, 100.0, 0.01, 20.0, 0.05, 60.0, 1 / 60, 24.0, 1 / 24)


def _value(text: str) -> float:
    return float(text.replace(",", ""))


def pairs(text: str) -> set[tuple[float, float]]:
    return {(_value(old), _value(new)) for old, _, new in _PAIR.findall(text)}


def _changes(prompt: str) -> set[tuple[float, float]]:
    """The number changes in the staff notes and the facts. The rules and earlier posts before them do not count."""
    starts = [prompt.find(heading) for heading in ("\n\nStaff notes for this week", "\n\nFacts:")]
    return pairs(prompt[min([start for start in starts if start >= 0], default=0):])


def _earlier(prompt: str) -> set[tuple[float, float]]:
    """The number changes earlier posts announced. Each post is a JSON list on its own line."""
    return pairs("\n".join(
        line.replace("\\n", "\n") for line in prompt.split("\n\nFacts:")[0].splitlines() if line.startswith('["')
    ))


def _close(first: float, second: float) -> bool:
    return abs(first - second) < 1e-6 * max(1.0, abs(second))


def _known(
    pair: tuple[float, float], changes: set[tuple[float, float]], earlier: set[tuple[float, float]]
) -> bool:
    if any(
        _close(pair[0] * scale, old) and _close(pair[1] * scale, new)
        for scale in _SCALES for old, new in changes
    ):
        return True
    # An earlier post said 18 --> 15 and the facts say 18 --> 11, so players read 15 --> 11.
    return any(new == pair[0] and (old, pair[1]) in changes for old, new in earlier)


def unconfirmed(messages: list, prompt: str) -> list[tuple[str, str]]:
    """Each line of the post with the number changes on it that the facts and notes do not show."""
    changes, earlier = _changes(prompt), _earlier(prompt)
    found: list[tuple[str, str]] = []
    for message in messages:
        for line in str(message).splitlines():
            missing = [
                f"{old:g} --> {new:g}" for old, new in sorted(pairs(line)) if not _known((old, new), changes, earlier)
            ]
            if missing:
                found.append((line.strip(), ", ".join(missing)))
    return found
