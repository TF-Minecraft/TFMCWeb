// @vitest-environment node
/// <reference types="vite/client" />

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { factionGuidePages, navItems } from "../data";

type PageModule = { default: () => React.ReactNode };

const pageModules = import.meta.glob("./*/page.tsx", { eager: true }) as Record<string, PageModule>;

function hrefForModule(modulePath: string) {
  const slug = modulePath.match(/^\.\/([^/]+)\/page\.tsx$/)?.[1];
  if (!slug) throw new Error(`Unexpected factions page module path: ${modulePath}`);
  return `/wiki/factions/${slug}`;
}

const subpages = Object.entries(pageModules)
  .map(([modulePath, module]) => ({ href: hrefForModule(modulePath), module }))
  .sort((a, b) => a.href.localeCompare(b.href));

const knownRoutes = new Set([...navItems.map((item) => item.href), ...factionGuidePages.map((page) => page.href)]);

describe("factions guide", () => {
  it("lists every subpage exactly once", () => {
    expect(factionGuidePages.map((page) => page.href).sort()).toEqual(subpages.map((page) => page.href));
  });

  it.each(subpages)("renders $href with one title, a way back and valid links", ({ href, module }) => {
    const html = renderToStaticMarkup(module.default() as React.ReactElement);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('href="/wiki/factions"');

    const links = [...html.matchAll(/href="(\/wiki[^"#]*)"/g)].map((match) => match[1].replace(/\/$/, ""));
    for (const target of links) {
      expect(knownRoutes.has(target) || target.startsWith("/wiki/items/"), `${href} links to ${target}`).toBe(true);
    }
  });
});
