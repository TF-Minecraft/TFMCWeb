import Link from "next/link";
import {
  Callout,
  CommandTable,
  DataTable,
  SeeAlso,
  StationLink,
  WikiItemLink,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import {
  armorRunestoneRecipes,
  enchantedChargeRecipes,
  mageWeaponCommands,
  magicStationRecipe,
  runeStationRecipe,
  runestoneRecipes,
} from "../data/magic";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

export default function MageWeaponsPage() {
  return (
    <WikiPage
      lastModified="2026-10-23"
      title="Mage Weapons"
      width="lg"
      intro={
        <>
          A mage weapon is built from parts at a <StationLink name="Magic Station" />, attuned to a school with an
          Enchanted Charge, and fitted with spell runes. Only the Mage class can use one. What Resonance and the schools
          are is explained on{" "}
          <Link href="/wiki/magic" className={link}>
            Magic
          </Link>
          .
        </>
      }
    >
      <WikiSectionHeading id="overview">From parts to your first spell</WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Build a staff, wand or blade at a <StationLink name="Magic Station" />.
        </li>
        <li>
          Make an Enchanted Charge at a <StationLink name="Rune Station" /> and fill it at a{" "}
          <Link href="/wiki/magic#shrines" className={link}>
            shrine
          </Link>
          .
        </li>
        <li>Use the charge on the weapon to attune it, then take the weapon off the station.</li>
        <li>Get a spell rune by researching a blank runestone, and put it into one of the weapon&apos;s sockets.</li>
        <li>
          Raise your own Resonance by{" "}
          <Link href="/wiki/magic#meditation" className={link}>
            meditating
          </Link>
          , then cast.
        </li>
      </ol>

      <WikiSectionHeading id="types" intro="The core decides how many rune slots the weapon gets.">
        Weapon types
      </WikiSectionHeading>
      <DataTable
        columns={[
          { header: "Weapon", nowrap: true },
          { header: "How it fights" },
          { header: "Rune slots by core", nowrap: true },
        ]}
        rows={[
          ["Mage Staff", "Two-handed. No melee attack.", "Iron 1, Steel 2, Abyssalite 3, Mythril 4"],
          [
            "Mage Wand",
            "No melee attack. Left-click fires a bolt that costs mana.",
            "Iron 1, Steel 1, Abyssalite 2, Mythril 2",
          ],
          ["Mage Blade", "A sword with normal melee hits.", "Iron 1, Steel 1, Abyssalite 2, Mythril 2"],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        Every weapon needs a <strong>core</strong> and a <strong>handle</strong>. Each extra slot the core opens up
        needs a <strong>tome</strong>. The handle and each tome give one socket, and their grade sets its size:
      </p>
      <DataTable
        columns={[{ header: "Handle or tome" }, { header: "Socket" }]}
        rows={[
          ["Oak Magical Handle, Simple Magical Tome", "Minor"],
          ["Basic Magical Handle or Tome", "Lesser"],
          ["Petty Magical Handle or Tome", "Greater"],
          ["Heavy Magical Handle or Tome", "Ascendant"],
          ["Simple Tome (made without dust)", "None"],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        A better core also gives the weapon more durability, and on a wand or blade it hits harder. The weapon is named
        after its core, for example Steel Mage Staff. Part costs are listed under{" "}
        <Link href="/wiki/materials" className={link}>
          Materials
        </Link>
        .
      </p>

      <WikiSectionHeading id="station" intro="A vanilla 3x3 craft that anyone can make.">
        The <StationLink name="Magic Station" />
      </WikiSectionHeading>
      <div className="mt-4">
        <CraftingGrid recipe={magicStationRecipe} />
      </div>
      <ol className={`mt-4 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Place the station and right-click it with an empty hand. Choose Staff, Wand or Sword (the Mage Blade), then
          pick the parts.
        </li>
        <li>
          Building takes the materials from your inventory. The new weapon rests on the station, unattuned, and stays
          there until a charge is used on it.
        </li>
        <li>
          Changed your mind? Sneak and left-click the station to take the weapon apart and get the materials back. A
          charge already used on it is lost.
        </li>
      </ol>

      <WikiSectionHeading
        id="rune-station"
        intro="Turns Enchanted Dust into runestones and Enchanted Charges. Each craft takes 10 seconds."
      >
        The <StationLink name="Rune Station" />
      </WikiSectionHeading>
      <div className="mt-4">
        <CraftingGrid recipe={runeStationRecipe} />
      </div>
      <DataTable
        columns={[
          { header: "Size" },
          { header: "Runestone", align: "right" },
          { header: "Armor Runestone", align: "right" },
          { header: "Enchanted Charge", align: "right" },
        ]}
        rows={["Minor", "Lesser", "Greater", "Ascendant"].map((tier, i) => [
          tier,
          `${runestoneRecipes[i].ingredients[0].qty} dust`,
          `${armorRunestoneRecipes[i].ingredients[0].qty} dust`,
          `${enchantedChargeRecipes[i].ingredients[0].qty} dust`,
        ])}
      />
      <p className={`mt-4 ${body}`}>
        Runestones are blank. To turn one into a rune, hold it and right-click a Lectern to start a{" "}
        <Link href="/wiki/research" className={link}>
          Research
        </Link>{" "}
        project. Finishing it gives a random spell rune of the same size from any of the four schools. An armor
        runestone gives a random armour rune instead.
      </p>

      <WikiSectionHeading id="attuning" intro="A weapon with no school in it cannot cast anything.">
        Attuning with a charge
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Fill an Enchanted Charge at a{" "}
          <Link href="/wiki/magic#shrines" className={link}>
            shrine
          </Link>
          . Its tooltip then shows a tier for each school it holds, such as Cerrith II.
        </li>
        <li>
          Hold the charge and right-click the weapon on its station. The charge is used up straight away, and orbs start
          circling the station.
        </li>
        <li>
          Look at an orb and left-click to hit it. Hit the <strong>pale blue</strong> orbs: chat tells you how many you
          need, and every one that fades before you hit it loses part of the charge. Avoid the{" "}
          <strong>rust-orange</strong> ones, which add Rift to the weapon. Higher-tier charges have faster orbs and
          fewer good ones.
        </li>
        <li>
          When time runs out, chat shows the tier the weapon reached and how much of the charge it kept. If you
          disconnect, the run ends and the weapon keeps what it had caught so far.
        </li>
        <li>
          Right-click the station with an empty hand. The weapon pops out on top of it. Don&apos;t leave a finished
          weapon on a station.
        </li>
      </ol>
      <Callout title="A charge stronger than you">
        If the charge is above your own Resonance in a school, a warning lists what you are missing. Right-click again
        within a few seconds to use it anyway. You still can&apos;t cast those spells until your Resonance catches up.
      </Callout>
      <p className={`mt-4 ${body}`}>
        <strong>Rift</strong> is the chance that a cast fizzles. The weapon&apos;s tooltip shows it as a percentage.
      </p>

      <WikiSectionHeading id="recharge" intro="Raise a weapon's attunement, or wipe it and start over.">
        Recharging and re-attuning
      </WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <strong>Recharge:</strong> hold the weapon and right-click an empty station to set it down, then use another
          charge on it. A later charge can add schools and raise them, but never lowers one. It also cleans some Rift
          off the weapon.
        </li>
        <li>
          <strong>Re-attune:</strong> hold the weapon, sneak and right-click an empty station. Chat shows the fee, half
          the materials of the weapon&apos;s parts, rounded up. Sneak and right-click again to pay. The next charge that
          catches anything replaces the old attunement and its Rift. Your runes stay in place.
        </li>
        <li>
          While a re-attune is waiting, only you can charge the weapon or take it back. To call it off, sneak and
          left-click the station when no charge is running. You get the weapon and the fee back.
        </li>
      </ul>

      <WikiSectionHeading id="runes" intro="A socket takes a rune of its own size or smaller, never a bigger one.">
        Runes and sockets
      </WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Drag a rune onto the weapon or armour in your inventory to set it. An <WikiItemLink name="Unsocket Tool" />,
          made at the <StationLink name="Tool Station" />, takes runes back out.
        </li>
        <li>Every spell comes from a rune, so a weapon with no runes casts nothing.</li>
        <li>
          A smaller rune in a bigger socket works, but it uses that socket up. A rune goes into the smallest free socket
          that can hold it.
        </li>
        <li>
          Spell runes only fit mage weapons. Armour runes only fit Mage Armour, where they add mana or protection.
        </li>
      </ul>
      <p className={`mt-4 ${body}`}>
        Mage Armour is forged at the <StationLink name="Forging Station" />. Its socket size comes from the{" "}
        <Link href="/wiki/advanced-crafting#quality" className={link}>
          quality of the craft
        </Link>
        , not the metal, so a Masterwork iron piece takes an Ascendant armour rune.
      </p>

      <WikiSectionHeading id="casting" intro="Hold the weapon in either hand and use the rune's key.">
        Casting
      </WikiSectionHeading>
      <p className={body}>
        Most runes cast with right-click, and a few use left-click or sneak and left-click. To change a rune&apos;s key,
        hold the rune and use <code className="text-[var(--tfmc-accent)]">/magic rune keybind</code>. Carry only one
        staff: with two or more anywhere in your inventory, every cast fizzles.
      </p>
      <DataTable
        columns={[{ header: "What you see", nowrap: true }, { header: "Why" }, { header: "Cost" }]}
        rows={[
          [
            "*Whiff*",
            "The weapon's Rift made the cast fizzle, or you carry more than one staff.",
            "Mana and cooldown.",
          ],
          [
            "*Refused*",
            "Your Resonance or the weapon's attunement is below the spell's tier, or the weapon was never attuned to that school. Chat says which.",
            "Nothing.",
          ],
          [
            "*Worn out*",
            "The weapon is on its last point of durability.",
            "Nothing, but it won't cast or fire until repaired.",
          ],
          [
            "*Damaged*",
            "The weapon holds runes that no longer fit. Right-click an empty station with it to get the loose runes back.",
            "Nothing, but it won't cast until fixed.",
          ],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        Every spell you cast, including a whiff, uses a little of the weapon&apos;s durability, and so does every wand
        bolt. A blade also wears when you hit with it. A mage weapon never breaks: it stops at Worn out. A{" "}
        <WikiItemLink name="Magical Repair Kit" /> dragged onto it restores durability, and works on Mage Armour too.
      </p>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={mageWeaponCommands.commands} showNotes={false} />

      <SeeAlso
        hrefs={["/wiki/magic", "/wiki/research", "/wiki/advanced-crafting", "/wiki/materials", "/wiki/recycler"]}
      />
    </WikiPage>
  );
}
