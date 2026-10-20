import Link from "next/link";

import { Callout, CommandTable, DataTable, WikiItemLink, WikiSectionHeading } from "@/app/components/wiki";
import { factionGuildCommands } from "@/app/wiki/data";

import { Bullets, Cmd, FactionsGuidePage, P } from "../FactionsGuide";

export default function FactionsGuildsPage() {
  return (
    <FactionsGuidePage
      href="/wiki/factions/guilds"
      intro="Guilds are the businesses of a faction. They have their own leader, bank and capital, and they make the trade income that keeps the faction going."
    >
      <WikiSectionHeading id="guilds" intro="The faction leader runs the faction's own guild automatically.">
        Guilds
      </WikiSectionHeading>
      <Bullets>
        <li>
          Any member who is not the faction leader can <Cmd>/guild create &lt;name&gt;</Cmd>.
        </li>
        <li>
          Set a capital with <Cmd>/guild setcapital</Cmd> and a bank with <Cmd>/guild setbank</Cmd>. Your trade spreads
          out from the capital.
        </li>
        <li>
          Under Closed Borders, guilds can only invite players who are already in the faction. Open Borders lets them
          recruit from outside.
        </li>
        <li>
          Guild leaders can pay <strong>dividends</strong>: a share of the guild&apos;s daily profit split between its
          members. Set it in <Cmd>/guild menu</Cmd>.
        </li>
        <li>A guild can pledge a daily donation to the faction. A 10% fee is lost on top of the gift.</li>
        <li>
          If a guild leader dies with nobody to take over, the faction leader offers the guild to someone with{" "}
          <Cmd>/guild appoint</Cmd>.
        </li>
      </Bullets>
      <Callout variant="note" title="Elevate and evict">
        The faction leader can raise a guild into its own vassal faction (Elevate), or throw it out as a landless
        faction (Evict). Both cost Administrative Power. Evicting also costs stability.
      </Callout>

      <WikiSectionHeading
        id="branches"
        intro="Branches are the upgrades a guild buys from its bank. Each level costs more than the last."
      >
        Branches
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Branch" }, { header: "Who" }, { header: "What it does" }]}
        rows={[
          ["Guild Halls", "Player guilds", "Trade power: how far and how strongly your trade reaches."],
          [
            "Bureaucracy",
            "The faction's own guild",
            "Administrative Power and diplomatic capacity, plus a little trade and production.",
          ],
          ["Workshops", "All guilds", "Production: turns trade into more income in each province."],
          ["Storehouses", "All guilds", "Trade carry: trade travels further."],
          ["Counting Houses", "All guilds", "Lowers trade upkeep."],
        ]}
      />
      <P>Every branch level also adds 5 prestige to the faction.</P>

      <WikiSectionHeading id="nodes" intro="Production sites that turn out ores, crops, wood or stone.">
        Resource nodes
      </WikiSectionHeading>
      <Bullets>
        <li>
          Craft a <WikiItemLink name="General Node">General Node</WikiItemLink> and place it with a barrel directly
          below (inputs) and a hopper directly above (output). See{" "}
          <Link href="/wiki/dowsing" className="text-[var(--tfmc-accent)] underline underline-offset-2">
            Dowsing
          </Link>{" "}
          for finding good spots.
        </li>
        <li>
          You must be in a guild. A one-person guild is enough. Each guild can own one node, and each chunk hold one.
        </li>
        <li>Run it as an Ore Mine, Magical Mine, Farm, Plantation, Forestry or Quarry.</li>
        <li>
          Levels 1 to 10 are paid from the guild bank, and each level costs 4 denars a day. Stop the node before
          changing it.
        </li>
        <li>More guild members means a more efficient node.</li>
      </Bullets>

      <WikiSectionHeading id="trade" intro="Trade is where most faction money comes from.">
        How trade works
      </WikiSectionHeading>
      <Bullets>
        <li>
          Trade power spreads from your guild capital into nearby provinces. Farmland and plains carry it far, while
          hills, bogs and mountains slow it down.
        </li>
        <li>You earn from each province based on its prosperity and your share of the trade power there.</li>
        <li>
          Ports, airports and train stations carry trade much further, along sea lanes, air routes and railways between
          them.
        </li>
        <li>In foreign land, tariffs may apply, and laws and trade deals change how much you earn.</li>
      </Bullets>

      <WikiSectionHeading
        id="foreign"
        intro="Your guilds can use every installation in your realm. Foreign ones depend on deals and laws."
      >
        Using foreign installations
      </WikiSectionHeading>
      <Bullets>
        <li>
          A Trade Agreement gives full use both ways. An Unequal Treaty gives the leader full use and the subject half.
        </li>
        <li>
          Without a deal, the host&apos;s Economy law decides how open it is, and your own law adds or takes a little.
        </li>
        <li>War or an embargo closes them completely.</li>
      </Bullets>
      <DataTable
        columns={[
          { header: "Economy law" },
          { header: "Open to foreigners", align: "right" },
          { header: "Your guilds abroad", align: "right" },
        ]}
        rows={[
          ["Free Trade", "50%", "+10%"],
          ["Decentralized", "35%", "None"],
          ["Mercantilism", "15%", "+20%"],
          ["Protectionism", "10%", "None"],
          ["Isolationism", "Closed", "-25%"],
        ]}
      />

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={factionGuildCommands} />
    </FactionsGuidePage>
  );
}
