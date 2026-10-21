import Link from "next/link";
import {
  Callout,
  CommandTable,
  DataTable,
  SeeAlso,
  StationLink,
  StatGrid,
  WikiItemLink,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import {
  armorRunestoneRecipes,
  enchantedChargeRecipes,
  magicCommands,
  magicStationRecipe,
  runeStationRecipe,
  runestoneRecipes,
} from "../data/magic";

export default function MagicPage() {
  return (
    <WikiPage
      lastModified="2026-10-20"
      title="Magic"
      width="lg"
      intro={
        <>
          Mages cast spells from <strong>runes</strong> set into a staff, wand or blade. You build the weapon at a{" "}
          <StationLink name="Magic Station" />, attune it to an element with aura gathered at a shrine, and raise your
          own <strong>Resonance</strong> by meditating. A spell only casts if your Resonance in its element is high
          enough.
        </>
      }
    >
      <WikiSectionHeading id="vocabulary" intro="Terms used on the rest of this page.">
        Key terms
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Term", nowrap: true, width: "11rem" }, { header: "What it means" }]}
        rows={[
          [
            "Element",
            "A school of magic: Cerrith, Oseni, Seithr or Mitlan. Each element has its own runes, shrines and Resonance.",
          ],
          [
            "Resonance",
            "Your character's skill in one element, from 0 to 100. Each spell needs a minimum Resonance in its element. Higher Resonance also lowers mana cost and cooldowns and raises damage.",
          ],
          [
            "Aura",
            "Magical energy stored in artifacts and charges. A shrine fills them with aura, and you spend a charge's aura to attune a weapon. Aura stored in an artifact never fades.",
          ],
          [
            "Artifact",
            "A magical object that holds aura. On a pedestal in a shrine it fills with aura. In a meditation ring it lets you meditate.",
          ],
          [
            "Shrine",
            "A pedestal and the blocks around it. The blocks you build around the pedestal decide which elements the shrine gives.",
          ],
          ["Enchanted Charge", "A single-use item. You fill it at a shrine, then spend it to attune a weapon."],
          [
            "Socket",
            "A slot in a finished weapon that holds one spell rune. Sockets come in four sizes: Minor, Lesser, Greater and Ascendant. A socket takes a rune of its own size or smaller.",
          ],
          [
            "Attunement",
            "Locking an element into a weapon by spending a charge on it. A weapon with no element will not cast.",
          ],
          [
            "Equilibrium",
            "Your balance between Corruption and Tranquility, shown in /resonance. Your cast mode decides which way it moves.",
          ],
          [
            "Rift",
            "The chance, in percent, that a cast fails. A weapon gains Rift when you hit the wrong orbs while attuning it.",
          ],
        ]}
      />

      <Callout variant="note" title="Magic progress belongs to your character">
        Resonance and Equilibrium are stored on your active character, so a second character starts from zero.{" "}
        <code className="text-[var(--tfmc-accent)]">/resonance</code> does not open without an active character.
      </Callout>

      <WikiSectionHeading id="loop">Getting started as a mage</WikiSectionHeading>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>
          <strong>Be a Mage.</strong> Only Mages can use Mage Staffs, Mage Wands, Mage Blades and Mage Armor. Mage gear
          is expensive, so plan for the cost.
        </li>
        <li>
          <strong>Build a weapon.</strong> Craft and place a <StationLink name="Magic Station" />, right-click it to
          open the assembly menu, and put the parts together. See{" "}
          <a href="#archetypes" className="text-[var(--tfmc-accent)] hover:underline">
            Archetypes
          </a>{" "}
          for the parts each weapon needs.
        </li>
        <li>
          <strong>Fill a charge.</strong> Craft an Enchanted Charge at the <StationLink name="Rune Station" /> and place
          it on a <WikiItemLink name="Pedestal">pedestal</WikiItemLink> in a shrine.
        </li>
        <li>
          <strong>Attune the weapon.</strong> Hold the filled charge and right-click the weapon on its{" "}
          <StationLink name="Magic Station" />. This starts the orb minigame, which decides how much of the charge the
          weapon keeps. The station keeps a new weapon until it has been attuned.
        </li>
        <li>
          <strong>Take the weapon.</strong> Right-click the station with an empty hand.
        </li>
        <li>
          <strong>Charge it again later.</strong> Hold the weapon and right-click an empty{" "}
          <StationLink name="Magic Station" /> to set it down, then attune it with another charge. A later charge can
          only raise the weapon&apos;s attunement, never lower it.
        </li>
        <li>
          <strong>Start over.</strong> To clear a weapon&apos;s attunement instead, sneak and right-click an empty{" "}
          <StationLink name="Magic Station" /> while holding it. Chat shows the fee, half the materials of the
          weapon&apos;s parts. Sneak and right-click again to pay it. The next charge that stores anything replaces the
          old attunement and its Rift. Until then, when no charge is running, sneak and left-click the station to take
          the weapon and the fee back.
        </li>
        <li>
          <strong>Add runes.</strong> Put spell runes into the weapon&apos;s sockets. Every spell comes from a rune, so
          a weapon with no runes casts nothing.
        </li>
        <li>
          <strong>Raise your Resonance</strong> by meditating. A new character starts with none, and even the weakest
          spells need some.
        </li>
        <li>
          <strong>Cast.</strong> Hold the weapon and use the rune&apos;s casting key. The default is right-click.
        </li>
      </ol>

      <WikiSectionHeading id="cast-mode" intro="Choose a cast mode in /resonance. Flow is the default.">
        Surge and Flow
      </WikiSectionHeading>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Every spell you cast moves your Equilibrium. In <strong>Surge</strong> it moves toward Corruption, and in{" "}
        <strong>Flow</strong> toward Tranquility. Meditation moves it too, but there the orb you hit decides the
        direction, not your cast mode (see{" "}
        <a href="#meditation" className="text-[var(--tfmc-accent)] hover:underline">
          Meditation
        </a>
        ). Both sides make your spells cheaper, stronger or quicker to recharge, and the effect grows the further you
        go.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>
          <strong>Corruption</strong> gives its bonus early. Once you have any, it keeps growing on its own, faster the
          deeper you are, and its bonus gets weaker again near the extreme.
        </li>
        <li>
          <strong>Tranquility</strong> needs to build up before it helps much, but its bonus ends up stronger. It slowly
          fades back toward neutral if you stop.
        </li>
      </ul>

      <WikiSectionHeading id="shrines" intro="A shrine fills artifacts and charges with aura.">
        Shrines
      </WikiSectionHeading>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        A shrine is a <WikiItemLink name="Pedestal" /> and everything within 4 blocks of it in every direction, above
        and below included. Build that space with blocks that suit an element, and use a mix of different matching
        blocks rather than one kind. A shrine scores each element separately, so one shrine can serve more than one.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Put an artifact or a charge on the pedestal and it starts filling with aura. A blank charge first takes on every
        element the shrine gives. A weak shrine cannot fill a high-tier charge. A pedestal that is part of a meditation
        ring does not fill anything.
      </p>

      <WikiSectionHeading id="station" intro="A plain vanilla 3x3 craft. Anyone can make one.">
        The <StationLink name="Magic Station" />
      </WikiSectionHeading>
      <div className="mt-4">
        <CraftingGrid recipe={magicStationRecipe} />
      </div>
      <WikiSectionHeading
        id="rune-station"
        intro="A second vanilla 3x3 craft: the Magic Station pattern without the Amethyst Shard. Anyone can make one."
      >
        The <StationLink name="Rune Station" />
      </WikiSectionHeading>
      <div className="mt-4">
        <CraftingGrid recipe={runeStationRecipe} />
      </div>
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        The Rune Station turns <WikiItemLink name="Enchanted Dust">Enchanted Dust</WikiItemLink> into blank runestones,
        armor runestones and Enchanted Charges. Every recipe takes 10 seconds and needs nothing but dust.
      </p>
      <DataTable
        columns={[
          { header: "Tier" },
          { header: "Runestone", align: "right" },
          { header: "Armor Runestone", align: "right" },
          { header: "Enchanted Charge", align: "right" },
        ]}
        rows={["Minor", "Lesser", "Greater", "Ascendant"].map((tier, i) => [
          tier,
          `${runestoneRecipes[i].ingredients[0].qty}x Enchanted Dust`,
          `${armorRunestoneRecipes[i].ingredients[0].qty}x Enchanted Dust`,
          `${enchantedChargeRecipes[i].ingredients[0].qty}x Enchanted Dust`,
        ])}
      />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...runestoneRecipes, ...armorRunestoneRecipes].map((recipe) => (
          <CraftingGrid key={recipe.key} recipe={recipe} />
        ))}
      </div>

      <WikiSectionHeading
        id="rune-fit"
        intro="A socket takes a rune of its own tier or any tier below it. It never takes a bigger one."
      >
        Which rune fits which gear
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Craft quality of the gear" }, { header: "Socket it gets" }, { header: "Rune that fits" }]}
        rows={[
          ["Rusted", "None", "Nothing"],
          ["Tempered", "Minor", "Minor"],
          ["Polished", "Lesser", "Minor, Lesser"],
          ["Gleaming", "Greater", "Minor, Lesser, Greater"],
          ["Masterwork", "Ascendant", "Any tier"],
        ]}
      />
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>
          <strong>The socket comes from how well the piece was crafted, not from its material.</strong> Iron Mage armour
          can take an Ascendant Armor Rune, but only if that piece came out Masterwork. A Tempered iron piece has a
          Minor socket, so a Minor Armor Rune is the most it will ever hold.
        </li>
        <li>
          Armor runes go on Mage armour only. Every other armour piece has a Gemstone socket instead, and an armor rune
          will not fit it.
        </li>
        <li>
          Armor runes and weapon runes are separate: an armor rune never fits a staff, wand or blade, and a spell rune
          never fits armour.
        </li>
        <li>
          A smaller rune in a bigger socket works, but it uses that socket up. If a piece has several sockets, the rune
          goes into the smallest one that can hold it.
        </li>
        <li>
          Check the socket line in the item&apos;s lore before you spend the dust. It names the biggest size the piece
          accepts.
        </li>
      </ul>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Quality is decided while smithing, see{" "}
        <Link href="/wiki/advanced-crafting#quality" className="text-[var(--tfmc-accent)] underline underline-offset-2">
          Advanced Crafting
        </Link>
        .
      </p>

      <WikiSectionHeading id="archetypes" intro="Three weapon shapes, each wanting a different set of parts.">
        Archetypes
      </WikiSectionHeading>
      <DataTable
        columns={[
          { header: "Archetype", nowrap: true },
          { header: "In-game name" },
          { header: "Melee", nowrap: true },
          { header: "Parts it needs" },
        ]}
        rows={[
          ["Staff", "Mage Staff", "No", "Core, Handle, Tome x3"],
          ["Wand", "Wand", "No", "Core, Handle, Tome"],
          ["Sword", "Mage Blade", "Yes", "Core, Handle, Tome"],
        ]}
      />

      <WikiSectionHeading id="charges" intro="A single-use item that carries aura from a shrine to your weapon.">
        Enchanted Charges
      </WikiSectionHeading>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Charges are crafted at the <StationLink name="Rune Station" /> from Enchanted Dust: 4, 8, 12 and 16 dust for
        tiers I to IV.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {enchantedChargeRecipes.map((recipe) => (
          <CraftingGrid key={recipe.key} recipe={recipe} />
        ))}
      </div>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        The band printed on a charge, such as &quot;Cerrith II&quot;, shows how much aura of that element it holds:
        under 10 shows a dash, 10 is I, 35 is II, 65 is III and 95 is IV. Spells use the same bands for Resonance, so a
        spell that needs Cerrith II needs at least 35 Cerrith Resonance.
      </p>
      <WikiSectionHeading
        id="orbs"
        intro="Attuning a weapon starts a timed minigame. The charge is used up as soon as it starts."
      >
        The orb minigame
      </WikiSectionHeading>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Hold the charge and right-click the weapon on its <StationLink name="Magic Station" />. Orbs then circle the
        station. Look at an orb and left-click to hit it.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>
          <strong>Pale blue orbs are good.</strong> Each one you hit stores more of the charge in the weapon. Hit enough
          before time runs out and the weapon keeps the whole charge.
        </li>
        <li>Each pale blue orb that fades before you hit it costs you 8% of the charge.</li>
        <li>
          <strong>Rust-orange orbs are bad.</strong> Each one you hit adds 5 Rift to the weapon, up to 100.
        </li>
        <li>Higher-tier charges have faster orbs and fewer good ones.</li>
        <li>If you disconnect, the run ends and the weapon keeps what you had stored so far.</li>
      </ul>
      <Callout title="Using a charge above your Resonance">
        If a charge needs more Resonance than you have, a warning lists what you are missing. Right-click again to use
        it anyway. That second click spends the charge.
      </Callout>
      <StatGrid
        className="mt-4"
        columns={2}
        stats={[
          { label: "Rift per bad orb", value: "+5", note: "capped at 100" },
          { label: "Rift removed per later recharge", value: "10", note: "never on the first charge" },
        ]}
      />
      <Callout variant="warning" title="Rift stays on the weapon">
        A failed cast still uses its mana and starts its cooldown. Each later successful charge on the weapon removes 10
        Rift. The first charge never removes any.
      </Callout>

      <WikiSectionHeading
        id="casting"
        intro="Hold the weapon and use the rune's casting key. The default is right-click."
      >
        Casting
      </WikiSectionHeading>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        To change a rune&apos;s casting key, hold the rune and use{" "}
        <code className="text-[var(--tfmc-accent)]">/magic rune keybind</code>.
      </p>
      <DataTable
        columns={[{ header: "What you see", nowrap: true }, { header: "Why" }, { header: "What it costs you" }]}
        rows={[
          [
            "*Whiff*",
            'The weapon\'s Rift made the cast fail, or you are carrying more than one staff ("Too many staffs").',
            "Mana and the cooldown, both already spent.",
          ],
          [
            "*Refused*",
            "Your Resonance is below what the weapon asks, or the weapon holds no element at all.",
            "Nothing.",
          ],
          [
            "*Damaged*",
            "The weapon holds runes that no longer fit.",
            "Nothing, but the weapon will not cast until you reclaim its runes.",
          ],
        ]}
      />
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        A refusal tells you why in chat, for example <em>&quot;This spell needs Cerrith II. You carry I.&quot;</em>, but
        at most once every 30 seconds for each weapon and element. To fix a <em>Damaged</em> weapon, right-click an{" "}
        <strong>empty</strong> <StationLink name="Magic Station" /> with it. The station removes the loose runes and
        gives them back.
      </p>

      <WikiSectionHeading
        id="meditation"
        intro="Meditating in a ring of artifacts is how you raise your own Resonance."
      >
        Meditation and Mental Points
      </WikiSectionHeading>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>
          Place 8 <WikiItemLink name="Pedestal">pedestals</WikiItemLink> in a ring, all on the same level as the centre
          block: one 4 blocks north, south, east and west of the centre, and one on each diagonal, 3 blocks across and 3
          blocks along.
        </li>
        <li>
          Put artifacts on the pedestals. You gain Resonance in the elements those artifacts hold. The ring does not
          need to be a shrine.
        </li>
        <li>
          Sit down on the centre block, for example with <code className="text-[var(--tfmc-accent)]">/sit</code>.
          Meditation starts by itself.
        </li>
        <li>
          A white orb appears where you are looking. Hit it (look at it and left-click) to begin. More orbs then circle
          you. Each hit costs 1 Mental Point and raises your Resonance.
        </li>
        <li>
          Blue orbs move your Equilibrium toward Tranquility, and red orbs toward Corruption. Hitting a red orb turns
          the orbs red for a few seconds.
        </li>
        <li>
          Stand up to stop. &quot;Meditation complete at this site&quot; means this ring has nothing more to give you
          for now.
        </li>
      </ol>
      <StatGrid
        columns={4}
        stats={[
          { label: "Resonance per orb hit", value: "Up to 4" },
          { label: "Mental Point cost per hit", value: "1" },
          { label: "Mental Point pool", value: "150", note: "shared with Research" },
          { label: "Regeneration", value: "+10 / hour", note: "offline too" },
        ]}
      />
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        Mental Points (also called Focus) are shared between meditation and Research experiments. Each point of Wisdom
        adds 0.5 to your hourly regeneration, and each point of Intelligence adds 0.25. An empty pool takes 15 hours to
        refill at the base rate.
      </p>
      <Callout variant="warning" title="Resonance fades, and stored artifacts get muffled">
        Your Resonance drops by 0.02 every real hour, so it slowly falls if you stop meditating. If several people
        meditate with the same artifact, what it gives is split between them.
        <br />
        <strong>An artifact holding aura becomes muffled if you keep it in a chest or other container</strong>, with no
        message. A muffled artifact gives less when you meditate, and it is fully muffled after 24 hours. Keep artifacts
        in your inventory, on a <WikiItemLink name="Pedestal">pedestal</WikiItemLink>, on an{" "}
        <WikiItemLink name="Artifact Display">artifact display</WikiItemLink> or in an item frame. There they recover
        fully over 7 days.
      </Callout>

      <WikiSectionHeading id="commands" intro="View your Resonance profile and change a rune's casting key.">
        Commands
      </WikiSectionHeading>
      <CommandTable commands={magicCommands.commands} showNotes={false} />

      <SeeAlso
        hrefs={[
          "/wiki/research",
          "/wiki/codex",
          "/wiki/gem-infusion",
          "/wiki/materials",
          "/wiki/stations",
          "/wiki/commands",
        ]}
      />
    </WikiPage>
  );
}
