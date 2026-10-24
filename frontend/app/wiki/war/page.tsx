import Link from "next/link";
import { Callout, CommandTable, DataTable, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { regiments, warCommands } from "../data/factions";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function WarPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
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
        <li>
          Your faction&apos;s opinion of the target must be -50 or lower, and at least one of its members must be
          online.
        </li>
        <li>No truce can stand between you. A truce lasts 10 days after a war ends.</li>
        <li>You need regiments that can attack, and a war code that staff create for you in Discord.</li>
        <li>
          Choose what you are fighting for in the Declare War menu, such as taking land, making them your subject, or
          pillaging. Confirming asks you to type the war code in chat. Defenders can set a counter-demand.
        </li>
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
      </ul>

      <p className={`mt-3 ${body}`}>
        The faction that loses the war, and its subjects, pay the winner a quarter of their guilds&apos; trade income
        for 10 days.
      </p>

      <WikiSectionHeading id="campaign">Managing the campaign</WikiSectionHeading>
      <p className={body}>
        Open <code className={code}>/war list</code> and select the war to see its campaign menu. Vote for a battle hour
        before voting closes. The vote needs at least 4 voters, or every member of the smaller side. If it falls short,
        the battle is postponed once. If the next vote also falls short, the battle is decided automatically.
      </p>
      <p className={`mt-3 ${body}`}>
        Leaders commit installations to the next battle from this menu. In a naval battle slot, the attacking side loses
        automatically if it has no ship berthed at a committed port. After winning a battle, choose Push to advance or
        Hold to stay put. Leaders can offer white peace or surrender to end the war, concede a battle slot, or ask for
        an automatic result instead of fighting it. For an agreed automatic result, the other leader must answer with{" "}
        <code className={code}>/faction accept</code> within 60 seconds.
      </p>
      <WikiSectionHeading id="in-battle">In battle</WikiSectionHeading>
      <p className={body}>
        You keep your inventory when you die, and your gear wears much more slowly. Friendly fire is on, so take care
        around your own side. Field battles use capture points and shared lives. Sieges use a contest timer. Every 5
        deaths in a field or siege battle costs that side a regiment.
      </p>
      <p className={`mt-3 ${body}`}>
        In a campaign battle, you can only use faction pool vehicles from your side, or vehicles berthed at an
        installation on your side that was committed to that battle. Signed-up players cannot use vehicles before the
        battle starts. You cannot join a warband while mounted.
      </p>

      <WikiSectionHeading id="raids" intro="A short attack launched from a port or airport.">
        Raids
      </WikiSectionHeading>
      <p className={body}>
        During the raid hour, a faction leader at war can launch a raid from one of their own ports or airports. A port
        can raid an enemy port, an airport an enemy airport, and either one an enemy fort. Each side can launch one raid
        per battle day. The attackers have 60 seconds to join with <code className={code}>/raid join &lt;raid&gt;</code>
        , and the raid then lasts 10 minutes. You cannot join while mounted. A raided installation cannot berth or
        unberth vehicles for 48 hours.
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
          day later. Every mercenary needs the Mercenary trait. Each place in the company costs the guild 8 d a day,
          filled or not.
        </li>
        <li>
          The company leader writes a contract with <code className={code}>/company draft</code>, signs it, and sends it
          to a faction with <code className={code}>/company offer &lt;faction&gt;</code>.
        </li>
        <li>
          Factions browse companies with <code className={code}>/mercenaries</code>. To hire, their leader or a council
          member goes to the province of the company&apos;s guild capital and signs the contract there.
        </li>
      </ol>

      <p className={body}>
        Contracts charge a day price and a battle price for each place hired. Battle days cost both. The minimum prices
        are 10 d per day and 50 d per battle, and a contract lasts at most 14 days. Read the absence and breach refund
        terms before signing. Missing mercenaries trigger absence refunds. Dropping below the number of places promised
        triggers the breach refund. Absences and breaches harm the company&apos;s reputation. Days already served still
        have to be paid.
      </p>
      <p className={`mt-3 ${body}`}>
        Company upgrades are Hardened Bodies for health, Warding Sigils for mana and Steady Focus for mana recovery.
        Each costs 10 d per day per level from the host guild and goes up to level 10. Their benefits apply only while
        fighting as hired mercenaries.
      </p>

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
