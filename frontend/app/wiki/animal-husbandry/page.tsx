import Link from "next/link";

import {
  Callout,
  CommandTable,
  DataTable,
  SeeAlso,
  StationLink,
  WikiItemLink,
  WikiItemText,
  WikiPage,
  WikiSectionHeading,
  wikiBodyText as body,
} from "@/app/components/wiki";
import { animalHusbandryCommands } from "../data/animal-husbandry";

const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";

export default function AnimalHusbandryPage() {
  return (
    <WikiPage
      title="Animal Husbandry"
      lastModified="2026-11-21"
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
            "1 Iron Nugget",
            "Claiming or renaming an animal. Used up.",
          ],
          [
            <WikiItemLink key="co-ownership" name="Co-Ownership Token" />,
            "1 Iron Nugget",
            "Sharing an animal with another player. Used up.",
          ],
          [<WikiItemLink key="glove" name="Glove" />, "2 Leather", "Cleaning a dirty animal. Not used up."],
          [
            <WikiItemLink key="neutering" name="Neutering Tool" />,
            "2 Iron Ingots",
            "Stopping an animal from breeding. Used up.",
          ],
          [<WikiItemLink key="trough" name="Trough" />, "1 Oak Planks", "Making Universal Feed."],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        <WikiItemText text="To make Universal Feed, place a Trough. The Trough has 4 slots. Right-click it holding wheat or a vegetable to fill one slot, which takes 4 of that item. When all 4 slots are full, right-click it with an empty hand to take 1 Universal Feed. Rotten food is refused." />
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
        Livestock nobody owns is removed the next time a player comes near it, and it drops nothing if killed. Newborn
        cows, pigs, sheep, goats, chickens and llamas count as unowned even when both parents are yours, so claim them
        before you leave the pen. Wolves, cats and ocelots, tamed or not, are removed the same way and cannot be
        claimed. Owning an animal does not protect it from players, mobs or fire.
      </Callout>

      <WikiSectionHeading id="sharing">Sharing and renaming</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Right-click your animal with a Co-Ownership Token to link the token to it. Then right-click another player with
        the token, or give it to them. They can right-click anything while holding it: the air, a block, the animal or a
        player. The token is used up when the share works. Every owner can feed, clean, ride and breed the animal, and
        it counts towards each owner&apos;s limit. To rename an animal, use another named Ownership Token on it. The
        inspect menu also has a button to give up your ownership.
      </p>

      <WikiSectionHeading id="care" intro="An animal is happy when it is neither Hungry nor Dirty.">
        Feeding and cleaning
      </WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Every 4 to 8 hours that a player is nearby, an animal becomes Hungry or Dirty, shown next to its name. Feed a
        hungry animal 1 Universal Feed and clean a dirty one with the Glove. Each time you do, you get a little Forager
        EXP.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Care" }, { header: "How it works" }]}
        rows={[
          ["Gaining care", "A happy animal gains 1 care per minute while a player is nearby, up to 200."],
          [
            "While you are away",
            "With nobody nearby, a happy animal can still gain up to 8 hours' worth of care. If nobody comes near for more than 8 hours, it is Hungry or Dirty when someone does.",
          ],
          [
            "Losing care",
            "If it stays Hungry or Dirty for more than 24 hours, it loses 1 care every 10 hours, even with nobody nearby.",
          ],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        Care counts whenever any player is nearby, not only you. It does not matter whether the owner is online.
      </p>

      <WikiSectionHeading id="breeding">Breeding and growth</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Breeding most animals needs the Forager perk Breeder IV, bought in <code className={code}>/profession</code>.
        Breeding gives Forager EXP. Breed animals with their normal Minecraft breeding food. Both parents must be grown,
        fed, clean and not neutered. If either parent is owned, you must own both. Wild animals start with 0 to 20
        genetics and 0 care.
      </p>
      <p className={`mt-3 ${body}`}>
        Babies inherit genetics from their parents, with a boost that improves when the parents are well cared for.
        Raise both parents' care before breeding. Higher-star breeding food also helps. Plain food with no star rating
        counts as 5-star. Genetics can reach 1,000 through breeding.
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
        Only grown, happy animals lay eggs or shed. Wild cows and goats cannot be milked. A recently sheared sheep or
        goat drops no wool when killed. Carve roasts at a Meat Hook (see{" "}
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
      <p className={`mt-4 ${body}`}>Well-bred animals kept fed and clean give more meat and better food.</p>
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
        Better genetics raise food quality, and high care makes that quality more consistent. Genetics alone unlocks
        rarer material drops at 3, 4 and 5 stars.
      </p>

      <WikiSectionHeading id="mounts">Mounts</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Owners can ride their horses, donkeys, mules, camels and llamas. Higher genetics and care give horses, donkeys
        and mules more health, speed and jump. Camels and llamas are the same however well they are bred. Inspect an
        animal to see its stats.
      </p>

      <WikiSectionHeading id="finding">Finding your animals</WikiSectionHeading>
      <CommandTable className="mt-4" commands={animalHusbandryCommands.commands} />
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        Right-click an <StationLink name="Animal Station" /> to craft a <WikiItemLink name="Mount Whistle" />. Blow it
        with a right-click and every horse, donkey, mule, llama and trader llama within 64 blocks glows for 5 seconds,
        so you can spot it through walls. It finds all of them, not only yours, and chat tells you how many answered.
        Camels do not answer. Other players can hear the whistle, and it has a 3-second cooldown.
      </p>

      <SeeAlso hrefs={["/wiki/cooking", "/wiki/farming", "/wiki/companion-pets", "/wiki/materials"]} />
    </WikiPage>
  );
}
