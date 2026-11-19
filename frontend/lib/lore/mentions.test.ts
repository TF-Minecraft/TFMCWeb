import { describe, expect, it } from "vitest";

import { insertMention, mentionToken, openMention, parseMentions } from "./mentions";

describe("parseMentions", () => {
  it("splits text and links", () => {
    expect(parseMentions("Meet [[character:12|Aldric]] at [[location:3]].")).toEqual([
      { type: "text", text: "Meet " },
      { type: "mention", kind: "character", id: 12, label: "Aldric", raw: "[[character:12|Aldric]]" },
      { type: "text", text: " at " },
      { type: "mention", kind: "location", id: 3, label: "location #3", raw: "[[location:3]]" },
      { type: "text", text: "." },
    ]);
  });

  it("leaves unknown kinds and broken tokens as text", () => {
    expect(parseMentions("[[player:1|x]] [[character:abc]]")).toEqual([
      { type: "text", text: "[[player:1|x]] [[character:abc]]" },
    ]);
    expect(parseMentions("")).toEqual([]);
  });
});

describe("mentionToken", () => {
  it("cleans labels the token can't hold", () => {
    expect(mentionToken("event", 4, "The ]] Feast\nnight")).toBe("[[event:4|The Feast night]]");
    expect(mentionToken("storyline", 9, "  ")).toBe("[[storyline:9]]");
    expect(parseMentions(mentionToken("organisation", 2, "A|B"))[0]).toMatchObject({ id: 2, label: "A|B" });
  });
});

describe("openMention", () => {
  it("finds the link being typed", () => {
    expect(openMention("see [[Ald", 9)).toEqual({ start: 4, query: "Ald" });
    expect(openMention("see [[Ald]] now", 15)).toBeNull();
    expect(openMention("[[a\nb", 5)).toBeNull();
    expect(openMention("plain", 5)).toBeNull();
  });

  it("inserts a token in place of the query", () => {
    expect(insertMention("see [[Ald and", 4, 9, "[[character:1|Aldric]]")).toEqual({
      text: "see [[character:1|Aldric]] and",
      caret: 26,
    });
  });
});
