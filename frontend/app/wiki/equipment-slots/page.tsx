import Link from "next/link";
import { Callout, DataTable, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";

const body = "text-sm text-[var(--tfmc-mist)]";
const link = "text-[var(--tfmc-accent)] hover:underline";

export default function EquipmentSlotsPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
      title="Equipment Slots"
      intro="Your inventory has 4 extra slots for jewellery: 1 ring, 1 amulet and 2 artifacts."
    >
      <WikiSectionHeading id="slots">The 4 slots</WikiSectionHeading>
      <p className={body}>
        Press E to open your inventory. The first 4 spaces of the top storage row are accessory slots, so you have 4
        fewer spaces for ordinary items. Drag an accessory onto its slot, or click it in.
      </p>
      <div className="mt-4">
        <DataTable
          columns={[{ header: "Slot" }, { header: "Takes" }]}
          rows={[
            ["Ring", "1 ring"],
            ["Amulet", "1 necklace or pendant"],
            ["Artifact (2 slots)", "Medals, mirrors, chalices, bracelets and other jewellery artifacts"],
          ]}
        />
      </div>
      <p className={`mt-3 ${body}`}>
        Each slot only takes its own kind of accessory, and a stacked item cannot be equipped.
      </p>
      <Callout className="mt-4">
        Magic artifacts are a different kind of item and do not fit the Artifact slots.
      </Callout>

      <WikiSectionHeading id="getting-accessories">Getting accessories</WikiSectionHeading>
      <p className={body}>
        Goldsmiths make rings, necklaces and jewellery artifacts around an infused gemstone, and the quality of the work
        sets the accessory&apos;s stats. See{" "}
        <Link href="/wiki/gem-infusion#goldsmithing" className={link}>
          Gems &amp; Goldsmithing
        </Link>{" "}
        for every piece and how to make it.
      </p>
      <SeeAlso hrefs={["/wiki/gem-infusion", "/wiki/classes"]} />
    </WikiPage>
  );
}
