import Link from "next/link";
import { Callout, CommandTable, DataTable, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { regiments, warCommands } from "../data/factions";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function WarPage() {
  return (
    <WikiPage
      lastModified="2026-10-23"
      title="War & Mercenaries"
      intro={
        <>
          Wars between{" "}
          <Link href="/wiki/factions" className={link}>
            factions
          </Link>{" "}
          are fought as scheduled battles, one evening at a time. You don&apos;t need to lead anything to take part:
          sign up for your side&apos;s warband on a battle day.
        </>
      }
    >
      <WikiSectionHeading id="declaring" intro="Only a faction leader can declare war, from the Diplomacy menu.">
        Declaring war
      </WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Your faction&apos;s opinion of the target must be -50 or lower.</li>
        <li>No truce can stand between you. A truce lasts 10 days after a war ends.</li>
        <li>You need regiments that can attack, and staff must approve the declaration.</li>
        <li>You choose what you are fighting for, such as taking land, making them your subject, or pillaging.</li>
      </ul>

      <WikiSectionHeading id="battles" intro="All times are Paris time (CET/CEST).">
        Battle days
      </WikiSectionHeading>
      <p className={body}>
        Battles start the day after war is declared, at most one a day, along the route toward the enemy.
      </p>
      <DataTable
        columns={[{ header: "Time", nowrap: true }, { header: "What happens" }]}
        rows={[
          ["Until 16:00", "Members of both sides vote on the battle hour."],
          ["19:00 to 20:00", "Raids can be launched."],
          [
            "From 20:00",
            <span key="signup">
              Sign up for your side&apos;s war warband with <code className={code}>/warband list</code> and{" "}
              <code className={code}>/warband join</code>.
            </span>,
          ],
          ["21:00, 22:00 or 23:00", "The battle starts."],
        ]}
      />
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Each side&apos;s lives in a battle come from its regiments.</li>
        <li>
          After 20 minutes, a warband leader can <code className={code}>/warband retreat</code>, which ends the battle
          as a loss for that side.
        </li>
        <li>The losing faction pays the winner a quarter of its income for 10 days.</li>
      </ul>

      <WikiSectionHeading id="raids" intro="A short attack launched from a port or airport.">
        Raids
      </WikiSectionHeading>
      <p className={body}>
        During the raid hour, a faction leader at war can launch a raid from one of their own ports or airports. A port
        can raid an enemy port, an airport an enemy airport, and either one an enemy fort. Each side can only launch a
        few. The attackers have 60 seconds to join with <code className={code}>/raid join &lt;raid&gt;</code>, and the
        raid then lasts 10 minutes.
      </p>

      <WikiSectionHeading
        id="regiments"
        intro="The leader keeps regiments from the Military menu, paid each day from the faction bank."
      >
        Regiments
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Regiment" }, { header: "Upkeep per slot", align: "right" }, { header: "Notes" }]}
        rows={regiments.map((r) => [r.unit, r.upkeep, r.note])}
      />
      <p className={`mt-3 ${body}`}>
        New slots take hours to fill. The Military law changes which slots you get for free. If the faction bank
        can&apos;t pay, regiments shrink.
      </p>

      <WikiSectionHeading id="mercenaries" intro="Guilds can run a mercenary company and fight for other factions.">
        Mercenaries
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          A guild leader whose character has the Mercenary trait founds a company with{" "}
          <code className={code}>/company found &lt;name&gt;</code>. It costs 100 d from the guild bank and is ready a
          day later. Every mercenary needs the Mercenary trait.
        </li>
        <li>
          The company leader writes a contract with <code className={code}>/company draft</code>, signs it, and sends it
          to a faction with <code className={code}>/company offer &lt;faction&gt;</code>.
        </li>
        <li>
          Factions browse companies with <code className={code}>/mercenaries</code>. Their leader or a council member
          signs the contract to hire.
        </li>
      </ol>

      <Callout variant="note">
        Staff sometimes run battles outside wars. For those, make your own warband with{" "}
        <code className={code}>/warband create</code>, and its leader enters it with{" "}
        <code className={code}>/battle join</code>.
      </Callout>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={warCommands.commands} />

      <SeeAlso hrefs={["/wiki/factions", "/wiki/guilds", "/wiki/vehicles", "/wiki/commands"]} />
    </WikiPage>
  );
}
