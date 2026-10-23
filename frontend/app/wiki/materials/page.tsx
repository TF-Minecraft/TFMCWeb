import Link from "next/link";
import { SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { MATERIAL_GROUPS, materialCatalog, slugify } from "../data";

const body = "mt-3 text-sm text-[var(--tfmc-mist)]";
const link = "text-[var(--tfmc-accent)] hover:underline";

const sources: Array<[string, string, string]> = [
  [
    "Profession perks",
    "/wiki/classes#professions",
    "Crafter and Herborist perks make mining and logging drop extra materials.",
  ],
  ["Resource nodes", "/wiki/dowsing", "A node set to the right focus produces a material for its owners."],
  ["Crafting stations", "/wiki/stations", "Many materials are made from others, such as ingots and alchemy powders."],
  [
    "Fishing",
    "/wiki/fishing",
    "Any rod brings up metal fragments. Better rods also bring up graded leather, wool and feathers.",
  ],
  ["Animals", "/wiki/animal-husbandry", "Owned livestock give graded leather, wool and feathers."],
];

export default function MaterialsPage() {
  const materials = [...materialCatalog.values()];

  return (
    <WikiPage
      lastModified="2026-10-23"
      title="Materials"
      width="lg"
      intro="The custom materials you craft with. Open one to see where to find it and everything it makes."
    >
      <WikiSectionHeading id="sources">Where materials come from</WikiSectionHeading>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--tfmc-mist)]">
        {sources.map(([label, href, text]) => (
          <li key={label}>
            <Link href={href} className={link}>
              {label}
            </Link>
            : {text}
          </li>
        ))}
      </ul>
      <p className={body}>
        A recipe card shows any profession perk or class a recipe needs. Click an ingredient on a card to open its page.
      </p>

      {MATERIAL_GROUPS.map((group) => {
        const entries = materials.filter((m) => m.group === group);
        if (!entries.length) return null;
        return (
          <section key={group}>
            <WikiSectionHeading id={slugify(group)}>{group}</WikiSectionHeading>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {entries.map((m) => (
                <li key={m.name}>
                  <Link
                    href={`/wiki/materials/${m.slug}`}
                    title={m.lore}
                    className="group flex h-full items-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--tfmc-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_55%,transparent)] p-2 shadow-[0_2px_0_rgba(0,0,0,0.5)] transition-all duration-150 hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_4px_0_rgba(0,0,0,0.5),0_8px_14px_rgba(0,0,0,0.4)]"
                  >
                    {m.texture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.texture}
                        alt=""
                        className="h-8 w-8 shrink-0 [image-rendering:pixelated] transition-transform duration-150 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-8 w-8 shrink-0 border border-[color-mix(in_srgb,var(--tfmc-cream)_18%,transparent)]" />
                    )}
                    <span className="text-xs text-[var(--tfmc-stone)] group-hover:text-[var(--tfmc-cream)]">
                      {m.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <SeeAlso hrefs={["/wiki/stations", "/wiki/advanced-crafting", "/wiki/dowsing"]} />
    </WikiPage>
  );
}
