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
import { infestationsCommands } from "../data/infestations";

/** Drops from every infestation, inside or outside a permadeath zone (Main's `Infestations/rewards.yml`). */
const lootAnywhere = [
  "Ignitium",
  "Iron Ingot",
  "Tin",
  "Abyssalite Fragment",
  "Enchanted Dust",
  "Coins",
  "Unknown Key",
  "Pouch of Basic Gemstones",
  "Pouch of Polished Gemstones",
];

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function InfestationsPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
      title="Infestations"
      intro={
        <>
          Some provinces are overrun by monsters. Walk into one and they keep coming at you, day and night. Fight a wave
          at a <strong>Lure</strong> and win, and the province is cleared.
        </>
      }
    >
      <WikiSectionHeading id="where">Where they are</WikiSectionHeading>
      <p className={body}>
        Infestations only happen in bog provinces, mostly in and around the Westmarshes. On the{" "}
        <Link href="/map" className={link}>
          website map
        </Link>
        , pick the Infestation map mode: each infested province is coloured by how bad it is, from yellow to dark red,
        and hovering over it names the level.
      </p>
      <p className={`mt-3 ${body}`}>
        There are 4 levels: <strong>Mild</strong>, <strong>Worrying</strong>, <strong>Severe</strong> and{" "}
        <strong>Extreme</strong>. Left alone, an infestation slowly gets worse and can spread to nearby bog provinces,
        even across a lake or sea to a bog on the far side, and even into ones that were cleared before.
      </p>

      <WikiSectionHeading id="monsters">The monsters</WikiSectionHeading>
      <p className={body}>
        While you are in an infested province, monsters keep appearing around you, a little way off rather than right
        next to you. The worse the infestation, the more of them and the faster they come. You get ghouls, rats, slime
        cubes and skeletons, and bug-like creatures that burst into parasitic worms when they die. The worms bite
        through armour and poison you.
      </p>
      <p className={`mt-3 ${body}`}>Monsters do not appear everywhere:</p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>They don&apos;t appear deep underground (below height Y 56).</li>
        <li>
          They only appear under open sky, so never in caves or under a roof. Any block you can&apos;t walk through
          counts as a roof, but leaves don&apos;t. Building a roof over a spot stops them appearing there.
        </li>
        <li>
          They never appear inside the protected area around a faction installation (a fort, port, airport or train
          station).
        </li>
      </ul>

      <WikiSectionHeading id="loot">Loot</WikiSectionHeading>
      <p className={body}>Every infestation monster you kill can drop loot. The worms from a dying bug drop nothing.</p>
      <p className={`mt-3 ${body}`}>
        Where you fight decides how much you get. Inside a{" "}
        <Link href="/wiki/characters#injuries-graves" className={link}>
          permadeath zone
        </Link>
        , the worse the infestation, the more it pays. Outside one, every level pays the same, and less than Mild does
        inside a zone.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Drop" }, { header: "Where it drops" }]}
        rows={[
          ...lootAnywhere.map((name) => [<WikiItemLink key={name} name={name} />, "Any infestation"]),
          ["Pouch of Radiant Gemstones", "Worrying and worse, inside a permadeath zone"],
          ["Pouch of Mythical Gemstones", "Severe and Extreme, inside a permadeath zone"],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        Right-click a gemstone pouch to get one random gemstone of its kind. An Unknown Key gets you into the{" "}
        <Link href="/wiki/trial-rooms" className={link}>
          Trial Rooms
        </Link>
        .
      </p>
      <p className={`mt-3 ${body}`}>
        Winning a Lure fight gives each fighter a reward of their own. To get yours you must have joined, made a few
        kills in the fight and be alive and online when it ends. It drops as items that only you can pick up. The more
        of the Lure&apos;s monsters you killed, the bigger it is, and each of those kills pays more than an ordinary
        one. You also get extra Unknown Keys on top of the reward, more for a worse infestation. A Lure won outside a
        permadeath zone pays only a small part of this.
      </p>

      <WikiSectionHeading id="lure">Clearing a province with a Lure</WikiSectionHeading>
      <p className={body}>
        Make a Lure at the <StationLink name="Block Station" /> from 2 Oak Planks. You must be playing a character to
        place or join one.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Place the Lure on the ground inside an infested province. You join its fight automatically. It does nothing in
          a province that isn&apos;t infested. If the spot is refused, chat tells you why (see the table below).
        </li>
        <li>
          Everyone in the province gets 20 seconds to decide. Right-click the Lure to join, or leave the province.
        </li>
        <li>
          Then the wave starts: 20, 40, 60 or 80 monsters from Mild to Extreme, released over about 2 minutes. Monsters
          already roaming the province join the wave, and no new ones appear outside the wave until the fight ends. The
          label above the Lure counts how many are left.
        </li>
        <li>Right-click the Lure during the fight to make the remaining monsters glow for 10 seconds.</li>
        <li>
          A Lure monster that nobody in the fight has seen for a while is pulled back next to the Lure. It is the same
          monster, so the count above the Lure does not change.
        </li>
        <li>
          There is no time limit. Kill the last monster and the province is cleared. If everyone who joined dies, gives
          up or stays logged out, the infestation stays.
        </li>
      </ol>
      <DataTable
        className="mt-4"
        columns={[{ header: "Message when a Lure is refused" }, { header: "What it means" }]}
        rows={[
          ["A lure is already placed in this province.", "Each province can only have one Lure at a time."],
          [
            "The lure needs open sky above it. Monsters cannot reach it here.",
            "A block you can't walk through is somewhere above the Lure. Leaves don't count.",
          ],
          [
            "A lure cannot be set this close to a fort, port, airport or train station.",
            "The spot is inside the protected area around one of those installations.",
          ],
        ]}
      />
      <Callout variant="warning" className="mt-4">
        <p>Once a fight starts, nobody can stand by and watch:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            If you are in the province and haven&apos;t joined, you lose a heart every second. You can still join by
            right-clicking the Lure.
          </li>
          <li>
            If you joined and then leave the province, you lose a heart every second until you come back or give up with{" "}
            <code className={code}>/lure leave</code>.
          </li>
          <li>
            If you die in the fight or give up with <code className={code}>/lure leave</code>, you can&apos;t join that
            Lure again, not even on another character.
          </li>
          <li>
            If you joined and log out or switch to another character, you have 5 minutes to come back as the same
            character. After that you are out of the fight, and that character dies the next time you play it, unless
            the others have won by then.
          </li>
        </ul>
      </Callout>
      <p className={`mt-3 ${body}`}>
        The Lure can&apos;t be broken while it is in use, and it disappears when the fight ends, win or lose. A fight
        still running at the daily restart is lost, with no penalty for anyone.
      </p>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={infestationsCommands.commands} showAliases={false} showNotes={false} />

      <SeeAlso hrefs={["/wiki/stations", "/wiki/materials"]} />
    </WikiPage>
  );
}
