/** Minecraft colour codes (&6, §c, &#rrggbb, &l ...) for rank names and prefixes. */

const COLOURS: Record<string, string> = {
  "0": "#000000",
  "1": "#0000AA",
  "2": "#00AA00",
  "3": "#00AAAA",
  "4": "#AA0000",
  "5": "#AA00AA",
  "6": "#FFAA00",
  "7": "#AAAAAA",
  "8": "#555555",
  "9": "#5555FF",
  a: "#55FF55",
  b: "#55FFFF",
  c: "#FF5555",
  d: "#FF55FF",
  e: "#FFFF55",
  f: "#FFFFFF",
};

export type McSegment = {
  text: string;
  colour: string | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
};

/** Split "&6Noble &lLord" (or § codes, or &#rrggbb) into styled runs. Unknown codes stay as text. */
export function parseMcText(text: string): McSegment[] {
  const out: McSegment[] = [];
  let style = { colour: null as string | null, bold: false, italic: false, underline: false, strike: false };
  let buffer = "";
  const flush = () => {
    if (buffer) out.push({ text: buffer, ...style });
    buffer = "";
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if ((ch === "&" || ch === "§") && i + 1 < text.length) {
      const hex = /^#[0-9a-fA-F]{6}$/.exec(text.slice(i + 1, i + 8));
      if (hex) {
        flush();
        style = { colour: hex[0].toUpperCase(), bold: false, italic: false, underline: false, strike: false };
        i += 7;
        continue;
      }
      const code = text[i + 1].toLowerCase();
      if (code in COLOURS || "lmnokr".includes(code)) {
        flush();
        if (code in COLOURS)
          style = { colour: COLOURS[code], bold: false, italic: false, underline: false, strike: false };
        else if (code === "l") style = { ...style, bold: true };
        else if (code === "o") style = { ...style, italic: true };
        else if (code === "n") style = { ...style, underline: true };
        else if (code === "m") style = { ...style, strike: true };
        else if (code === "r") style = { colour: null, bold: false, italic: false, underline: false, strike: false };
        i += 1;
        continue;
      }
    }
    buffer += ch;
  }
  flush();
  return out;
}

export function stripMcText(text: string): string {
  return parseMcText(text)
    .map((segment) => segment.text)
    .join("");
}
