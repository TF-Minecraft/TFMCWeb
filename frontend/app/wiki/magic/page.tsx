import Link from "next/link";
import {
  CommandTable,
  DataTable,
  SeeAlso,
  StationLink,
  WikiItemLink,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import { magicCommands } from "../data/magic";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

export default function MagicPage() {
  return (
    <WikiPage
      lastModified="2026-10-23"
      title="Magic"
      width="lg"
      intro={
        <>
          Mages cast spells from runes set into a weapon they build themselves. Each spell belongs to a school of magic,
          and it only works if both you and your weapon are strong enough in that school. This page covers the schools,
          your own magical skill and how to raise it. Building, charging and using the weapon is on{" "}
          <Link href="/wiki/mage-weapons" className={link}>
            Mage Weapons
          </Link>
          .
        </>
      }
    >
      <WikiSectionHeading id="basics">The basics</WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Only the <strong>Mage</strong> class can use Mage Staffs, Mage Wands, Mage Blades and Mage Armour. Mage gear
          is expensive, so plan for the cost.
        </li>
        <li>
          There are four schools: <strong>Cerrith</strong>, <strong>Oseni</strong>, <strong>Seithr</strong> and{" "}
          <strong>Mitlan</strong>. Each has its own spells, shrines and Resonance.
        </li>
        <li>
          Your magic belongs to your character. A second character starts from nothing, and{" "}
          <code className="text-[var(--tfmc-accent)]">/resonance</code> only opens while you play a character.
        </li>
      </ul>
      <DataTable
        columns={[{ header: "Term", nowrap: true, width: "10rem" }, { header: "What it means" }]}
        rows={[
          ["Resonance", "Your skill in one school, from 0 to 100. You raise it by meditating."],
          ["Aura", "Magical energy of one school. Shrines fill artifacts and charges with it."],
          ["Artifact", "A magical object that stores aura. You meditate with artifacts to gain Resonance."],
          [
            "Enchanted Charge",
            <>
              A single-use item you fill at a shrine and then spend to attune a{" "}
              <Link href="/wiki/mage-weapons#attuning" className={link}>
                mage weapon
              </Link>
              .
            </>,
          ],
          ["Equilibrium", "Your balance between Corruption and Tranquility. Casting and meditating move it."],
          ["Mental Points", "Your focus. Meditation and Research both use it up."],
        ]}
      />

      <WikiSectionHeading
        id="resonance"
        intro="Open /resonance to see your Resonance in each school, from 0 up to 100."
      >
        Resonance and spell tiers
      </WikiSectionHeading>
      <p className={body}>
        Every spell has a tier from I to IV, and the size of its rune tells you which: a Minor rune holds a tier I
        spell, a Lesser rune tier II, a Greater rune tier III and an Ascendant rune tier IV. To cast a spell, your
        Resonance in its school must reach that tier, and so must your weapon&apos;s attunement in that school.
      </p>
      <DataTable
        columns={[{ header: "Tier" }, { header: "Resonance needed", align: "right" }, { header: "Rune size" }]}
        rows={[
          ["I", "10", "Minor"],
          ["II", "35", "Lesser"],
          ["III", "65", "Greater"],
          ["IV", "95", "Ascendant"],
        ]}
      />
      <ul className={`mt-4 list-disc space-y-2 pl-5 ${body}`}>
        <li>A new character has no Resonance, so even tier I spells need some meditation first.</li>
        <li>
          Low Resonance makes a school&apos;s spells cost more mana, deal less damage and take longer to recharge. High
          Resonance does the opposite. Hover a school in /resonance to see how it affects you right now.
        </li>
        <li>Resonance slowly fades while you are online. Time spent offline does not count.</li>
      </ul>

      <WikiSectionHeading id="shrines" intro="A shrine fills artifacts and Enchanted Charges with aura.">
        Shrines
      </WikiSectionHeading>
      <p className={body}>
        A shrine is a <WikiItemLink name="Pedestal" /> and everything within 4 blocks of it in every direction, above
        and below included. Build that space with blocks that suit a school. A mix of different fitting blocks works
        better than a lot of one kind. Each school is scored on its own, so one shrine can serve more than one.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Put an artifact or a charge on the pedestal and it slowly fills with aura.</li>
        <li>
          A blank charge first takes on every school the shrine gives. &quot;This shrine holds nothing for the
          charge&quot; means the shrine is not strong enough in any school yet.
        </li>
        <li>
          A shrine can only fill up to its own strength, so a weak shrine never fills a strong charge to the top.
          &quot;There is no aura to be gathered from this shrine&quot; means it has nothing more to give that item.
        </li>
        <li>A pedestal that is part of a meditation ring does not fill anything.</li>
      </ul>

      <WikiSectionHeading id="artifacts" intro="Artifacts are what you meditate with, so look after them.">
        Artifacts
      </WikiSectionHeading>
      <p className={body}>
        An artifact&apos;s tooltip lists how much aura it holds in each school. Aura stored in an artifact never fades
        on its own, but two things reduce what it gives you.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <strong>Muffling.</strong> An artifact holding aura becomes muffled while it sits in a chest or any other
          container, and a muffled artifact gives less when you meditate. Its tooltip shows a Muffled percentage. Keep
          artifacts in your inventory, on a <WikiItemLink name="Pedestal" />, on an{" "}
          <WikiItemLink name="Artifact Display" /> or in an item frame. There they slowly recover.
        </li>
        <li>
          <strong>Use.</strong> Every bit of Resonance an artifact gives anyone wears it out. Once it has been used, its
          tooltip shows its Integrity. At the end it crumbles into a spent husk with no aura, which only the{" "}
          <Link href="/wiki/recycler" className={link}>
            Recycler
          </Link>{" "}
          will take.
        </li>
      </ul>

      <WikiSectionHeading id="meditation" intro="Meditating in a ring of artifacts is how you raise your Resonance.">
        Meditation
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Place 8 <WikiItemLink name="Pedestal">pedestals</WikiItemLink> around a centre block, level with it: one 4
          blocks north, south, east and west, and one on each diagonal, 3 blocks across and 3 blocks along. The ring
          does not need to be a shrine.
        </li>
        <li>Put artifacts on the pedestals. You gain Resonance in the schools those artifacts hold.</li>
        <li>
          Sit on the centre block, for example with <code className="text-[var(--tfmc-accent)]">/sit</code>. Meditation
          starts by itself.
        </li>
        <li>
          A white orb appears where you are looking. Look at it and left-click to begin. More orbs then circle you. Each
          one you hit raises your Resonance and uses one Mental Point.
        </li>
        <li>
          Blue orbs move your Equilibrium toward Tranquility and red orbs toward Corruption. Hitting a red orb makes you
          lose focus, and only red orbs appear for a few seconds.
        </li>
        <li>Stand up to stop.</li>
      </ol>
      <DataTable
        columns={[{ header: "Message", nowrap: true }, { header: "What it means" }]}
        rows={[
          ["Can't meditate here, no artifacts", "None of the pedestals holds an artifact with aura."],
          [
            "Nothing to gain from meditating here",
            "You already have as much Resonance as this ring can give you in every school it holds.",
          ],
          ["Meditation complete at this site", "You reached that limit during this sitting."],
          ["You are too tired to meditate now", "You are out of Mental Points. Come back once they refill."],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        A ring can only raise you as high as your share of its aura. Everyone who meditated with an artifact in the past
        week shares it, so a ring used by several mages gives each of them less.
      </p>

      <WikiSectionHeading id="mental-points" intro="Your focus, shown in /resonance. A new character starts full.">
        Mental Points
      </WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Every orb you hit while meditating uses one, and so does every{" "}
          <Link href="/wiki/research" className={link}>
            Research
          </Link>{" "}
          experiment. Both draw from the same pool.
        </li>
        <li>
          They refill a little every hour, even while you are offline. Wisdom and Intelligence make them refill faster.
        </li>
        <li>
          A Focus Potion restores 50. Potion Brewers make them at the <StationLink name="Alchemy Station" />.
        </li>
      </ul>

      <WikiSectionHeading id="cast-mode" intro="Pick a cast mode in /resonance. Flow is the default.">
        Surge and Flow
      </WikiSectionHeading>
      <p className={body}>
        Every spell you cast moves your Equilibrium: toward Corruption in <strong>Surge</strong> and toward Tranquility
        in <strong>Flow</strong>. Both sides make your spells cheaper, stronger or quicker to recharge, and the effect
        grows the further you go.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <strong>Corruption</strong> pays off early. Once you have some, it keeps growing on its own, faster the deeper
          you are, and its bonus weakens again near the extreme.
        </li>
        <li>
          <strong>Tranquility</strong> has to build up before it helps much, but its bonus ends up stronger. It slowly
          fades back toward the middle if you stop.
        </li>
      </ul>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={magicCommands.commands} showNotes={false} />

      <SeeAlso hrefs={["/wiki/mage-weapons", "/wiki/research", "/wiki/recycler", "/wiki/stations"]} />
    </WikiPage>
  );
}
