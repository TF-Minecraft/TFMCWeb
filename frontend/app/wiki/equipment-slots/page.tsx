import Link from "next/link";
import { Callout, DataTable, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";

const body = "text-sm text-[var(--tfmc-mist)]";
const link = "text-[var(--tfmc-accent)] hover:underline";

export default function EquipmentSlotsPage() {
  return (
    <WikiPage
      lastModified="2026-10-22"
      title="Equipment Slots"
      intro="Your inventory has four extra slots for jewellery: one ring, one amulet and two artifacts."
    >
      <WikiSectionHeading id="slots">The four slots</WikiSectionHeading>
      <p className={body}>
        Press E to open your inventory. The first four spaces of the top storage row are accessory slots, so you have
        four fewer spaces for ordinary items. Drag an accessory onto its slot, or click it in.
      </p>
      <div className="mt-4">
        <DataTable
          columns={[{ header: "Slot" }, { header: "Takes" }]}
          rows={[
            ["Ring", "One ring"],
            ["Amulet", "One necklace or pendant"],
            ["Artifact (two slots)", "Medals, mirrors, chalices, bracelets and other jewellery artifacts"],
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
          Gem Infusion
        </Link>{" "}
        for every piece and how to make it.
      </p>
      <SeeAlso hrefs={["/wiki/gem-infusion", "/wiki/classes"]} />
    </WikiPage>
  );
}
