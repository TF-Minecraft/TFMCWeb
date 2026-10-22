import Link from "next/link";

import { DataTable, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import StationModelViewer from "@/app/components/wiki/StationModelViewer";
import { generalNodeModel, generalNodeRecipe, nodeLevels, nodeTypes } from "../data/dowsing";

const body = "text-sm text-[var(--tfmc-mist)]";
const link = "text-[var(--tfmc-accent)] hover:underline";

export default function DowsingPage() {
  return (
    <WikiPage
      lastModified="2026-10-22"
      title="Resource Nodes"
      intro="A node is a guild's mine, farm, forestry or quarry. Your guild stocks it with tools and other fittings, and it keeps producing resources for as long as it stays active."
      width="lg"
    >
      <WikiSectionHeading id="node">The General Node</WikiSectionHeading>
      <p className={body}>
        Anyone can craft a General Node at a crafting table, but only a member of a{" "}
        <Link href="/wiki/factions" className={link}>
          guild
        </Link>{" "}
        can set one up. A one-person guild is enough. Each guild can run one node, and each chunk can hold one node.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <CraftingGrid recipe={generalNodeRecipe} />
        <StationModelViewer modelUrl={generalNodeModel.url} textureUrls={generalNodeModel.textures} />
      </div>

      <WikiSectionHeading id="setup">Setting up a node</WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>Place the node on the floor and right-click it to open its menu.</li>
        <li>Pick a node type, then a production focus and fittings such as tools, a refinery, light or irrigation.</li>
        <li>
          Put a barrel directly under the node and fill it with what the fittings use. Put a hopper directly above it to
          collect the output. The node will not start without both.
        </li>
        <li>Activate the node. The guild bank must hold at least one day&apos;s upkeep.</li>
      </ol>
      <p className={`mt-3 ${body}`}>
        The node takes its fitting materials from the barrel when you activate it and again every 24 hours. If the
        barrel or hopper is missing at that point, the node shuts off. Output goes into the hopper, and only spills on
        top of the node once the hopper is full.
      </p>
      <p className={`mt-3 ${body}`}>
        The node must be inactive before you change its type, focus or fittings, change its level, or delete it.
        Deactivating refunds the barrel materials taken since the last output, as long as the barrel and hopper are both
        still there.
      </p>

      <WikiSectionHeading id="types">Node types</WikiSectionHeading>
      <DataTable
        columns={[
          { header: "Type" },
          { header: "Production focus" },
          { header: "Fittings" },
          { header: "Base cycle", align: "right", nowrap: true },
        ]}
        rows={nodeTypes.map((type) => [type.name, type.focuses.join(", "), type.fittings.join(", "), type.cycle])}
      />
      <p className={`mt-3 ${body}`}>
        The focus decides what the node produces. Fittings mostly change how long a cycle takes, and better fittings are
        faster. Only steel, abyssalite and mythril tools raise the yield, while stone and iron tools sometimes produce
        nothing. Some choices need another one first:
      </p>
      <ul className={`mt-3 list-disc space-y-1 pl-5 ${body}`}>
        <li>
          Gemstone and Artifact mines need diamond tools or better, and Rare Wood Forestry needs diamond axes or better.
        </li>
        <li>Fruit orchards and spice plantations need basic irrigation or better.</li>
        <li>Advanced Fertilizer needs steam-powered irrigation.</li>
      </ul>

      <WikiSectionHeading id="efficiency">Efficiency</WikiSectionHeading>
      <p className={body}>
        A node&apos;s efficiency, shown in its menu, also sets the cycle length: at 0% a cycle takes four times as long
        as at 100%. A new node starts at 50%. Efficiency rises by 0.1% per guild member each hour, up to 1% an hour, and
        is capped at 25% per member, so a guild needs four members to reach 100%. Changing the node type costs 40%.
      </p>

      <WikiSectionHeading id="levels">Levels and upkeep</WikiSectionHeading>
      <p className={body}>
        Upgrades are paid in denars from the guild bank, and each level shortens the cycle and adds faction prestige.
        Downgrading refunds 80% of that level&apos;s cost. The figures below are the cost of reaching each level from
        the one before.
      </p>
      <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {nodeLevels.map((row) => (
          <li
            key={row.level}
            className="rounded-md border border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_55%,transparent)] px-3 py-2.5 text-center"
          >
            <p className="text-xs uppercase tracking-wide text-[var(--tfmc-mist)]">Level {row.level}</p>
            <p className="mt-1 text-base font-semibold tabular-nums text-[var(--tfmc-cream)]">
              {row.level === 1 ? "Starting level" : row.cost}
            </p>
          </li>
        ))}
      </ol>
      <p className={`mt-3 ${body}`}>
        An active node also costs upkeep, taken from the guild bank at the start of each new day. Upkeep is 4 denars a
        day per level, plus extra for the focus and fittings.
      </p>

      <WikiSectionHeading id="manage">Transferring or deleting</WikiSectionHeading>
      <p className={body}>
        Only members of the owning guild can change a node. <strong>Transfer Node</strong> makes it claimable: the next
        guild leader who uses it takes it over, if their guild has no node yet. <strong>Delete Node</strong> cannot be
        undone. You get the node block back and any output it was holding, but its level and fittings are lost.
      </p>

      <SeeAlso hrefs={["/wiki/factions", "/wiki/economy", "/wiki/farming"]} />
    </WikiPage>
  );
}
