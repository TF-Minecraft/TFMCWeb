import Link from "next/link";
import { DataTable, SeeAlso, WikiItemText, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { slugify, STATION_GROUPS, stations } from "@/app/wiki/data";

const body = "mt-3 text-sm text-[var(--tfmc-mist)]";

export default function StationsPage() {
  return (
    <WikiPage
      lastModified="2026-10-23"
      title="Crafting Stations"
      intro="Most custom items are made at a station rather than a crafting table. Open a station's page for its recipes."
      width="lg"
    >
      <WikiSectionHeading id="basics">How stations work</WikiSectionHeading>
      <p className={body}>
        Some stations are blocks you craft on a crafting table and place. Others are ordinary blocks, such as a blast
        furnace or a jukebox, that double as a station. On those, sneak and right-click to open the station, so a plain
        right-click still uses the block normally. The fletching table and brewing stand open with a plain right-click
        instead.
      </p>
      <p className={body}>
        A recipe can need a profession perk or a class, and most take a few seconds to craft. The recipe card on the
        station&apos;s page shows both. Vehicles from the Engineering Table and Dockyard are the exception: they take
        hours or days to build.
      </p>

      {STATION_GROUPS.map((group) => {
        const entries = stations.filter((station) => station.group === group);
        if (!entries.length) return null;
        return (
          <section key={group}>
            <WikiSectionHeading id={slugify(group)}>{group}</WikiSectionHeading>
            <DataTable
              className="mt-4"
              minWidth="40rem"
              rowKey={(_row, index) => entries[index].slug}
              columns={[
                { header: "Station", width: "12rem" },
                { header: "Block", width: "11rem" },
                { header: "Open with", width: "10rem" },
                { header: "What it's for" },
              ]}
              rows={entries.map((station) => [
                <Link
                  key="name"
                  href={`/wiki/stations/${station.slug}`}
                  className="text-[var(--tfmc-accent)] underline underline-offset-2"
                >
                  {station.name}
                </Link>,
                station.vanillaBlock?.name ?? "Its own block",
                station.interaction === "Shift + Right click" ? "Sneak + right-click" : "Right-click",
                <WikiItemText key="blurb" text={station.blurb} excludeHref={`/wiki/stations/${station.slug}`} />,
              ])}
            />
          </section>
        );
      })}

      <SeeAlso hrefs={["/wiki/materials", "/wiki/advanced-crafting", "/wiki/commands"]} />
    </WikiPage>
  );
}
