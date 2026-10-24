import Link from "next/link";

import { DataTable, SeeAlso, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import { rodRecipes } from "../data/fishing";

const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";

export default function FishingPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Fishing"
      width="lg"
      intro="Cast into water and wait for a bite. What you can catch depends on the biome and on your rod, and the more valuable catches make you win a short minigame first."
    >
      <WikiSectionHeading id="catching">Catching something</WikiSectionHeading>
      <p className={body}>
        Most catches, such as fish, fragments and music discs, go straight to you. Act materials, animal materials and
        pottery sherds start a minigame when they bite. Win it to land the catch. If you lose, it gets away. The
        minigame is harder with a better rod: Easy on an Iron Rod, then Normal, Hard and Very hard on a Mythril Rod.
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
        <li>Timed reeling asks you to reel in when the pointer reaches the target area.</li>
        <li>In the pointer game, press Sneak to start, then keep the pointer inside the target area.</li>
        <li>
          In the tension game, press Sneak to start. Pull the fish in, but ease off when it struggles so the line does
          not reach maximum tension.
        </li>
        <li>
          In the dance game, follow the prompts in order. Left arrow means left-click, right arrow means right-click, up
          means Jump and down means Sneak.
        </li>
      </ul>

      <WikiSectionHeading id="where">What you can catch</WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <strong>Oceans, rivers and beaches</strong> give fish, including four custom fish for each kind of water, plus
          ore and disc fragments, music discs and animal materials. Better rods give better-quality animal materials,
          and some act materials can only be caught with a steel or abyssalite rod.
        </li>
        <li>
          <strong>Water in land biomes</strong>, such as a forest pond or a swamp, gives that biome&apos;s blocks, mob
          drops, fragments and pottery sherds. These are the same for every rod.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Custom fish come out as{" "}
        <Link href="/wiki/cooking" className={link}>
          Cooking
        </Link>{" "}
        seafood with a size and a quality set by your rod: 1–2 stars on an Iron Rod, 2–3 on Steel, 3–4 on Abyssalite and
        4–5 on Mythril. Cut one whole seafood item on a Cutting Board to get one fillet or serving, whatever its size.
      </p>

      <WikiSectionHeading id="tiers">Rods and hooks</WikiSectionHeading>
      <p className={body}>
        A plain vanilla fishing rod counts as an Iron Rod. The other rods and all four hooks are made at the Fishing
        Station and need the Fisher perk. Buy it with Forager points in <code className={code}>/profession</code>, the
        same menu as the farming perks. Rods cannot be repaired, and enchantments do nothing for fishing in water.
      </p>
      <p className={`mt-3 ${body}`}>
        To fit a hook, pick it up in your inventory and right-click the rod with it. Right-click the rod again to take
        the hook off. A hook works on any rod, and the rod&apos;s lore shows how many uses the hook has left.
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
