import Link from "next/link";
import { Callout, ItemGallery, SeeAlso, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { gemSocketTypes, goldMaterials, goldTools, jewelleryProjects } from "../data/gem-infusion";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const subheading = "mt-6 text-sm font-semibold uppercase tracking-wide text-[var(--tfmc-mist)]";

export default function GemInfusionPage() {
  return (
    <WikiPage
      lastModified="2026-10-22"
      title="Gems & Goldsmithing"
      width="lg"
      intro="Blank gemstones are infused with a stat at an Enchanting Table. Infused gems go into the sockets of forged gear, or a goldsmith can set one in a piece of gold jewellery."
    >
      <WikiSectionHeading id="infusion">Infusing gems</WikiSectionHeading>
      <p className={body}>
        Anyone can infuse. You need blank gemstones and an <WikiItemLink name="Infusion Ticket" />, and any Enchanting
        Table will do. Ordinary vanilla gems don&apos;t work.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>Right-click the table with a blank gem to put it in. A batch holds up to 10.</li>
        <li>
          Hold the ticket and left-click the table five times. The batch locks after the first hit, and the fifth uses
          up one ticket.
        </li>
        <li>The infused gems pop out above the table. A Legendary gem is announced to the whole server.</li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Each infused gem rolls a stat and gets a rarity name from how good the roll is, such as Legendary Infused Ruby.
        It also gets a Success Rate for socketing. Bigger batches lower the best rate a gem can get.
      </p>
      <p className={`mt-3 ${body}`}>
        A gem only fits its own socket type: Basic, Polished, Radiant or Mythical. Forged gear gets its socket from its{" "}
        <Link href="/wiki/advanced-crafting#quality" className={link}>
          quality
        </Link>
        . Taking a gem out of a socket gives it back with its name and rarity. If you get a gem that was reset to blank,
        right-clicking a table with it restores it rather than infusing it again.
      </p>
      {gemSocketTypes.map(({ type, gems }) => (
        <section key={type}>
          <h3 className={subheading}>{type} gemstones</h3>
          <ItemGallery items={gems.map(({ name, texture }) => ({ name, image: texture }))} />
        </section>
      ))}
      <p className={`mt-3 ${body}`}>A blank Firestone becomes an infused Direstone.</p>

      <WikiSectionHeading id="goldsmithing">Goldsmithing</WikiSectionHeading>
      <Callout title="Goldsmith perk">
        Jewellery needs the <strong>Goldsmith</strong> perk (2 Crafter points). It also unlocks the goldsmith tools at
        the Tool Station.
      </Callout>
      <p className={`mt-3 ${body}`}>
        Gold ore can drop Rough, Moldable and Shiny Gold when mined. The <strong>Gold Digger</strong> perk, which needs
        Goldsmith, makes those drops more likely.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Right-click an empty Smithing Table and pick a project. The menu shows how many gold materials it takes and
          its tier.
        </li>
        <li>
          Right-click with gold to add it one piece at a time, then with one infused gem. Which golds you use is up to
          you, but the right mix scores better.
        </li>
        <li>
          Once all the gold and the gem are in, left-click with the hammers and the tinker hammer. Not every piece needs
          all three.
        </li>
        <li>
          Left-click with the <WikiItemLink name="Goldsmith Branding Tool" /> to finish. The piece drops on the bench.
          Right-click with it to see your progress, or sneak and left-click to cancel and get your gold and gem back.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        When you finish, you see your Recipe, Hits and Total percentages and the quality, from Rusted up to Masterwork.
        Better work and a higher tier keep more of the gem&apos;s stat. Benches in progress survive restarts. If someone
        breaks a bench, the gold and gem go to whoever broke it.
      </p>
      <Callout variant="warning" title="Golden Key">
        The Golden Key needs no gem, but it has to be made exactly: the right gold mix and the right hits. Anything else
        ruins it and the gold is lost.
      </Callout>

      <h3 className={subheading}>Gold</h3>
      <ItemGallery
        items={goldMaterials.map(({ id, name }) => ({ name, image: `/wiki/textures/materials/${id}.png` }))}
      />
      <h3 className={subheading}>Tools</h3>
      <ItemGallery
        items={goldTools.map(({ name, texture, use }) => ({
          name,
          image: `/wiki/textures/goldsmith-tools/${texture}.png`,
          detail: use,
        }))}
      />
      <h3 className={subheading}>Jewellery</h3>
      <ItemGallery
        items={jewelleryProjects.map(({ id, name, tier }) => ({
          name,
          image: `/wiki/textures/jewellery/${id}.png`,
          detail: `${tier} tier`,
        }))}
      />
      <SeeAlso hrefs={["/wiki/advanced-crafting", "/wiki/research", "/wiki/materials", "/wiki/stations"]} />
    </WikiPage>
  );
}
