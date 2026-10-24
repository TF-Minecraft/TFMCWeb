import Link from "next/link";

import {
  DataTable,
  SeeAlso,
  WikiItemLink,
  WikiItemText,
  WikiPage,
  WikiSectionHeading,
  wikiBodyText as body,
} from "@/app/components/wiki";

const link = "text-[var(--tfmc-accent)] hover:underline";

const piece = (name: string) => (
  <WikiItemLink name={name} key={name}>
    {name}
  </WikiItemLink>
);

export default function CookingPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Cooking"
      width="lg"
      intro="You cook on furniture placed in the world, not in a menu. Food keeps track of how fresh it is, how it was cooked and how it was seasoned, and has a quality from 1 to 5 stars."
    >
      <WikiSectionHeading id="basics">The basics</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        All cooking furniture and tools are made at the{" "}
        <Link href="/wiki/stations/meal-prep-station" className={link}>
          Meal Prep Station
        </Link>{" "}
        from iron, stone or oak planks (see{" "}
        <Link href="/wiki/furniture#crafting" className={link}>
          Furniture
        </Link>
        ).
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Right-click a piece with an ingredient to put it in.</li>
        <li>Right-click with an empty hand to take it back out, or to work the station: churn, stir, turn the spit.</li>
        <li>
          To cut or carve, hit the <WikiItemLink name="Cutting Board" /> or <WikiItemLink name="Meat Hook" /> while
          holding a <WikiItemLink name="Cutting Knife" />.
        </li>
        <li>
          <WikiItemText text="The Frying Pan, Saucepan, Pot and Oven Top only cook when they sit directly on a lit Oven Bottom. Right-click the Oven Bottom with logs (up to 6), then with Flint and Steel to light it. The Fire Pit goes on a lit campfire instead." />
        </li>
      </ul>

      <WikiSectionHeading id="first-soup" intro="A carrot and potato soup to learn the basics.">
        Your first soup
      </WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        <WikiItemText text="You need 2 carrots, 2 potatoes, a Water Bucket, a few logs, Flint and Steel, a Cutting Board, Cutting Knife, Oven Bottom, Pot, Masher, Ladle and Bowl." />
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Put the 2 carrots on the Cutting Board and hit it with the Cutting Knife. You get 1 cut carrot. Do the same
          with the potatoes.
        </li>
        <li>Place the Oven Bottom and put the Pot on top. Fill the pot with the Water Bucket.</li>
        <li>Add logs to the Oven Bottom and light them with Flint and Steel.</li>
        <li>
          When the water boils, add the cut carrot and mash it with the Masher. The pot won&apos;t take anything else
          until you do. Then add the cut potato and mash that too.
        </li>
        <li>Right-click the pot with the Ladle to take a serving. One pot gives 3.</li>
        <li>
          Place the Bowl, right-click it with the full ladle, then right-click the bowl with an empty hand to eat.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Once mashed, a soup takes one salt, one pepper, one garnish and one spice to season it.
      </p>

      <WikiSectionHeading id="stations">Station by station</WikiSectionHeading>
      <DataTable
        className="mt-4"
        minWidth="46rem"
        columns={[{ header: "Station", width: "10rem" }, { header: "How to use it" }]}
        rows={[
          [
            piece("Cutting Board"),
            "Put up to 2 of the same ingredient on it and hit it with the Cutting Knife. See the recipes below.",
          ],
          [
            piece("Frying Pan"),
            <WikiItemText
              key="pan"
              text="Add Butter first: without it, everything in a hot pan burns within 10 seconds. One Butter lasts 30 seconds. Fries raw meat, sausages, eggs, seafood and cut vegetables."
            />,
          ],
          [
            piece("Pot"),
            "Fill with a Water Bucket. Boils cut vegetables, chicken, red meat, fish fillets, jellyfish and octopus, which you mash into soup.",
          ],
          [
            piece("Saucepan"),
            <WikiItemText
              key="saucepan"
              text="Fill with a cup of water or milk, add ingredients, then ladle the sauce onto food on a Plate."
            />,
          ],
          [
            piece("Liquid Container"),
            <WikiItemText
              key="liquid"
              text="Fill with a water or milk bucket, then right-click with an Empty Cup to fill a cup."
            />,
          ],
          [
            piece("Fire Pit"),
            "Place it on a lit campfire and put any roast on the spit. Right-click the handle with an empty hand to turn it. Each turn cooks it a little more, so stop before it burns.",
          ],
          [
            piece("Meat Hook"),
            "Hangs from a ceiling. Hang a roast or sausage chain on it and hit it with the Cutting Knife to carve one piece at a time.",
          ],
          [
            piece("Milling Stone"),
            "Right-click it with 8 or more wheat in hand (it uses 8), then right-click with an empty hand to grind 1 flour.",
          ],
          [
            piece("Mixing Bowl"),
            <WikiItemText
              key="mixing"
              text="Add flour, a cup of water and yeast, in that order. You can also add 1 sugar and up to 2 different fruits. Stir 3 times to make dough."
            />,
          ],
          [
            piece("Bread Tray"),
            <WikiItemText
              key="bread"
              text="Fill the moulds with dough before putting the tray in the Oven Top over a lit Oven Bottom. Each mould bakes 2 bread. Take it out before it burns. Let the dough rise first: its description shows Unrisen, Rising or Risen."
            />,
          ],
          [
            piece("Butter Churn"),
            <WikiItemText
              key="churn"
              text="Right-click with a Milk Bucket, then churn 3 times. Add salt or a spice before collecting for salted or spiced butter. Collect the butter while carrying a Butter Plate."
            />,
          ],
          [
            piece("Sausage Maker"),
            "Add 3 pieces of meat, then crank it with paper in your hand (uses 1 sheet). Carve the sausage chain into 5 sausages at a Meat Hook.",
          ],
          ["Empty cauldron", "Right-click with a soup or sauce to pour it away. You get the empty ladle back."],
        ]}
      />

      <WikiSectionHeading id="cutting-board">
        <WikiItemLink name="Cutting Board" /> recipes
      </WikiSectionHeading>
      <DataTable
        className="mt-4"
        minWidth="40rem"
        columns={[{ header: "Recipe", width: "12rem" }, { header: "Input" }, { header: "Output" }]}
        rows={[
          [
            "Cut vegetables",
            "2 raw carrots, potatoes, beetroots, pumpkins, tomatoes, onions, lettuce, cucumbers or corn",
            "1 cut vegetable",
          ],
          ["Chop vegetables", "1 cut vegetable", "1 chopped vegetable"],
          ["Chop", "1 olive, pistachio, rhubarb or garlic", "1 chopped garnish"],
          ["Cut seafood", "1 whole fish, jellyfish or octopus", "1 fish fillet, jellyfish cubes or octopus pieces"],
        ]}
      />

      <WikiSectionHeading
        id="carving"
        intro="Each hit with the Cutting Knife on the Meat Hook takes off one piece, in this order."
      >
        Carving
      </WikiSectionHeading>
      <DataTable
        className="mt-4"
        minWidth="34rem"
        columns={[{ header: "Hanging on the hook", width: "14rem" }, { header: "Yields in order" }]}
        rows={[
          ["Whole chicken", "2 chicken legs, 3 chicken, then 2 bones"],
          ["Other roasts", "7 pieces of that meat, then 4 bones"],
          ["Sausage chain", "5 sausages"],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        How many pieces a roast actually holds depends on how well the animal was bred and cared for (see{" "}
        <Link href="/wiki/animal-husbandry#quality" className={link}>
          Animal Husbandry
        </Link>
        ).
      </p>

      <WikiSectionHeading id="eating">Eating</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Each character has its own hunger, and a full stomach does not heal you the way it does in normal Minecraft. As
        you play, your hunger drains. Filling your hunger bar and keeping a good diet are separate goals. Fresher food
        and more stars improve your diet, but eating at full hunger does not. Your diet is rated from Terrible to
        Fantastic. A better diet gives you more damage, health, mana and critical chance, and shorter cooldowns. Eating
        the same few ingredients over and over lowers your rating, so vary your meals.
      </p>

      <WikiSectionHeading id="freshness">Keeping food fresh</WikiSectionHeading>
      <p className={`mt-3 ${body}`}>
        Perishable food goes from Fresh to Stale to Rotten in real time, including in storage and while you are offline.
        Shelf life varies by food. Stale and rotten food nourish you less, so check its description before eating.
      </p>

      <SeeAlso
        hrefs={["/wiki/animal-husbandry", "/wiki/farming", "/wiki/fishing", "/wiki/brewing", "/wiki/furniture"]}
      />
    </WikiPage>
  );
}
