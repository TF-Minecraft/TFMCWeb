import Link from "next/link";

import { DataTable, SeeAlso, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import { rodRecipes } from "../data/fishing";

const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";

/** Ocean, river and beach catches on Main's Iron, Steel and Abyssalite Rods (`CustomFishing/loot-conditions.yml`). */
const waterMaterials: [string, string][] = [
  ["Stone Core", "Stone Cores"],
  ["Bark", "Bark"],
  ["Wood Core", "Wood Cores"],
  ["Flower Core", "Flower Cores"],
];
const waterTreasure: [string, string][] = [
  ["Ignitium", "Ignitium"],
  ["Tin", "Tin"],
  ["Abyssalite Fragment", "Abyssalite Fragments"],
  ["Enchanted Dust", "Enchanted Dust"],
  ["Niter", "Niter"],
  ["Arcane Crystal", "Arcane Crystals"],
];

/** Item links separated by commas, for use inside a longer list. */
function itemList(items: [string, string][]) {
  return items.map(([name, label], index) => (
    <span key={name}>
      {index > 0 && ", "}
      <WikiItemLink name={name}>{label}</WikiItemLink>
    </span>
  ));
}

export default function FishingPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
      title="Fishing"
      width="lg"
      intro="Cast into water and wait for a bite. What you can catch depends on the biome and on your rod, and the more valuable catches make you win a short minigame first."
    >
      <WikiSectionHeading id="catching">Catching something</WikiSectionHeading>
      <p className={body}>
        Fish, ore fragments, disc fragments and music discs go straight into your inventory. Treasure, animal materials,
        coal, Bark, pottery sherds and the Stone, Wood and Flower Cores start a minigame when they bite. Win it to land
        the catch. If you lose, it gets away. The minigame is harder with a better rod: Easy on an Iron Rod, then
        Normal, Hard and Very hard on a Mythril Rod.
      </p>
      <p className={`mt-3 ${body}`}>
        Fishing levels the{" "}
        <Link href="/wiki/classes#professions" className={link}>
          Forager
        </Link>{" "}
        profession. Time of day and weather make no difference.
      </p>

      <WikiSectionHeading id="minigames">Playing the fishing games</WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Timed reeling is the most common game. Right-click with the rod to reel in when the pointer reaches the target
          area.
        </li>
        <li>
          In the pointer game, hold Sneak to push the pointer up and let go to let it fall. Keep it inside the target
          area.
        </li>
        <li>
          In the tension game, hold Sneak to pull the fish in. Let go when it struggles so the line does not reach
          maximum tension.
        </li>
        <li>
          In the dance game, follow the prompts in order. Left arrow means left-click, right arrow means right-click, up
          means Jump and down means Sneak.
        </li>
      </ul>

      <WikiSectionHeading id="where">What you can catch</WikiSectionHeading>
      <p className={body}>
        In oceans, rivers and beaches, an Iron, Steel or Abyssalite Rod can bring up everything in this table.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Catch", nowrap: true }, { header: "What comes up" }]}
        rows={[
          ["Fish", "Ordinary Minecraft fish, and 4 of the server's own fish for each kind of water"],
          [
            "Materials",
            <>
              Raw Iron, Raw Gold and Diamond Fragments, coal, {itemList(waterMaterials)}, disc fragments and music discs
            </>,
          ],
          [
            "Animal materials",
            "Leather, wool and feathers: plain on an Iron Rod, Good Quality on a Steel Rod and Great Quality on an Abyssalite Rod.",
          ],
          ["Treasure", <>{itemList(waterTreasure)}, coins and gemstone pouches of all 4 kinds</>],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        All 3 rods catch the same treasure. Ignitium, Tin and Abyssalite Fragments sometimes come up several at once,
        and an Abyssalite Rod brings up bigger piles of coins. Right-click a gemstone pouch to get 1 random gemstone of
        its kind.
      </p>
      <p className={`mt-3 ${body}`}>
        <strong>Water in land biomes</strong>, such as a forest pond or a swamp, gives that biome&apos;s blocks, mob
        drops, fragments and pottery sherds. These are the same for every rod.
      </p>
      <p className={`mt-3 ${body}`}>
        The server&apos;s own fish come out as{" "}
        <Link href="/wiki/cooking" className={link}>
          Cooking
        </Link>{" "}
        seafood with a size and a quality set by your rod: 1–2 stars on an Iron Rod, 2–3 on Steel, 3–4 on Abyssalite and
        4–5 on Mythril. Cut 1 whole seafood item on a Cutting Board to get 1 fillet or serving, whatever its size.
      </p>

      <WikiSectionHeading id="tiers">Rods and hooks</WikiSectionHeading>
      <p className={body}>
        A plain Minecraft fishing rod counts as an Iron Rod. The Iron Rod can also be made at the Fishing Station with
        no perk. The Steel, Abyssalite and Mythril Rods and all 4 hooks are made there too, and need the Fisher perk.
        Buy it with Forager points in <code className={code}>/profession</code>, the same menu as the farming perks.
        Rods cannot be repaired, and enchantments do nothing for fishing in water.
      </p>
      <p className={`mt-3 ${body}`}>
        To fit a hook, pick it up in your inventory and right-click the rod with it. Right-click the rod again to take
        the hook off. A hook works on any rod, and the rod&apos;s description shows how many uses the hook has left.
      </p>
      <DataTable
        className="mt-4"
        minWidth="40rem"
        columns={[
          { header: "Rod" },
          { header: "Rod durability", align: "right" },
          { header: "Hook" },
          { header: "Hook uses", align: "right" },
          { header: "Bite wait, rod and hook", align: "right" },
        ]}
        rows={[
          [
            <WikiItemLink key="iron-rod" name="Iron Rod" />,
            "500",
            <WikiItemLink key="iron-hook" name="Iron Hook" />,
            "250",
            "×1.2",
          ],
          [
            <WikiItemLink key="steel-rod" name="Steel Rod" />,
            "1,000",
            <WikiItemLink key="steel-hook" name="Steel Hook" />,
            "500",
            "×0.5",
          ],
          [
            <WikiItemLink key="abyssalite-rod" name="Abyssalite Rod" />,
            "2,000",
            <WikiItemLink key="abyssalite-hook" name="Abyssalite Hook" />,
            "1,000",
            "×0.25",
          ],
          [
            <WikiItemLink key="mythril-rod" name="Mythril Rod" />,
            "3,000",
            <WikiItemLink key="mythril-hook" name="Mythril Hook" />,
            "1,500",
            "×0.05",
          ],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        A bite normally takes 5 to 30 seconds. Rods and hooks shorten that wait (the Iron Rod alone lengthens it by
        30%), but it is never under 2 seconds or over 60. With a Mythril Rod and Mythril Hook, every bite comes at 2
        seconds.
      </p>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {rodRecipes.map((recipe) => (
          <CraftingGrid key={recipe.key} recipe={recipe} />
        ))}
      </div>

      <SeeAlso hrefs={["/wiki/cooking", "/wiki/materials", "/wiki/stations"]} />
    </WikiPage>
  );
}
