import Link from "next/link";

import { CropGallery, DataTable, SeeAlso, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { cropPlantModels } from "../data/crop-plant-models";

const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";

const FRUIT = "Fruit Connoisseur";
const VEGETABLE = "Vegetable Enjoyer";
const SPICE = "Spice Lover";

/** [name, perk, growth steps, regrows] from Main's CustomCrops `contents/crops/*.yml`. */
const crops = [
  ["Apple", FRUIT, 5, true],
  ["Banana", FRUIT, 4, true],
  ["Cherry", FRUIT, 4, true],
  ["Grape", FRUIT, 5, true],
  ["Lemon", FRUIT, 4, true],
  ["Lime", FRUIT, 4, true],
  ["Orange", FRUIT, 4, true],
  ["Peach", FRUIT, 4, true],
  ["Pineapple", FRUIT, 3, false],
  ["Pistachio", FRUIT, 3, true],
  ["Plum", FRUIT, 5, true],
  ["Strawberry", FRUIT, 2, true],
  ["Tomato", FRUIT, 3, false],
  ["Corn", VEGETABLE, 3, false],
  ["Cucumber", VEGETABLE, 3, false],
  ["Garlic", VEGETABLE, 3, false],
  ["Lettuce", VEGETABLE, 2, false],
  ["Olive", VEGETABLE, 4, true],
  ["Onion", VEGETABLE, 2, false],
  ["Rhubarb", VEGETABLE, 2, false],
  ["Yeast", VEGETABLE, 3, false],
  ["Basil", SPICE, 3, false],
  ["Black Pepper", SPICE, 3, false],
  ["Cinnamon", SPICE, 4, false],
  ["Nutmeg", SPICE, 4, false],
  ["Spice Leaf", SPICE, 2, false],
  ["Vanilla", SPICE, 4, false],
] as const;

const cropGalleryItems = crops.map(([name, perk, stages, regrows]) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    name,
    perk,
    stages,
    regrows,
    image: `/wiki/textures/crops/${slug}.png`,
    plantModel: cropPlantModels[slug],
  };
});

