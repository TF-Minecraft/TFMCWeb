import Link from "next/link";
import { DataTable, FurnitureGallery, SeeAlso, StationLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { carriableFurniture, furniture, furnitureRecipes } from "../data/furniture";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

export default function FurniturePage() {
  return (
    <WikiPage
      lastModified="2026-10-22"
      title="Interactive Furniture"
      intro={
        <>
          Cookware, troughs, tool shelves and display stands are furniture you place in the world and put items into.
          Most of them are used for{" "}
          <Link href="/wiki/cooking" className={link}>
            cooking
          </Link>
          .
        </>
      }
      width="lg"
    >
      <WikiSectionHeading id="use">Using furniture</WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <strong>Placing:</strong> hold the piece and right-click the floor. It faces you, and you can&apos;t turn it
          afterwards. The Tool Shelf goes on a wall, the Meat Hook on a ceiling, and the Fire Pit inside a Campfire or
          Soul Campfire.
        </li>
        <li>
          <strong>Filling:</strong> right-click a slot with an item to put one in. Right-click it with an empty hand to
          take it back out.
        </li>
        <li>
          <strong>Carrying:</strong> the {carriableFurniture.slice(0, -1).join(", ")} and {carriableFurniture.at(-1)}{" "}
          can be moved. Sneak and right-click with an empty hand to lift one, then right-click a block to set it down,
          or an Oven Top to slide it in.
        </li>
        <li>
          <strong>Picking up:</strong> empty the piece and your hand, then right-click it without sneaking. A Fire Pit
          or oven can&apos;t be picked up while something sits on it. Punching a piece, or breaking the block under it,
          drops it along with whatever is inside.
        </li>
      </ul>

      <WikiSectionHeading id="catalogue">Furniture pieces</WikiSectionHeading>
      <FurnitureGallery pieces={furniture} />

      <WikiSectionHeading id="crafting">Recipes</WikiSectionHeading>
      <DataTable
        columns={[{ header: "Pieces" }, { header: "Station" }, { header: "Cost" }, { header: "Time" }]}
        rows={furnitureRecipes.map((x) => [x.pieces, <StationLink key={x.station} name={x.station} />, x.cost, x.time])}
      />

      <SeeAlso hrefs={["/wiki/cooking", "/wiki/woodworking", "/wiki/stations"]} />
    </WikiPage>
  );
}
