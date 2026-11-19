import type { EntityKind } from "./api";

/** A piece of lore text: plain text, or a link written as [[kind:id|Label]]. */
export type Segment =
  | { type: "text"; text: string }
  | { type: "mention"; kind: EntityKind; id: number; label: string; raw: string };

const KINDS = ["character", "organisation", "storyline", "event", "location"] as const;

// Mirrors TOKEN_RE in backend/src/lore/mentions.py.
const TOKEN = new RegExp(`\\[\\[(${KINDS.join("|")}):(\\d{1,18})(?:\\|([^\\]\\n]{0,200}))?\\]\\]`, "g");

export function parseMentions(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of (text ?? "").matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ type: "text", text: text.slice(last, at) });
    const id = Number(match[2]);
    out.push({
      type: "mention",
      kind: match[1] as EntityKind,
      id,
      label: (match[3] ?? "").trim() || `${match[1]} #${id}`,
      raw: match[0],
    });
    last = at + match[0].length;
  }
  if (last < (text ?? "").length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

/** The token for a link to `kind` #`id`, with a label the token can hold. */
export function mentionToken(kind: EntityKind, id: number, label: string): string {
  const clean = label
    .replace(/[\]\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return clean ? `[[${kind}:${id}|${clean}]]` : `[[${kind}:${id}]]`;
}

/**
 * The link being typed at the caret: text after an unclosed `[[` on the same line,
 * or null when the caret isn't inside one.
 */
export function openMention(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const start = before.lastIndexOf("[[");
  if (start < 0) return null;
  const query = before.slice(start + 2);
  if (query.includes("]]") || query.includes("\n") || query.length > 60) return null;
  return { start, query };
}

/** Replaces the open `[[query` that starts at `start` with a full token; returns the new text and caret. */
export function insertMention(
  text: string,
  start: number,
  caret: number,
  token: string,
): { text: string; caret: number } {
  const next = text.slice(0, start) + token + text.slice(caret);
  return { text: next, caret: start + token.length };
}
