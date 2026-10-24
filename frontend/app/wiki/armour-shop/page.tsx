import Link from "next/link";
import {
  DataTable,
  CommandTable,
  ItemGallery,
  RankName,
  SeeAlso,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import { armourShopCommands, customSkinRanks, skinScrolls } from "../data/armour-shop";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function ArmourShopPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Armour Shop"
      intro={
        <>
          The Armour Shop changes how your armour, weapons and tools look. A skin changes only the look: the item keeps
          its stats.
        </>
      }
    >
      <WikiSectionHeading id="applying" intro="Open the shop anywhere with /armourshop.">
        Applying a skin
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Run <code className={code}>/armourshop</code> and choose Armour or Items, then a category.
        </li>
        <li>
          Armour skins are shown piece by piece: helmet, chestplate, leggings and boots. Each skin&apos;s tooltip shows
          the Skin Scroll it costs and the kind of item it fits, such as medium steel armour or swords.
        </li>
        <li>
          Click a piece. The shop skins the first item in your inventory that fits, whether you carry it or wear it, and
          uses up one scroll of that exact tier. A full armour set takes four clicks and four scrolls.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        If you don&apos;t have the right scroll, or nothing you carry fits, nothing is used up. Armour you forged in{" "}
        <Link href="/wiki/advanced-crafting" className={link}>
          Advanced Crafting
        </Link>{" "}
        only takes skins made for its metal. Forged weapons take any skin of their type.
      </p>
      <p className={`mt-3 ${body}`}>
        To undo an armour skin, use the free <strong>Reset to Default</strong> category. It has a plain look for leather
        and for every metal in light, medium, heavy, infantry and mage armour.
      </p>

      <WikiSectionHeading id="scrolls" intro="Each skin costs one scroll of a set tier. Some skins are free.">
        Skin Scrolls
      </WikiSectionHeading>
      <ItemGallery centeredSelectors selectorColumns={2} widePreview items={skinScrolls} />
      <p className={`mt-4 ${body}`}>
        You earn scrolls from the higher weekly activity rewards, from the daily reward ranked players get for revealing
        all their daily tasks, and from{" "}
        <Link href="/wiki/trial-rooms" className={link}>
          Trial Room
        </Link>{" "}
        loot. A higher tier never stands in for a lower one.
      </p>

      <WikiSectionHeading id="custom-skins" intro="Ranked players can design their own skins on the website.">
        Your own skins
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Get a code with <code className={code}>/token create skin</code>, or start a new skin from the Skins tab of
          your website profile. How often you can do this{" "}
          <Link href="/wiki/server-features" className={link}>
            depends on your rank
          </Link>
          .
        </li>
        <li>Upload your textures and name the skin. You can choose to rename the item to the skin&apos;s name.</li>
        <li>
          Once staff approve it, it appears after the next daily update in the shop&apos;s Player Armor or Player Items
          category. Only you can see it, and applying it costs no scroll.
        </li>
      </ol>
      <DataTable
        columns={[{ header: "Rank", nowrap: true }, { header: "What you can upload" }]}
        rows={customSkinRanks.map((r) => [<RankName key={r.rank} rank={r.rank} />, r.kinds])}
      />

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={armourShopCommands.commands} />

      <SeeAlso hrefs={["/wiki/advanced-crafting", "/wiki/server-features", "/wiki/commands"]} />
    </WikiPage>
  );
}
