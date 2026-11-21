import Link from "next/link";
import {
  Callout,
  CompanionPetGallery,
  DataTable,
  ItemChip,
  SeeAlso,
  StationLink,
  WikiItemLink,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import WikiModelViewer from "@/app/components/wiki/WikiModelViewer";
import { companionPetTypes, petHousePreview } from "@/app/wiki/data/companion-pets";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

function AnimalStation() {
  return (
    <StationLink name="Animal Station">
      <ItemChip name="Animal Station" texture="/wiki/thumbnails/stations/animal-station.webp" link={false} />
    </StationLink>
  );
}

function MedicineStation() {
  return (
    <StationLink name="Medicine Station">
      <ItemChip name="Medicine Station" texture="/wiki/thumbnails/stations/medicine-station.webp" link={false} />
    </StationLink>
  );
}

export default function CompanionPetsPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
      title="Companion Pets"
      intro="A companion pet follows you around. You hatch it from an egg, name it, feed and brush it, play fetch with it and teach it tricks."
    >
      <WikiSectionHeading id="hatching">Getting a pet</WikiSectionHeading>
      <p className={body}>
        There are 20 kinds of pet: dogs, cats, a fox and a frog. Each pet has a personality, shown on its{" "}
        <a href="#care" className={link}>
          care sheet
        </a>
        : Friendly, Playful, Shy, Territorial or Grumpy.
      </p>
      <CompanionPetGallery />
      <p className={`mt-3 ${body}`}>
        Craft the eggs at the <AnimalStation />. Half of them (10) need the Forager perk{" "}
        <Link href="/wiki/classes#professions" className={link}>
          Pet Master
        </Link>
        . The other 10 need a{" "}
        <Link href="/wiki/characters#rank-benefits" className={link}>
          supporter rank
        </Link>{" "}
        instead. A recipe only appears in the station once you meet its requirement.
      </p>
      <p className={`mt-3 ${body}`}>
        A dog egg takes 16 bones and a cat egg 16 salmon. The fox egg takes 16 sweet berries and the frog egg 16 lily
        pads.
      </p>
      <DataTable
        caption="Companion egg crafting requirements"
        columns={[{ header: "Companion" }, { header: "Unlock" }]}
        rows={companionPetTypes.map((pet) => [
          pet.name,
          pet.unlock === "Pet Master" ? "Pet Master perk" : `${pet.unlock} rank or higher`,
        ])}
      />
      <p className={`mt-3 ${body}`}>
        A higher rank also gets every lower rank&apos;s eggs. The ranks go Noble, Gilded, Ascended, then Legacy.
      </p>
      <p className={`mt-3 ${body}`}>
        Ordinary wolves and cats can be companions too. Craft a Wolf Spawn Egg or Cat Spawn Egg at the Animal Station,
        which needs the Forager perk Breeder I.
      </p>
      <p className={`mt-3 ${body}`}>
        You must be playing a character to hatch an egg. You also need the same perk or rank that its recipe asks for.
        Without it the game tells you &quot;You don&apos;t know how to hatch this egg&quot;.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>Hold the egg in your main hand and right-click a block or the air.</li>
        <li>Chat asks for a name. Type one of up to 32 characters, or type &quot;cancel&quot; to keep the egg.</li>
        <li>Type &quot;yes&quot; to confirm. Chat answers with &quot;Toby has hatched! Welcome to the family.&quot;</li>
      </ol>
      <p className={`mt-3 ${body}`}>
        The egg is only used up when you confirm. If you don&apos;t answer within 60 seconds, you keep it.
      </p>
      <p className={`mt-3 ${body}`}>
        A fox lets you choose a boy or a girl (&quot;male&quot; or &quot;female&quot;). Every other pet&apos;s sex is
        random.
      </p>

      <WikiSectionHeading id="limits">Limits and ownership</WikiSectionHeading>
      <ul className={`list-disc space-y-2 pl-5 ${body}`}>
        <li>
          You can own 20 pets per account and have 3 of them out in the world at once. Both limits count all your
          characters together.
        </li>
        <li>You can&apos;t hatch an egg while 3 pets are out.</li>
        <li>
          Pets and Pet Houses belong to the character that hatched or placed them. After you switch character you only
          see that character&apos;s pets.
        </li>
        <li>
          A{" "}
          <Link href="/wiki/characters#wills" className={link}>
            will
          </Link>{" "}
          passes them to your heir.
        </li>
      </ul>

      <WikiSectionHeading id="care">Looking after your pet</WikiSectionHeading>
      <p className={body}>
        Sneak and right-click a pet with an empty hand to open its care sheet. It shows the pet&apos;s name, species,
        sex and age and a line about its condition. It has a bar for each of the pet&apos;s 5 needs: Hunger, Mood,
        Energy, Cleanliness and Health. It also shows the pet&apos;s Bond (Wary, Friendly, Loyal or Devoted),
        Personality and Favourite Toy.
      </p>
      <p className={`mt-3 ${body}`}>
        Anyone can open the care sheet, feed your pet, brush it and give it medicine. Only you can train, rename, store
        or release it, so only you see the buttons <strong>Tricks</strong>, <strong>Send to Pet House</strong> (
        <strong>Bring out</strong> for a stored pet) and <strong>Release forever</strong>. To rename your pet, click the
        name tag on the care sheet, type the new name in chat and confirm with &quot;yes&quot;.
      </p>
      <p className={`mt-3 ${body}`}>
        Right-click your pet with an empty hand, without sneaking, to pet it. It shows you its most urgent problem:
        illness first, then hunger, energy, cleanliness and mood. If nothing is wrong, its mood rises. You also get a
        warning above your hotbar when one of your pet&apos;s needs runs low.
      </p>
      <p className={`mt-3 ${body}`}>
        Meals, treats, the Pet Brush and the crafted toys are made at the Animal Station.
      </p>
      <DataTable
        caption="Care items for every pet, including frogs"
        columns={[{ header: "What you want to do" }, { header: "Item you need" }, { header: "How to use it" }]}
        rows={[
          [
            "Feed your pet",
            <>
              <WikiItemLink name="Meat Meal" /> or <WikiItemLink name="Fish Meal" />
            </>,
            "Right-click the pet.",
          ],
          ["Brush it", <WikiItemLink key="item" name="Pet Brush" />, "Right-click the pet. You keep the brush."],
          [
            "Treat a sick pet",
            <WikiItemLink key="item" name="Pet Medicine" />,
            <>
              Made at the <MedicineStation />. Everyone sees the recipe, but crafting it needs the{" "}
              <Link href="/wiki/medicine#physician" className={link}>
                Physician
              </Link>{" "}
              perk. Right-click a pet that is sick or too weak to stand.
            </>,
          ],
          [
            "Train it",
            <>
              <WikiItemLink name="Fish Snack" /> or <WikiItemLink name="Biscuit Treat" />
            </>,
            <>
              Right-click your well-fed pet to start, then reward its tries (see{" "}
              <a href="#training" className={link}>
                Teaching tricks
              </a>
              ).
            </>,
          ],
          [
            "Play fetch",
            <>
              A stick, <WikiItemLink name="Pet Ball" />, <WikiItemLink name="Bone Plush" />,{" "}
              <WikiItemLink name="Tug Rope" />, <WikiItemLink name="Mouse Plush" /> or{" "}
              <WikiItemLink name="Teddy Bear Plush" />
            </>,
            <>
              Throw it for your pet (see{" "}
              <a href="#play" className={link}>
                Playing fetch
              </a>
              ).
            </>,
          ],
          [
            "Keep your pets in a Pet House",
            <WikiItemLink key="item" name="Pet House" />,
            <>
              Craft it at the Animal Station, place it and right-click it (see{" "}
              <a href="#shelter" className={link}>
                The Pet House
              </a>
              ).
            </>,
          ],
          ["Pet it or check on it", "Empty hand", "Right-click the pet."],
        ]}
      />
      <p className={`mt-3 ${body}`}>Food, medicine and the treats you give as rewards are used up.</p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <strong>Hunger:</strong> a starving pet sits down, stops following you and won&apos;t train, fetch or play.
          Food given to a pet whose hunger is completely full is wasted and lowers its mood.
        </li>
        <li>
          <strong>Energy:</strong> it comes back while the pet sits or lies down. Tell it to Sit or Lay once it knows
          those{" "}
          <a href="#training" className={link}>
            tricks
          </a>{" "}
          (a frog only has Lay). An exhausted pet lies down and sleeps by itself, and wakes when it is rested. Stay
          doesn&apos;t count as rest because the pet keeps standing. Energy doesn&apos;t come back in the Pet House
          either.
        </li>
        <li>
          <strong>Mood:</strong> petting, fetch and treats raise it. Training lowers it a little.
        </li>
        <li>
          <strong>Cleanliness:</strong> one stroke of the Pet Brush cleans your pet fully. A filthy pet moves slower.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        A need left very low makes your pet unwell, and it moves slower. It gets well again once you fix its needs. If
        you leave it longer it becomes sick. A sick pet stays slow and refuses to play, fetch or train, and its health
        can drain until it is too weak to stand.
      </p>
      <p className={`mt-3 ${body}`}>
        Health comes back by itself once the pet is fed, brushed and rested. Pet Medicine gives a quick boost but does
        nothing for a pet that is only unwell. Your pet also recovers without it.
      </p>
      <p className={`mt-3 ${body}`}>Nothing can hurt a pet, and neglect never kills it.</p>
      <p className={`mt-3 ${body}`}>
        Needs fall at their normal pace only while you are near your pet. If you are online but far away they fall much
        more slowly, and the pet whines for you. They stop falling while you are offline and while the pet is in a Pet
        House.
      </p>
      <p className={`mt-3 ${body}`}>
        Bond grows while your pet is near you and all its needs are fine. It shrinks while the pet is ill. A pet with a
        higher Bond follows you closer and faster, and learns tricks faster.
      </p>

      <WikiSectionHeading id="play">Playing fetch</WikiSectionHeading>
      <p className={body}>
        Hold a toy and the pets following you notice it. Right-click the air to throw it. Sneak while you throw for a
        softer throw. The pet brings the toy back and its mood rises. If several pets are following you, they race for
        it.
      </p>
      <p className={`mt-3 ${body}`}>
        Each pet has a favourite toy, picked when it hatches. Fetching that one cheers it up more.
      </p>
      <p className={`mt-3 ${body}`}>
        A pet only chases a toy while it is following you. It stays put after Sit, Stay or Lay, and it won&apos;t chase
        while it is starving, exhausted, sick, asleep or training.
      </p>

      <WikiSectionHeading id="training">Teaching tricks</WikiSectionHeading>
      <p className={body}>
        Every pet knows Follow from the moment it hatches. You can teach it Come, Sit, Stay, Lay, Shake Paw, Speak and
        Jump. A frog learns Come, Stay, Jump, Lay, Tongue and Croak instead.
      </p>
      <p className={`mt-3 ${body}`}>
        You choose your own word for each trick. The pet has to be yours, well fed and not exhausted or sick. A hungry
        pet just eats the treat.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Hold a <WikiItemLink name="Fish Snack" /> or <WikiItemLink name="Biscuit Treat" /> and right-click your pet.
        </li>
        <li>Look at the pet, or say its name, and type any word or short phrase in chat.</li>
        <li>
          A <strong>Choose a trick</strong> menu opens. Pick the trick that word should mean.
        </li>
        <li>
          Say the word again. The pet tries, and you are told how it went: &quot;Nailed it!&quot;, &quot;Almost got
          it&quot; or &quot;Doesn&apos;t get it yet&quot;.
        </li>
        <li>To reward that try, right-click the pet with the treat within about 5 seconds.</li>
        <li>
          Keep saying the word and rewarding tries until you see &quot;Learned&quot; and the trick&apos;s name, such as
          &quot;Learned Sit!&quot;.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Your pet gets it wrong at first. Rewarding a near miss teaches it a little. Once it is &quot;catching on&quot;,
        rewarding a success teaches it fast. A pet in a good mood learns faster.
      </p>
      <p className={`mt-3 ${body}`}>
        The session ends if you put the treat away, run out of treats, walk away or send the pet to the Pet House. It
        also ends if the pet gets too hungry, tired or ill. After a few tries your pet needs a short break, and its
        progress is kept. One trick can have several words.
      </p>
      <p className={`mt-3 ${body}`}>
        A learned trick needs no treat. Look at your pet and say the word, or put its name before or after the word, as
        in &quot;Toby sit&quot;. Saying only its name calls a following pet over to you. Orders are normal chat, so
        other players can see them.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Come brings the pet to you. It then goes back to Sit, Stay or Lay if it was told one of them.</li>
        <li>Follow gets the pet up and keeps it with you. A starving, exhausted or ill pet won&apos;t follow.</li>
        <li>Sit, Stay and Lay last until you say Follow, even across server restarts.</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        The <strong>Tricks</strong> button on the care sheet lists the tricks your pet has learned, the ones it is
        practising and the ones it doesn&apos;t know yet, along with your words for them.
      </p>

      <WikiSectionHeading id="shelter">The Pet House</WikiSectionHeading>
      <p className={body}>
        Craft a <WikiItemLink name="Pet House" /> at the Animal Station from 8 oak planks and 2 white wool. Place it
        like furniture, with a plain right-click.
      </p>
      <p className={`mt-3 ${body}`}>
        Right-click the Pet House to list every pet your character owns. Click a pet, then <strong>Bring out</strong> or{" "}
        <strong>Send to Pet House</strong>. Every Pet House you own shows the same list, and{" "}
        <strong>Send to Pet House</strong> on the care sheet works with no Pet House nearby.
      </p>
      <p className={`mt-3 ${body}`}>Only you can open your Pet House. Breaking or moving it leaves your pets safe.</p>
      <div className="my-5">
        <WikiModelViewer {...petHousePreview} label="Pet House" height="sm" />
      </div>
      <Callout variant="warning">
        <strong>Release forever</strong> on the care sheet asks you to confirm in chat. Type &quot;yes&quot; within 60
        seconds and the pet is gone for good, which frees one of your 20 slots. You keep the pet if you type
        &quot;no&quot; or don&apos;t answer.
      </Callout>

      <SeeAlso hrefs={["/wiki/animal-husbandry", "/wiki/characters", "/wiki/server-features"]} />
    </WikiPage>
  );
}
