import Link from "next/link";
import { Callout, CommandTable, SeeAlso, StationLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { infestationsCommands } from "../data/infestations";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function InfestationsPage() {
  return (
    <WikiPage
      lastModified="2026-10-23"
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
        Every infestation is in bog provinces, mostly in and around the Westmarshes, overrun by Bog Monsters. On the{" "}
        <Link href="/map" className={link}>
          website map
        </Link>
        , pick the Infestation map mode: each infested province is coloured by how bad it is, from yellow to dark red,
        and hovering over it names the level.
      </p>
      <p className={`mt-3 ${body}`}>
        There are four levels: <strong>Mild</strong>, <strong>Worrying</strong>, <strong>Severe</strong> and{" "}
        <strong>Extreme</strong>. Left alone, an infestation slowly gets worse and can spread into neighbouring bog
        provinces, even ones that were cleared before.
      </p>

      <WikiSectionHeading id="monsters">The monsters</WikiSectionHeading>
      <p className={body}>
        While you are in an infested province, monsters keep spawning around you, a little way off rather than right
        next to you. The worse the infestation, the more of them and the faster they come. They don&apos;t spawn below Y
        56. You get ghouls, rats, slime cubes and skeletons, and bug-like creatures that burst into parasitic worms when
        they die. The worms bite through armour and poison you.
      </p>
      <p className={`mt-3 ${body}`}>
        Infestation monsters can drop crafting materials, some of them hard to find elsewhere.
      </p>

      <WikiSectionHeading id="lure">Clearing a province with a Lure</WikiSectionHeading>
      <p className={body}>
        Make a Lure at the <StationLink name="Block Station" /> from 2 Oak Planks. You need to be playing a character to
        place or join one.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Place the Lure on the ground inside an infested province. You join its fight automatically. It does nothing in
          a province that isn&apos;t infested, and each province can only have one Lure at a time.
        </li>
        <li>
          Everyone in the province gets 20 seconds to decide: right-click the Lure to join, or leave the province.
        </li>
        <li>
          Then the wave starts: 20, 40, 60 or 80 monsters from Mild to Extreme, let out over about two minutes. Monsters
          already roaming the province join the wave, and the normal spawning stops until the fight ends. The label
          above the Lure counts how many are left.
        </li>
        <li>Right-click the Lure during the fight to make the remaining monsters glow for 10 seconds.</li>
        <li>
          There is no time limit. Kill the last monster and the province is cleared. If everyone who joined dies or
          gives up, the infestation stays.
        </li>
      </ol>
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
            If you joined and log out, you have 5 minutes to come back. After that, that character dies the next time
            you play it, unless the fight has already ended.
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
