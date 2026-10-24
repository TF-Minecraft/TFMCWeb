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
      lastModified="2026-10-24"
      title="Money & Market Blocks"
      intro={
        <>
          The server&apos;s money is the <strong>denar</strong> (d). One gold denar is worth 100 silver denars. Each of
          your characters has its own money, so switching character switches purse.
        </>
      }
    >
      <WikiSectionHeading id="accounts" intro="Each character has two balances. Check both with /deco bal.">
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

      <p className={body}>
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
          <code className={code}>/deco topouch</code> puts the coins in your hand back. If the command refuses coins
          taken from a hopper or chest, drop them and pick them up yourself.
        </li>
        <li>
          To pay someone, drop coins for them to pick up, or use <code className={code}>/deco pay &lt;amount&gt;</code>{" "}
          to toss that much forward from eye level.
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
          Holding <strong>Gold Ingots</strong>, right-click at your faction&apos;s or guild&apos;s bank to bank the
          whole stack at 1 d each. Gold Ingots picked up anywhere else are just gold.
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
        Money you earn, including coins someone else dropped, is subject to your faction&apos;s citizen tax. The chat
        line shows the tax. Picking up coins you dropped yourself is not taxed, but coins spilled from your pouch on a
        PvP death are taxed even when you pick them back up.
      </p>

      <WikiSectionHeading
        id="market-blocks"
        intro="A Market Block buys raw goods for denars. It only buys. You can't purchase anything from it."
      >
        Market Blocks
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>Craft a Market Block on a crafting table and place it, or use one someone else placed.</li>
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
