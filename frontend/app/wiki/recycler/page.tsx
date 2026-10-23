import Link from "next/link";
import { DataTable, SeeAlso, StationLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import { recyclingStationRecipe } from "../data/recycler";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

const returns = [
  [
    <Link key="ac" href="/wiki/advanced-crafting" className={link}>
      Forged weapons and armour
    </Link>,
    "Up to half the materials. An alloy comes back as its base metal or wood and its crystals.",
  ],
  ["Guns", "Up to half the materials the gun was made from. Broken guns and guns made before tracking began can't."],
  [
    <Link key="magic" href="/wiki/mage-weapons" className={link}>
      Mage weapons
    </Link>,
    "Up to half the materials paid to craft it. Take any runes out first. Broken ones can't.",
  ],
  [
    <Link key="gold" href="/wiki/gem-infusion" className={link}>
      Gold jewellery
    </Link>,
    "Up to half the gold. The gem is not returned.",
  ],
  ["Spell runes", "2, 4, 6 or 8 Enchanted Dust (Minor to Ascendant)."],
  ["Armour runes", "4, 8, 12 or 16 Enchanted Dust (Minor to Ascendant)."],
  ["Artifacts", "Enchanted Dust by rarity: 4, 8, 12, 16 or 28 (Common to Legendary). Any stored aura is lost."],
  ["Spent husks", "Half an artifact's dust: 2, 4, 6, 8 or 14."],
  [
    "Unusable Scrap",
    "Each material in it has a chance to come back; its tooltip shows the odds. The scrap is used up either way.",
  ],
];

export default function RecyclerPage() {
  return (
    <WikiPage
      lastModified="2026-10-22"
      title="Recycling"
      intro={
        <>
          The <StationLink name="Recycling Station" /> breaks crafted gear back down into some of the materials that
          made it.
        </>
      }
    >
      <WikiSectionHeading id="loop">Recycling an item</WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>Right-click the station to open it.</li>
        <li>
          Click the item in your inventory to move it in. Click it again in the station to take it back. Items that
          can&apos;t be recycled, or that are unbreakable, are refused.
        </li>
        <li>The right side of the menu shows what you would get back.</li>
        <li>
          Click the confirm button in the top-left corner. The materials pop out of the station, and anyone nearby can
          grab them.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Gear returns at most half of what went into it, less the more worn it is. Each material is rounded down, so a
        material that went in only once won&apos;t come back, and fully broken gear gives nothing. If nothing would come
        back, confirming tells you so and you keep the item. If you close the menu with an item still in it, you get the
        item back. With a full inventory, it waits for your character until you have room.
      </p>

      <WikiSectionHeading id="what-recycles">What you get back</WikiSectionHeading>
      <DataTable columns={[{ header: "Item" }, { header: "Returns" }]} rows={returns} />
      <p className={`mt-3 ${body}`}>Vanilla items can&apos;t be recycled.</p>

      <WikiSectionHeading id="building">Building the station</WikiSectionHeading>
      <p className={body}>Made on a crafting table and placed on the floor.</p>
      <div className="mt-4">
        <CraftingGrid recipe={recyclingStationRecipe} />
      </div>

      <SeeAlso hrefs={["/wiki/advanced-crafting", "/wiki/mage-weapons", "/wiki/materials", "/wiki/stations"]} />
    </WikiPage>
  );
}
