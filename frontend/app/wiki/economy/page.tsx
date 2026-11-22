import Link from "next/link";
import {
  Callout,
  CommandTable,
  DataTable,
  ItemGallery,
  SeeAlso,
  WikiItemText,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import { denarCoins, denarCommands, marketBlockRecipe, marketGoods } from "../data/economy";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function EconomyPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
      title="Money & Market Blocks"
      intro={
        <>
          The server&apos;s money is the <strong>denar</strong> (d). 1 gold denar is worth 100 silver denars. Each of
          your characters has its own pouch and bank.
        </>
      }
    >
      <WikiSectionHeading id="accounts" intro="Each character has 2 balances. Check both with /deco bal.">
        Pouch and bank
      </WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Your <strong>pouch</strong> is the money you carry. Coins you pick up and money you earn go here, and you pay
          from it.
        </li>
        <li>
          Your <strong>bank</strong> is your savings. You can only move money in or out while standing at the bank of
          your faction or guild, so you need to belong to one. Use{" "}
          <code className={code}>/deco deposit &lt;amount&gt;</code> and{" "}
          <code className={code}>/deco withdraw &lt;amount&gt;</code>.
        </li>
      </ul>
      <Callout variant="warning">
        If another player kills you, your whole pouch drops as coins where you fell, for anyone to pick up. Your bank is
        never touched. Other deaths, and deaths in a scheduled battle, don&apos;t cost you your pouch.
      </Callout>

      <p className={`mt-3 ${body}`}>
        When a character dies permanently, their pouch and bank pass to their heir. Set this up in your{" "}
        <Link href="/wiki/characters#wills" className={link}>
          will
        </Link>
        .
      </p>

      <WikiSectionHeading id="coins" intro="Coins are real items you can hand over, hide or lose.">
        Coins
      </WikiSectionHeading>
      <ItemGallery
        centeredSelectors
        items={denarCoins.map((coin) => ({ name: coin.name, image: coin.image, detail: coin.value }))}
      />
      <ul className={`mt-4 list-disc space-y-2 pl-5 ${body}`}>
        <li>Picking up coins puts them straight into your pouch, even with a full inventory.</li>
        <li>
          <code className={code}>/deco toitem &lt;amount&gt;</code> turns pouch money into coins, and{" "}
          <code className={code}>/deco topouch</code> puts the coins in your hand back. It refuses coins that dropped
          from mining, chopping, harvesting or a PvP death and were moved into a chest by a hopper. Drop those and pick
          them up instead.
        </li>
        <li>
          To pay someone, drop coins for them to pick up, or use <code className={code}>/deco pay &lt;amount&gt;</code>{" "}
          to throw that amount on the ground in front of you as coins.
        </li>
      </ul>

      <WikiSectionHeading id="earning">Earning money</WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Mining stone or deepslate, chopping logs and harvesting fully grown wheat, carrots, potatoes or beetroot
          sometimes drops a few coins. Fortune makes it more likely.
        </li>
        <li>
          Sell raw goods at a{" "}
          <a href="#market-blocks" className={link}>
            Market Block
          </a>
          .
        </li>
        <li>
          Stand at your faction&apos;s or guild&apos;s bank, hold a stack of <strong>Gold Ingots</strong> and
          right-click. The whole stack is paid into your bank at 1 d an ingot, minus your citizen tax. You need to be in
          a guild, and your faction&apos;s main guild counts. Anywhere else a Gold Ingot is an ordinary item.
        </li>
        <li>
          Trade with other players, or sign on with a{" "}
          <Link href="/wiki/war#mercenaries" className={link}>
            mercenary company
          </Link>
          .
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Your faction takes its citizen tax from money you earn, including coins someone else dropped and Market Block
        sales. The chat message shows how much. Picking up coins you dropped yourself is not taxed, but coins spilled
        from your pouch on a PvP death are taxed even when you pick them back up.
      </p>

      <WikiSectionHeading id="market-blocks" intro="A Market Block buys raw goods for denars. It never sells anything.">
        Market Blocks
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>Craft a Market Block at a crafting table and place it, or use one someone else placed.</li>
        <li>Right-click it and pick a category: Metal, Mineral, Stone, Wood, Farm, Fish or Alchemy.</li>
        <li>
          Each good shows its current price and a demand bar. Click it to sell one bundle from your inventory. The money
          goes into your pouch.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Prices are shared by every Market Block on the server. Each sale lowers that good&apos;s price a little, and
        demand recovers a little every 4 hours. A good nobody has sold for a while can pay up to twice its usual price.
        Food that is no longer fresh sells for less: half when stale, a tenth when rotten.
      </p>
      <DataTable
        columns={[
          { header: "Category", nowrap: true },
          { header: "Goods" },
          { header: "Bundle", align: "right" },
          { header: "Usual price", align: "right", nowrap: true },
        ]}
        rows={marketGoods.map((good) => [
          good.category,
          <WikiItemText key={good.goods} text={good.goods} />,
          good.bundle,
          good.price,
        ])}
      />
      <div className="mt-4">
        <CraftingGrid recipe={marketBlockRecipe} />
      </div>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={denarCommands.commands} />

      <SeeAlso hrefs={["/wiki/factions", "/wiki/guilds", "/wiki/materials", "/wiki/commands"]} />
    </WikiPage>
  );
}
