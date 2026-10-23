import type { WikiCommandSet, WikiSection } from "./types";

// Source: Codex v2.14.0 on Main, its live `plugins/Codex` categories and config, and the
// ConditionalEvents that unlock entries. Entry names and unlock triggers stay off the page.

export const codexCommands: WikiCommandSet = {
  system: "Codex",
  href: "/wiki/codex",
  commands: [{ command: "/codex", description: "Opens your discovery journal.", notes: "Needs an active character." }],
};
export const codexSection: WikiSection = {
  nav: {
    href: "/wiki/codex",
    label: "Codex",
    category: "magic",
    blurb: "Your journal of places, research, important figures and achievements.",
  },
  commands: codexCommands,
};
