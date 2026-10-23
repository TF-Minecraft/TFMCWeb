import {
  Callout,
  DataTable,
  SeeAlso,
  StationLink,
  WikiItemLink,
  WikiPage,
  WikiSectionHeading,
  WoodworkingGallery,
} from "@/app/components/wiki";
import Link from "next/link";
import {
  woodworkingActions,
  woodworkingCategories,
  woodworkingMaterials,
  woodworkingProjects,
} from "../data/woodworking";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

export default function WoodworkingPage() {
  return (
    <WikiPage
      lastModified="2026-10-22"
      title="Woodworking"
      intro={`Woodworkers carve decorative furniture at a Woodworking Station: ${woodworkingProjects.length} pieces in ${woodworkingCategories.length} styles.`}
      width="lg"
    >
      <Callout title="Artisan perk">
        You need the Herborist perk <strong>Artisan</strong> (4 points) to use a Woodworking Station. Without it you get
        &quot;You are not skilled enough to work wood.&quot; The perk also unlocks the woodworking tools at the{" "}
        <StationLink name="Tool Station" />.
      </Callout>

      <WikiSectionHeading id="making">Making a piece</WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>Right-click an idle Woodworking Station, choose a style, then a piece.</li>
        <li>
          Right-click the station with materials to add them one at a time. The title shows how many of each material
          type the piece still needs, but not which ones.
        </li>
        <li>
          Once all the materials are in, left-click the station with the tools. The title counts tools by group (see the
          table below), so full counts don&apos;t mean you used the right tools.
        </li>
        <li>
          Left-click with the <WikiItemLink name="Branding Tool" /> to finish. The piece appears on top of the station.
          Right-click with it to see your progress, or sneak and left-click to cancel and get your materials back.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Finishing shows your Recipe, Hits and Total percentages. Only exact work makes the piece: the right materials,
        and the right number of hits with each tool. If either is off, it is ruined and the materials are lost. If
        someone breaks the station mid-project, the materials go to whoever broke it.
      </p>

      <WikiSectionHeading id="materials">Materials</WikiSectionHeading>
      <p className={body}>
        {woodworkingMaterials.map((name, i) => (
          <span key={name}>
            {i ? ", " : ""}
            <WikiItemLink name={name}>{name}</WikiItemLink>
          </span>
        ))}
        .
      </p>
      <p className={`mt-3 ${body}`}>
        With the Herborist perk Tree Gatherer III, chopping any log or wood block can drop them. A{" "}
        <Link href="/wiki/dowsing" className={link}>
          Forestry node
        </Link>{" "}
        set to Rare Wood produces them too, once it has Diamond Axes or better. Spare wood sells at a{" "}
        <Link href="/wiki/economy#market-blocks" className={link}>
          Market Block
        </Link>
        .
      </p>

      <WikiSectionHeading id="tools">Tools</WikiSectionHeading>
      <DataTable
        columns={[{ header: "Action" }, { header: "Tool" }, { header: "Counts as" }]}
        rows={woodworkingActions.map((row) => [
          row.action,
          <WikiItemLink key={row.tool} name={row.tool}>
            {row.tool}
          </WikiItemLink>,
          row.group,
        ])}
      />

      <WikiSectionHeading id="catalogue">Furniture pieces</WikiSectionHeading>
      <WoodworkingGallery categories={woodworkingCategories} projects={woodworkingProjects} />

      <SeeAlso hrefs={["/wiki/furniture", "/wiki/advanced-crafting", "/wiki/stations"]} />
    </WikiPage>
  );
}
