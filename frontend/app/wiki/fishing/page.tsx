import { DataTable, SeeAlso, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import { rodRecipes } from "../data/fishing";

export default function FishingPage() {
  return (
    <WikiPage
      lastModified="2026-10-20"
      title="Fishing"
      width="lg"
      intro={
        <>
          When something bites, you play a timing minigame. What you catch depends on your rod tier, the biome
          you&apos;re fishing in, and any hook and bait you have equipped. Win the minigame and you get the loot; lose
          it and the fish gets away.
        </>
      }
    >
      <WikiSectionHeading id="loop">The basic loop</WikiSectionHeading>
      <ol className="mt-4 flex flex-col gap-2 text-sm text-[var(--tfmc-mist)]">
        <li>1. Get a rod: there are four tiers (below).</li>
        <li>
          2. Optionally right-click the rod while holding a hook to attach it; right-click the rod again to remove it.
          Its remaining uses show in the rod&apos;s lore.
        </li>
        <li>3. Optionally put bait in your off-hand.</li>
        <li>
          4. Cast normally. Before your rod and hook are counted, the wait for a bite is 5–30 seconds. After them, it is
          never less than 2 seconds or more than 60 seconds.
        </li>
        <li>5. When it bites, one of 17 minigames fires, at a difficulty set by your rod tier.</li>
      </ol>

      <WikiSectionHeading
        id="tiers"
        intro="Each rod pairs with one hook. Better rods and hooks shorten the wait for a bite."
      >
        Rod and hook tiers
      </WikiSectionHeading>
      <DataTable
        className="mt-4"
        minWidth="48rem"
        columns={[
          { header: "Rod", width: "10rem" },
          { header: "Hook" },
          { header: "Hook durability", align: "right" },
          { header: "Rod wait ×", align: "right" },
          { header: "Hook wait ×", align: "right" },
          { header: "Rod + hook wait ×", align: "right" },
          { header: "Minigame tier" },
        ]}
        rows={[
          ["Fishing Rod", <WikiItemLink key="iron-hook" name="Iron Hook" />, "250 uses", "1.3", "0.9", "1.2", "Easy"],
          [
            <WikiItemLink key="steel-rod" name="Steel Rod" />,
            <WikiItemLink key="steel-hook" name="Steel Hook" />,
            "500 uses",
            "0.7",
            "0.8",
            "0.5",
            "Normal",
          ],
          [
            <WikiItemLink key="abyssalite-rod" name="Abyssalite Rod" />,
            <WikiItemLink key="abyssalite-hook" name="Abyssalite Hook" />,
            "1000 uses",
            "0.55",
            "0.7",
            "0.25",
            "Hard",
          ],
          [
            <WikiItemLink key="mythril-rod" name="Mythril Rod" />,
            <WikiItemLink key="mythril-hook" name="Mythril Hook" />,
            "1500 uses",
            "0.45",
            "0.6",
            "0.05",
            "Very hard",
          ],
        ]}
      />
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        A multiplier below 1 shortens the wait for a bite, and one above 1 lengthens it. The rod and hook add up rather
        than multiply: the Steel Rod takes 0.3 off and the Steel Hook 0.2, leaving 0.5. With a Mythril Rod and Mythril
        Hook, almost every bite comes at the 2-second minimum.
      </p>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {rodRecipes.map((recipe) => (
          <CraftingGrid key={recipe.key} recipe={recipe} />
        ))}
      </div>

      <SeeAlso hrefs={["/wiki/cooking", "/wiki/materials", "/wiki/commands"]} />
    </WikiPage>
  );
}
