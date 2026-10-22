import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { stations } from "@/app/wiki/data/stations";
import AnimalHusbandryPage from "@/app/wiki/animal-husbandry/page";
import StationLink from "./StationLink";

describe("StationLink", () => {
  it("links every registered station name to its canonical route", () => {
    for (const station of stations) {
      const html = renderToStaticMarkup(<StationLink name={station.name} />);
      expect(html, station.name).toContain(`href="/wiki/stations/${station.slug}"`);
      expect(html, station.name).toContain(`>${station.name}</a>`);
    }
  });

  it("keeps the former Weapon Station name on the Forging Station route", () => {
    const html = renderToStaticMarkup(<StationLink name="Weapon Station" />);
    expect(html).toContain('href="/wiki/stations/weapon-station"');
    expect(html).toContain(">Forging Station</a>");
  });

  it("links the Animal Station mention in the real animal husbandry guide", () => {
    const html = renderToStaticMarkup(<AnimalHusbandryPage />);
    expect(html).toContain('href="/wiki/stations/animal-station"');
    expect(html.replace(/<[^>]+>/g, "")).toContain("Right-click an Animal Station to craft a Mount Whistle.");
  });
});
