import Link from "next/link";
import {
  Callout,
  DataTable,
  ItemGallery,
  SeeAlso,
  WikiItemLink,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import { gemSocketTypes, goldMaterials, goldTools, jewelleryProjects } from "../data/gem-infusion";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const subheading = "mt-6 text-sm font-semibold uppercase tracking-wide text-[var(--tfmc-mist)]";

export default function GemInfusionPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
      title="Gems & Goldsmithing"
      width="lg"
      intro="Blank gemstones are infused with a stat at an Enchanting Table. Infused gems go into the sockets of forged gear, or a goldsmith sets one in gold jewellery."
    >
      <WikiSectionHeading id="infusion">Infusing gems</WikiSectionHeading>
      <p className={body}>
        Anyone can infuse. You need blank gemstones and an <WikiItemLink name="Infusion Ticket" />, and any Enchanting
        Table works. Only items called Blank Gemstone can be infused. Ordinary Minecraft gems such as diamonds, emeralds
        and amethyst do nothing.
      </p>
      <p className={`mt-3 ${body}`}>
        Blank gemstones drop while you mine ore with the{" "}
        <Link href="/wiki/classes#professions" className={link}>
          Crafter
        </Link>{" "}
        perks Gemstone Miner I to IV, and while you chop logs and wood with the Herborist perks Tree Gatherer I to IV.
        Ore means the overworld ores, with coal ore and the deepslate versions included. Nether ores don&apos;t drop
        gemstones. Each tier of a perk adds the next kind: I gives Basic gemstones, II Polished, III Radiant and IV
        Mythical.
      </p>
      <p className={`mt-3 ${body}`}>
        Gemstone pouches come from{" "}
        <Link href="/wiki/fishing" className={link}>
          fishing
        </Link>
        ,{" "}
        <Link href="/wiki/infestations#loot" className={link}>
          infestation
        </Link>{" "}
        monsters,{" "}
        <Link href="/wiki/trial-rooms" className={link}>
          Trial Room
        </Link>{" "}
        chests and{" "}
        <Link href="/wiki/arcane-trace-detector" className={link}>
          Arcane Caches
        </Link>
        .{" "}
        <Link href="/wiki/gathering" className={link}>
          Gathering
        </Link>{" "}
        gives blank gemstones straight from gemstone spots, and its{" "}
        <Link href="/wiki/gathering#treasure" className={link}>
          treasure
        </Link>{" "}
        can be a Pouch of Basic or Polished Gemstones. Right-click a Pouch of Basic, Polished, Radiant or Mythical
        Gemstones to get 1 random gemstone of that kind.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>Right-click the Enchanting Table with a blank gemstone to put it in. A batch holds up to 10.</li>
        <li>
          Hold the ticket and left-click the table 5 times. The batch locks after the first hit, and the fifth hit uses
          up 1 ticket.
        </li>
        <li>The infused gems pop out above the table. A Legendary gem is announced to the whole server.</li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Each infused gem gets a random stat and a rarity name that shows how strong it is, such as Legendary Infused
        Ruby. Your character&apos;s Intelligence helps the stat come out better.
      </p>
      <p className={`mt-3 ${body}`}>
        Each gem also shows a Success Rate: the chance that it goes in when you{" "}
        <a href="#socketing" className={link}>
          socket
        </a>{" "}
        it. Infuse fewer gems at once for a chance at a higher Success Rate.
      </p>
      {gemSocketTypes.map(({ type, gems }) => (
        <section key={type}>
          <h3 className={subheading}>{type} gemstones</h3>
          <ItemGallery items={gems.map(({ name, texture }) => ({ name, image: texture }))} />
        </section>
      ))}
      <p className={`mt-3 ${body}`}>A blank Firestone becomes an infused Direstone.</p>

      <WikiSectionHeading id="socketing">Socketing</WikiSectionHeading>
      <p className={body}>
        Forged gear has 1 socket: Basic, Polished, Radiant or Mythical. Which one it gets depends on its{" "}
        <Link href="/wiki/advanced-crafting#quality" className={link}>
          quality
        </Link>{" "}
        at the Forging Station.
      </p>
      <p className={`mt-3 ${body}`}>A gem fits a socket of its own tier or any higher tier.</p>
      <DataTable
        className="mt-3"
        columns={[{ header: "Gem", nowrap: true }, { header: "Sockets it fits" }]}
        rows={[
          ["Basic", "Basic, Polished, Radiant and Mythical"],
          ["Polished", "Polished, Radiant and Mythical"],
          ["Radiant", "Radiant and Mythical"],
          ["Mythical", "Mythical only"],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        To socket a gem, open your inventory, pick up the infused gem and click it onto a forged weapon, armour piece or
        bow that has an empty socket it fits.
      </p>
      <ul className={`mt-3 list-disc space-y-1 pl-5 ${body}`}>
        <li>
          If it goes in, chat says &quot;You successfully applied <em>gem</em> onto your <em>item</em>.&quot;
        </li>
        <li>
          If it fails, the gem breaks and is lost. Chat says &quot;Your gem stone <em>gem</em> broke while trying to
          apply it onto <em>item</em>.&quot; The item is not harmed and its socket stays empty.
        </li>
      </ul>
      <h3 id="taking-a-gem-out" className={subheading}>
        Taking a gem out
      </h3>
      <p className={`mt-3 ${body}`}>
        To take a gem out, use an <WikiItemLink name="Unsocket Tool" />. It is made at the{" "}
        <Link href="/wiki/stations/tool-station" className={link}>
          Tool Station
        </Link>{" "}
        from 1 Iron Ingot and needs no perk. Pick it up in your inventory and click it onto the item, the same way you
        socket a gem. The tool is used up, and the gem comes back with its stat, name and rarity.
      </p>
      <p className={`mt-3 ${body}`}>
        A very old gem can refuse to come out. Chat then says &quot;The gems have bonded strongly with your item. Cannot
        remove.&quot;
      </p>
      <Callout title="A gem that looks blank">
        A gem you have just taken out can look like a Blank Gemstone for a moment. This fixes itself while the gem is in
        your inventory. If one still looks blank, right-click an Enchanting Table with it. Chat says &quot;This gem
        already holds an infusion. Its glow returns.&quot; and the gem gets its name back. It keeps its stat, is not
        infused again and uses no ticket.
      </Callout>

      <WikiSectionHeading id="goldsmithing">Goldsmithing</WikiSectionHeading>
      <Callout title="Goldsmith perk">
        Jewellery needs the <strong>Goldsmith</strong> perk (2 Crafter points). It also unlocks the goldsmith tools at
        the{" "}
        <Link href="/wiki/stations/tool-station" className={link}>
          Tool Station
        </Link>
        . Without it, the Smithing Table says &quot;You are not skilled enough to practise goldsmithing.&quot;
      </Callout>
      <p className={`mt-3 ${body}`}>
        Gold ore and deepslate gold ore can drop Rough, Moldable and Shiny Gold. The <strong>Gold Digger</strong> perk,
        which needs Goldsmith, makes those drops more likely.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Right-click an empty Smithing Table to open the Goldsmithing menu and pick a project. The menu shows how many
          gold materials each project takes, its tier and that it needs 1 infused gem.
        </li>
        <li>
          Right-click the table with gold to add it one piece at a time, then with 1 infused gem. Which golds you use is
          up to you, but the right mix scores better.
        </li>
        <li>
          Left-click the table with the Goldsmith Hammer, Goldsmith Small Hammer and Goldsmith Tinker Hammer. Not every
          piece needs all 3.
        </li>
        <li>
          Left-click with the <WikiItemLink name="Goldsmith Branding Tool" /> to finish. The piece drops onto the table.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        While you work, right-click with the Goldsmith Branding Tool to see your progress. Sneak and left-click with it
        to cancel and get your gold and gem back.
      </p>
      <p className={`mt-3 ${body}`}>
        When you finish, you see your Recipe, Hits and Total percentages, the quality of the piece (from Rusted up to
        Masterwork) and how much of the gem&apos;s stat it kept. Masterwork needs the correct gold mix and exact tool
        work. Overworking lowers the quality. Better work and a higher tier keep more of the gem&apos;s stat, and your
        character&apos;s Dexterity helps too. A rarer gem can sometimes raise the piece&apos;s stat further.
      </p>
      <p className={`mt-3 ${body}`}>
        Unfinished projects survive restarts. If someone breaks the Smithing Table, the gold and gem go to whoever broke
        it.
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