export default function FarmingPage() {
  return (
    <WikiPage
      lastModified="2026-10-22"
      title="Farming"
      width="lg"
      intro={
        <>
          Farms grow two kinds of crops: the usual field crops, such as wheat and potatoes, and 27 custom fruits,
          vegetables and spices for{" "}
          <Link href="/wiki/cooking" className={link}>
            Cooking
          </Link>{" "}
          and{" "}
          <Link href="/wiki/brewing" className={link}>
            Brewing
          </Link>
          . Both need open sky, and both grow better in fertile land.
        </>
      }
    >
      <WikiSectionHeading id="open-sky">Open sky</WikiSectionHeading>
      <p className={body}>
        Crops can only be planted outdoors, with nothing but air above them all the way up. Indoors or in a cave you get{" "}
        <em>&quot;Crops must be planted outdoors with open sky above them.&quot;</em> Some things above a crop still
        count as open sky:
      </p>
      <ul className={`mt-3 list-disc space-y-1 pl-5 ${body}`}>
        <li>Glass and glass panes, so greenhouses work.</li>
        <li>Leaves, logs, vines, fences and gates, lanterns, torches, chains, ladders, banners and hanging signs.</li>
        <li>Slabs, stairs and signs, but only up to 5 blocks above the crop. A double slab is a roof.</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Nether wart, mushrooms and yeast can be grown indoors. Building a roof over crops that are already planted does
        not harm them.
      </p>

      <WikiSectionHeading id="fertility">Fertility and quality</WikiSectionHeading>
      <p className={body}>
        Every province has a fertility from 0 to 100. Switch the{" "}
        <Link href="/map" className={link}>
          map
        </Link>{" "}
        to Fertility to see it. In poor land crops often skip a growth step, and at 0 they do not grow at all. Hardy
        crops such as nether wart, potatoes and olives cope with poor soil far better than corn or tomatoes.
      </p>
      <p className={`mt-3 ${body}`}>
        Harvested produce gets a quality of 1 to 5 stars. Fertile land makes good stars more likely, though any result
        can happen anywhere.
      </p>

      <WikiSectionHeading id="field-crops">Field crops and hoes</WikiSectionHeading>
      <p className={body}>
        Wheat, potatoes, carrots, beetroots and nether wart are vanilla crops and need no perk. Harvest them by breaking
        a ripe crop with one of the server&apos;s hoes. Every ripe crop in the hoe&apos;s area is cut at once, the
        produce goes into your inventory, and each spot replants itself a moment later. Unripe crops are left alone.
        Crops broken by hand drop as normal, but their produce is always 1 star. Bone meal does not work on field crops.
      </p>
      <DataTable
        className="mt-4"
        columns={[
          { header: "Hoe" },
          { header: "Area", align: "center" },
          { header: "Chance of +1 star", align: "right" },
          { header: "Durability", align: "right" },
        ]}
        rows={[
          [<WikiItemLink key="iron" name="Iron Hoe" />, "1 crop", "None", "600"],
          [<WikiItemLink key="steel" name="Steel Hoe" />, "3×3", "3.5%", "1,200"],
          [<WikiItemLink key="abyssalite" name="Abyssalite Hoe" />, "5×5", "6%", "2,400"],
          [<WikiItemLink key="mythril" name="Mythril Hoe" />, "7×7", "10%", "4,800"],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        Each crop harvested costs the hoe 1 durability. Crafting the steel, abyssalite and mythril hoes needs the Hoe
        Maker perks from the Forager profession. Jumping on farmland does not turn it back to dirt, but it knocks the
        crop growing on it back to a seedling.
      </p>

      <WikiSectionHeading id="custom-crops">Custom crops</WikiSectionHeading>
      <p className={body}>
        Each custom crop needs a perk from the Forager profession: <strong>{FRUIT}</strong>,{" "}
        <strong>{VEGETABLE}</strong> or <strong>{SPICE}</strong>, which all require <strong>Farmer</strong> first. Spend
        Forager points on them in <code className={code}>/profession</code>. Without the right perk you cannot plant,
        harvest or break that crop.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>Plant the seed on farmland.</li>
        <li>
          Keep the farmland fully wet (dark). Farmland within 4 blocks of water stays wet, and rain wets the rest for a
          while. Custom crops stop growing as soon as their farmland starts to dry out.
        </li>
        <li>
          On wet farmland the crop gains a growth step roughly every 10 minutes, so in fertile land a crop ripens in 20
          to 50 minutes. Crops only grow while their chunk is loaded. Bone meal sometimes adds a step or two.
        </li>
        <li>
          Right-click a ripe crop with an empty hand to harvest 2 to 4 produce. Crops that regrow drop back to an
          earlier stage and keep producing. The rest give you a seed back.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Breaking a ripe crop always gives its produce and a seed, but removes the plant, even one that would regrow.
        Breaking an unripe crop loses the seed. Unripe crops can also wither: at a fertility of around 80, about one
        crop in eight withers before it ripens. Poorer land means slower growth and more losses, and a crop on dry
        farmland can still wither while it waits. Crops that regrow take the same risk each time they regrow.
      </p>

      <CropGallery crops={cropGalleryItems} />

      <WikiSectionHeading id="seeds">Getting seeds</WikiSectionHeading>
      <p className={body}>
        Besides the seeds you get back from harvests, custom seeds come from guild farms. Each focus of a farm or
        plantation{" "}
        <Link href="/wiki/dowsing" className={link}>
          resource node
        </Link>{" "}
        produces its own seeds:
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Node focus" }, { header: "Seeds" }]}
        rows={[
          ["Vegetable Farm", "Corn, Cucumber, Lettuce, Rhubarb"],
          ["Onion Farm", "Garlic, Onion"],
          ["Exotic Farm", "Olive, Tomato"],
          ["Yeast Production", "Yeast"],
          ["Fruit Orchard", "Apple, Grape, Peach, Pistachio, Plum, Strawberry"],
          ["Exotic Fruit Orchard", "Banana, Cherry, Lemon, Lime, Orange, Pineapple"],
          ["Spice Plantation", "Basil, Black Pepper, Spice Leaf"],
          ["Sweet Spice Plantation", "Cinnamon, Nutmeg, Vanilla"],
        ]}
      />

      <SeeAlso hrefs={["/wiki/cooking", "/wiki/dowsing", "/wiki/animal-husbandry", "/wiki/classes"]} />
    </WikiPage>
  );
}
