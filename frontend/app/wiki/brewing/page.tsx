import Link from "next/link";

import {
  CommandTable,
  DataTable,
  RankName,
  SeeAlso,
  WikiPage,
  WikiSectionHeading,
  wikiBodyText as body,
} from "@/app/components/wiki";
import { brewingCommands } from "../data/brewing";

const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";

export default function BrewingPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
      title="Brewing"
      width="lg"
      intro="Brew drinks in a cauldron, then distil and age them when the recipe calls for it. Supporters (Noble rank and above) can also design their own drink on the website."
    >
      <WikiSectionHeading id="loop">Brewing a drink</WikiSectionHeading>
      <ol className={`mt-4 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          <strong>Cook.</strong> Place a cauldron over fire, soul fire, lava, a magma block, a lit campfire or a lit
          soul campfire and fill it with water. Right-click it with each ingredient. A recipe&apos;s cooking time is the
          number of minutes the cauldron has been boiling. It keeps counting with nobody nearby, so walking away does
          not pause it. Right-click with a clock to see how long it has been boiling.
        </li>
        <li>
          <strong>Bottle.</strong> Right-click the cauldron with a glass bottle to fill one bottle.
        </li>
        <li>
          <strong>Distil, if the recipe needs it.</strong> Put the bottles in a brewing stand with glowstone dust and
          leave them in. The stand distils them run after run, up to the number of runs the recipe allows.
        </li>
        <li>
          <strong>Age, if the recipe needs it.</strong> Leave the bottles in a barrel. One barrel year is 20 real
          minutes.
        </li>
      </ol>
      <p className={`mt-4 ${body}`}>
        A normal Minecraft barrel holds up to 6 brews. You can also build a bigger barrel out of wooden stairs and
        planks. Every block of one barrel must be the same wood: oak, spruce, birch, jungle, acacia, dark oak, mangrove,
        cherry, pale oak, bamboo, crimson or warped. The type of wood matters for some recipes.
      </p>
      <p className={`mt-3 ${body}`}>
        Both sizes are finished with a sign. One line of the sign must read &quot;Barrel&quot; with nothing else on it,
        in any capitals. Chat says <em>&quot;Barrel created&quot;</em> when it works.
      </p>
      <p className={`mt-4 ${body}`}>
        <strong>Small barrel.</strong> It holds 1 row of bottles.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>Place 8 wooden stairs as a block 2 long, 2 wide and 2 high.</li>
        <li>
          Turn the bottom 4 upside down and leave the top 4 the right way up. All 8 face outwards, so the ends look
          round.
        </li>
        <li>Put the sign on the front of one of the 2 lower front stairs. If nothing happens, try the other one.</li>
      </ol>
      <p className={`mt-4 ${body}`}>
        <strong>Large barrel.</strong> It holds 3 rows of bottles and opens from any of its blocks.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Build it 4 long, 3 wide and 3 high. Seen from the front, each 3×3 slice has stairs at its 4 corners and planks
          everywhere else. The bottom corner stairs are upside down and the top ones the right way up, all facing
          outwards.
        </li>
        <li>The centre block of the 2 middle slices can be left empty.</li>
        <li>Place a fence in front of the bottom-middle plank of the front. This is the tap.</li>
        <li>Put the sign on the fence, up to 2 blocks above it or 1 block below it.</li>
      </ol>

      <WikiSectionHeading id="drinking">Quality and drinking</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Every brew shows its quality as 1 to 5 stars. Alcoholic drinks are marked <em>Alcoholic</em>, but their exact
        strength stays hidden. Each drink tells you how drunk you are, and <code className={code}>/brew info</code>{" "}
        shows it again. Bread and milk sober you up a little. When very drunk, you can stumble and vomit, and your chat
        messages become slurred. Log off very drunk and you may come back with a hangover. If you reconnect while
        extremely drunk, you may be refused entry and have to try again.
      </p>
      <p className={`mt-3 ${body}`}>
        Empty an unwanted brew into a hopper to discard the drink and keep the glass bottle.
      </p>
      <p className={`mt-3 ${body}`}>
        A Brew Sealing Table is crafted from 2 glass bottles over 4 planks and looks like a smoker. Sealing a brew hides
        how it was made, so it looks like a finished product when you sell it.
      </p>

      <WikiSectionHeading id="custom-drinks" intro="Noble rank and above can add their own drink recipe to the server.">
        Designing your own drink
      </WikiSectionHeading>
      <ol className={`mt-4 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Link your Discord account and join the server once so your rank is known. Then open the Drinks tab on your{" "}
          <Link href="/profile?tab=drinks" className={link}>
            profile
          </Link>{" "}
          and choose New drink, or run <code className={code}>/token create drink</code> in game for a code.
        </li>
        <li>
          Fill in the recipe: ingredients from a fixed list, cooking time, distilling, barrel wood and age, difficulty
          and alcohol. Then the look: name, description (the form calls it Lore), potion effects, a shimmer and either a
          colour or a bottle texture. Higher ranks can also add a drink message, a line shown to whoever drinks it.
        </li>
        <li>Submit it. Staff review every drink, and you hear back on Discord.</li>
        <li>
          Once approved, the recipe is on the server within a few minutes. Your own bottle texture can take up to a day
          and needs the updated resource pack.
        </li>
      </ol>
      <p className={`mt-4 ${body}`}>
        You don&apos;t get the drink itself. Your drink becomes a normal recipe that anyone can brew if they know the
        ingredients. Some potion effects are not allowed, such as speed, strength, regeneration and invisibility.
      </p>
      <DataTable
        className="mt-4"
        minWidth="40rem"
        columns={[
          { header: "Rank", width: "9rem" },
          { header: "New drink every" },
          { header: "Name colours", align: "center" },
          { header: "Bottle texture", align: "center" },
          { header: "Drink message", align: "center" },
        ]}
        rows={[
          [<RankName key="noble" rank="Noble" />, "28 days", "1", "No", "No"],
          [<RankName key="gilded" rank="Gilded" />, "21 days", "2", "Yes", "No"],
          [<RankName key="ascended" rank="Ascended" />, "14 days", "Up to 8", "Yes", "Yes"],
          [<RankName key="legacy" rank="Legacy" />, "7 days", "Up to 8", "Yes", "Yes"],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        Skins and drinks share one wait, which starts when you take the code. If you never use the code, or staff turn
        the drink down, the wait is cancelled once the code expires.
      </p>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={brewingCommands.commands} />

      <SeeAlso hrefs={["/wiki/cooking", "/wiki/farming", "/wiki/armour-shop", "/wiki/commands"]} />
    </WikiPage>
  );
}
