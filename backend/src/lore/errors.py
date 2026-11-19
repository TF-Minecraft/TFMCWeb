from __future__ import annotations

from typing import Any


class LoreError(Exception):
    """A refusal with an HTTP status and a stable code the frontend maps to a message."""

    def __init__(self, status: int, code: str, extra: dict[str, Any] | None = None):
        super().__init__(code)
        self.status = status
        self.code = code
        self.extra = extra

    @property
    def detail(self) -> str | dict[str, Any]:
        if self.extra:
            return {"code": self.code, **self.extra}
        return self.code


def not_found() -> LoreError:
    return LoreError(404, "not_found")


def bad(code: str) -> LoreError:
    return LoreError(400, code)
