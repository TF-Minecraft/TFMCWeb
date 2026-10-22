import Link from "next/link";

import {
  Callout,
  CommandTable,
  DataTable,
  SeeAlso,
  WikiItemLink,
  WikiItemText,
  WikiPage,
  WikiSectionHeading,
  wikiBodyText as body,
} from "@/app/components/wiki";
import { animalHusbandryCommands } from "../data/animal-husbandry";

const link = "text-[var(--tfmc-accent)] hover:underline";

export default function AnimalHusbandryPage() {
  return (
    <WikiPage
      title="Animal Husbandry"
      lastModified="2026-10-22"
      intro="Claim farm animals, keep them fed and clean, and breed them for better meat, milk, eggs and materials."
    >
      <WikiSectionHeading id="tools">What you need</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        All the tools are made at the{" "}
        <Link href="/wiki/stations/animal-station" className={link}>
          Animal Station
        </Link>
        .
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Item" }, { header: "Cost" }, { header: "Used for" }]}
        rows={[
          [
            <WikiItemLink key="ownership" name="Ownership Token" />,
            "1 iron nugget",
            "Claiming or renaming an animal. Used up.",
          ],
          [
            <WikiItemLink key="co-ownership" name="Co-Ownership Token" />,
            "1 iron nugget",
            "Sharing an animal with another player. Used up.",
          ],
          [<WikiItemLink key="glove" name="Glove" />, "2 Leather", "Cleaning a dirty animal. Not used up."],
          [
            <WikiItemLink key="neutering" name="Neutering Tool" />,
            "2 iron ingots",
            "Stopping an animal from breeding. Used up.",
          ],
          [<WikiItemLink key="trough" name="Trough" />, "1 oak plank", "Making Universal Feed."],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        <WikiItemText text="To make Universal Feed, place a Trough and right-click it with wheat or vegetables, 4 at a time, until all 4 spots are filled. Rotten food is refused. Then right-click the Trough with an empty hand to take 1 Universal Feed." />
      </p>

      <WikiSectionHeading id="claiming">Claiming an animal</WikiSectionHeading>
      <ol className={`mt-4 list-decimal space-y-2 pl-5 ${body}`}>
        <li>Rename an Ownership Token at an anvil to the name you want for the animal.</li>
        <li>
          Right-click the animal with the token. Horses and other animals that need taming must be tamed first. The
          token is used up.
        </li>
        <li>Sneak and right-click the animal with an empty hand to see its owners, care, genetics and growth.</li>
      </ol>
      <p className={`mt-4 ${body}`}>
        You can claim cows, pigs, sheep, goats, chickens, horses, donkeys, mules, camels and llamas. Animals belong to
        the character who claimed them, but the limit of 15 counts every animal on your account, shared ones included.
        Bees are not part of husbandry.
      </p>
      <Callout title="Unclaimed animals vanish" variant="warning" className="mt-4">
        Livestock nobody owns is removed the next time its area loads, and it drops nothing if killed. Newborn cows,
        pigs, sheep, goats, chickens and llamas count as unowned even when both parents are yours, so claim them before
        you leave the pen. Wolves, cats and ocelots, tamed or not, are removed the same way and cannot be claimed.
        Owning an animal does not protect it from players, mobs or fire.
      </Callout>

      <WikiSectionHeading id="sharing">Sharing and renaming</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Right-click your animal with a Co-Ownership Token to link the token to it, then right-click another player with
        the token, or give it to them and let them right-click with it. Every owner can feed, clean, ride and breed the
        animal, and it counts towards each owner&apos;s limit. To rename an animal, use another named Ownership Token on
        it. The inspect menu also has a button to give up your ownership.
      </p>

      <WikiSectionHeading id="care" intro="An animal is happy when it is neither Hungry nor Dirty.">
        Feeding and cleaning
      </WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Every 4 to 8 hours that its area is loaded, an animal becomes Hungry or Dirty, shown next to its name. Feed a
        hungry animal 1 Universal Feed and clean a dirty one with the Glove. Each time you do, you get a little Farming
        experience.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Care" }, { header: "How it works" }]}
        rows={[
          ["Gaining care", "A happy animal gains 1 care per minute while its area is loaded, up to 200."],
          [
            "While you are away",
            "When the area unloads, a happy animal can still gain up to 8 hours' worth of care. After more than 8 hours unloaded, it is Hungry or Dirty when the area loads again.",
          ],
          [
            "Losing care",
            "If it stays Hungry or Dirty for more than 24 hours, it loses 1 care every 10 hours, even while unloaded.",
          ],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        Care counts whenever the area is loaded, by you or by anyone else. It does not matter whether the owner is
        online.
      </p>

      <WikiSectionHeading id="breeding">Breeding and growth</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Breed animals with their normal Minecraft breeding food. Both parents must be grown, fed, clean and not
        neutered. If either parent is owned, you must own both. Wild animals start with 0 to 20 genetics and 0 care.
      </p>
      <p className={`mt-3 ${body}`}>
        A baby gets about the average of its parents&apos; genetics plus a random boost, up to a maximum of 1,000. The
        boost grows with the parents&apos; care and shrinks as genetics get high. Parents with no care pass on only
        their average, so raise their care before breeding. Breeding food with a star rating matters too: 1-star food
        gives a fifth of the boost, while 5-star food or food with no stars gives all of it.
      </p>
      <p className={`mt-3 ${body}`}>
        Babies take 1 hour to grow up (chickens 45 minutes) and look like babies until then. They have to be grown
        before they can breed, give milk or eggs, or drop meat.
      </p>
      <Callout title="Neutering is permanent" className="mt-4">
        Right-click an animal you own with the Neutering Tool to stop it from ever breeding again.
      </Callout>

      <WikiSectionHeading id="products">Products</WikiSectionHeading>
      <DataTable
        className="mt-4"
        columns={[{ header: "Animal" }, { header: "While alive" }, { header: "When killed" }]}
        rows={[
          ["Cow", "Milk with a bucket every 20 minutes. Sheds leather now and then.", "Beef roast and leather"],
          ["Goat", "Milk with a bucket every 20 minutes. Shear for wool.", "Goat roast and wool"],
          ["Sheep", "Shear for wool, with extra wool from well-bred sheep.", "Mutton roast and wool"],
          ["Chicken", "Lays 1 egg an hour. Sheds feathers now and then.", "Chicken roast and feathers"],
          [
            "Pig",
            <WikiItemText key="pig" text="With 3 stars or more of genetics, now and then sheds Enchanted Dust." />,
            <WikiItemText key="pig-death" text="Pork roast, sometimes Enchanted Dust" />,
          ],
          ["Horse, donkey, mule, camel", "Nothing", "A roast of that animal and leather"],
          ["Llama", "Nothing", "Llama roast and feathers"],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        Only grown, happy animals lay eggs or shed, and shedding has a 15% chance every 4 hours. Wild cows and goats
        cannot be milked. A recently sheared sheep or goat drops no wool when killed. Carve roasts at a Meat Hook (see{" "}
        <Link href="/wiki/cooking#carving" className={link}>
          Cooking
        </Link>
        ).
      </p>

      <WikiSectionHeading
        id="quality"
        intro="Breeding raises what an animal can give. Care decides how much of it you get."
      >
        Genetics, care and quality
      </WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        An animal&apos;s <strong>effective genetics</strong> is its genetics multiplied by its care out of 200. At 200
        care it uses all its genetics, at 100 care only half. Effective genetics sets how much meat a roast holds: one
        more cut for every 125, up to the size of the roast. Chicken roasts always have at least two legs and one piece
        of chicken.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Genetics" }, { header: "Star tier" }]}
        rows={[
          ["0 to 199", "1 star"],
          ["200 to 399", "2 stars"],
          ["400 to 599", "3 stars"],
          ["600 to 799", "4 stars"],
          ["800 to 1,000", "5 stars"],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        Food quality rolls between the star tier of its effective genetics and the star tier of its raw genetics. For
        example, an animal with 800 genetics and 100 care has 400 effective genetics, so its food rolls 3 to 5 stars. At
        200 care, it always gives 5 stars. Raw genetics also unlocks rarer material drops at 3, 4 and 5 stars.
      </p>

      <WikiSectionHeading id="mounts">Mounts</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Owners can ride their horses, donkeys, mules, camels and llamas. Higher genetics and care give horses, donkeys
        and mules more health, speed and jump. Camels and llamas are the same however well they are bred. Inspect an
        animal to see its stats.
      </p>

      <WikiSectionHeading id="finding">Finding your animals</WikiSectionHeading>
      <CommandTable className="mt-4" commands={animalHusbandryCommands.commands} />

      <SeeAlso hrefs={["/wiki/cooking", "/wiki/farming", "/wiki/companion-pets", "/wiki/materials"]} />
    </WikiPage>
  );
}
