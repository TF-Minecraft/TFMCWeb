import Link from "next/link";

import { CommandTable, DataTable, SeeAlso, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { gatheringCommands } from "../data/gathering";

const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";

/** [biome, seeds, common gemstone, rarer gemstone] from Main's gathering spot settings. Crop names as on the Farming page. */
const biomes = [
  [
    "Plains",
    "Apple, Cherry, Corn, Cucumber, Garlic, Grape, Lettuce, Onion, Peach, Plum, Strawberry, Tomato",
    "Pearl",
    "Peridot",
  ],
  [
    "Forest",
    "Apple, Basil, Cherry, Cucumber, Garlic, Grape, Lettuce, Olive, Onion, Peach, Pistachio, Plum, Rhubarb, Spice Leaf, Strawberry, Tomato",
    "Pearl",
    "Peridot",
  ],
  [
    "Dark Forest",
    "Apple, Cherry, Garlic, Grape, Lettuce, Olive, Onion, Plum, Rhubarb, Spice Leaf, Strawberry",
    "Onyx",
    "Labradorite",
  ],
  [
    "Meadow, Cherry Grove",
    "Apple, Basil, Cherry, Garlic, Grape, Lettuce, Onion, Peach, Plum, Rhubarb, Strawberry, Tomato",
    "Rhodonite",
    "Carnelian",
  ],
  [
    "Taiga, Old Growth Pine Taiga",
    "Apple, Cherry, Garlic, Lettuce, Onion, Plum, Rhubarb, Strawberry",
    "Agate",
    "Turquoise",
  ],
  [
    "Windswept Hills",
    "Apple, Cherry, Garlic, Grape, Lettuce, Olive, Onion, Pistachio, Plum, Rhubarb, Strawberry",
    "Tourmaline",
    "Sardonyx",
  ],
  [
    "Windswept Gravelly Hills",
    "Garlic, Grape, Olive, Onion, Pistachio, Spice Leaf, Strawberry",
    "Tourmaline",
    "Sardonyx",
  ],
  ["Swamp", "Garlic, Lettuce, Onion, Rhubarb, Strawberry", "Larimar", "Variscite"],
  [
    "Jungle, Bamboo Jungle",
    "Banana, Black Pepper, Cinnamon, Cucumber, Grape, Lemon, Lime, Nutmeg, Orange, Pineapple, Spice Leaf, Tomato, Vanilla",
    "Chrysoprase",
    "Apatite",
  ],
  [
    "Savanna",
    "Corn, Garlic, Grape, Lemon, Lime, Olive, Onion, Orange, Peach, Pistachio, Spice Leaf, Tomato",
    "Coral",
    "Malachite",
  ],
  ["Stony Peaks", "Garlic, Grape, Olive, Onion, Pistachio, Spice Leaf", "Vesuvianite", "Zircon"],
  ["Jagged Peaks", "Rhubarb, dead bush", "Vesuvianite", "Zircon"],
  [
    "Pale Garden",
    "No seeds. Bones, rotten flesh, sculk and dead bushes, and now and then an Unknown Key",
    "Onyx",
    "Labradorite",
  ],
] as const;

export default function GatheringPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
      title="Gathering"
      width="lg"
      intro="In gathering mode, spots turn up on the ground around you. Harvest them for crop seeds and blank gemstones, and now and then for treasure."
    >
      <WikiSectionHeading id="start">Gathering mode</WikiSectionHeading>
      <p className={body}>
        Type <code className={code}>/gather</code> to turn gathering mode on, and type it again to turn it off.{" "}
        <code className={code}>/gather on</code> and <code className={code}>/gather off</code> work too. You must be
        playing a character.
      </p>
      <p className={`mt-3 ${body}`}>
        Gathering costs Mental Points: 1 when you start, and 1 more every 24 seconds while the mode is on. A bar at the
        top of the screen shows how many you have. When they run out, the mode ends and chat says{" "}
        <em>Your focus fades... You stop searching.</em> With none left you can&apos;t start at all, and chat says{" "}
        <em>You are too unfocused to search.</em> Logging out ends the mode too.
      </p>
      <p className={`mt-3 ${body}`}>
        <Link href="/wiki/magic#mental-points" className={link}>
          Mental Points
        </Link>{" "}
        refill a little every hour, even while you are offline. A Focus Potion restores 50.
      </p>

      <WikiSectionHeading id="spots">Finding spots</WikiSectionHeading>
      <p className={body}>
        While the mode is on, spots appear around you from time to time. A new spot is a short walk away, roughly 8 to
        32 blocks, and close to your own height. Only a few are around you at once, and there are more when other
        gatherers are near.
      </p>
      <p className={`mt-3 ${body}`}>
        A spot is a small swirl of particles over a block. The particles look like the block itself. Only players in
        gathering mode can see spots.
      </p>
      <p className={`mt-3 ${body}`}>
        Spots only appear in the main world, on the surface and in the hills. Caves deep down have none. A spot needs
        open ground with room above it. Most spots sit on grass. Gemstone spots in the peaks sit on stone, and so do
        seed spots in the Jagged Peaks. Seed spots in the Windswept Gravelly Hills sit on moss.
      </p>
      <p className={`mt-3 ${body}`}>
        Higher{" "}
        <Link href="/wiki/classes#attributes" className={link}>
          Wisdom and Intelligence
        </Link>{" "}
        make spots appear more often.
      </p>

      <WikiSectionHeading id="harvest">Harvesting</WikiSectionHeading>
      <p className={body}>
        Right-click the block to harvest the spot. You hear digging, and your finds pop out of the ground with their
        names showing. They lie there like any dropped item, so pick them up quickly.
      </p>
      <p className={`mt-3 ${body}`}>
        Anyone in gathering mode can harvest any spot. A spot fades after 15 minutes, or about 2 minutes after every
        gatherer has walked away from it.
      </p>
      <p className={`mt-3 ${body}`}>
        Every harvest makes new spots less likely in that area. It recovers over the next few days. Move on and you find
        more.
      </p>

      <WikiSectionHeading id="finds">What you find</WikiSectionHeading>
      <p className={body}>What a spot gives depends on the biome it is in.</p>
      <p className={`mt-3 ${body}`}>
        <strong>Seed spots</strong> are the common kind. They give seeds for{" "}
        <Link href="/wiki/farming#custom-crops" className={link}>
          custom crops
        </Link>
        . Now and then a seed spot holds treasure instead.
      </p>
      <p className={`mt-3 ${body}`}>
        <strong>Gemstone spots</strong> are rarer and give 1 blank gemstone for{" "}
        <Link href="/wiki/gem-infusion" className={link}>
          Gem Infusion
        </Link>
        . Each biome has a common gemstone and a rarer one.
      </p>
      <DataTable
        className="mt-4"
        minWidth="46rem"
        columns={[
          { header: "Biome" },
          { header: "Seeds" },
          { header: "Common gemstone", nowrap: true },
          { header: "Rarer gemstone", nowrap: true },
        ]}
        rows={biomes.map((row) => [...row])}
      />
      <p className={`mt-4 ${body}`}>
        A few rarer spots turn up as well. They can give gold ingots or gold blocks, Enchanted Dust, a Lost Knowledge
        Fragment or an Unknown Key.
      </p>

      <WikiSectionHeading id="treasure">Treasure</WikiSectionHeading>
      <p className={body}>Treasure can be any of these:</p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>A Pouch of Basic Gemstones or a Pouch of Polished Gemstones.</li>
        <li>
          <WikiItemLink name="Enchanted Dust" />.
        </li>
        <li>
          A <WikiItemLink name="Lost Knowledge Fragment" />, which makes an{" "}
          <WikiItemLink name="Unknown Research Paper" /> for{" "}
          <Link href="/wiki/research" className={link}>
            Research
          </Link>
          . Gathering is the only way to get one.
        </li>
        <li>A Weak Repair Kit.</li>
        <li>
          An Unknown Key, which opens the{" "}
          <Link href="/wiki/trial-rooms" className={link}>
            Trial Rooms
          </Link>
          .
        </li>
        <li>Coins.</li>
      </ul>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={gatheringCommands.commands} showAliases={false} />

      <SeeAlso hrefs={["/wiki/farming", "/wiki/gem-infusion", "/wiki/research", "/wiki/magic"]} />
    </WikiPage>
  );
}
