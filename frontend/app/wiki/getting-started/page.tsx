import Link from "next/link";
import { DataTable, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { SITE_DISCORD_URL } from "@/lib/site/config";
import { gettingStartedSection } from "../data/getting-started";

const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";

const nextGuides = [
  ["Pick a class and learn its skills", "/wiki/classes", "Classes"],
  ["Craft weapons, armour, tools or consumables", "/wiki/advanced-crafting", "Advanced Crafting"],
  ["Farm crops, fish or collect materials", "/wiki/farming", "Farming"],
  ["Cook food or brew drinks", "/wiki/cooking", "Cooking"],
  ["Learn magic", "/wiki/magic", "Magic"],
  ["Trade with other players", "/wiki/economy", "Denar Economy"],
  ["Look up a command", "/wiki/commands", "Command Index"],
] as const;

export default function GettingStartedPage() {
  return (
    <WikiPage
      lastModified="2026-10-20"
      title={gettingStartedSection.nav.label}
      intro="Do these steps in order when you first join. After that, pick the guide for whatever you want to do."
    >
      <WikiSectionHeading id="first-steps">Your first steps</WikiSectionHeading>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>
          <strong>Link your Discord account.</strong> You cannot play in Survival until you do. Join the{" "}
          <a href={SITE_DISCORD_URL} className={link}>
            TFMC Discord server
          </a>
          , type <code className={code}>/linkdiscord</code> in game to get a code, then run{" "}
          <code className={code}>/linkdiscord &lt;code&gt;</code> in the Discord server. The game confirms the link
          within a second or so.{" "}
          <Link href="/wiki/server-features#website-link" className={link}>
            More on linking
          </Link>
        </li>
        <li>
          <strong>Create a character.</strong> Type <code className={code}>/rpcharacter create</code>. You choose a
          name, class, race, traits and attributes, and write a short description, so set aside some time. Until you
          have a character, almost every command is blocked.{" "}
          <Link href="/wiki/characters#creating" className={link}>
            Character guide
          </Link>
        </li>
        <li>
          <strong>Claim your starter kit.</strong> Type <code className={code}>/rpcharacter kit starter</code> for a
          knife, 32 gold coins, 32 dry rations, a book, a bundle and a bed.
        </li>
        <li>
          <strong>Learn how chat works.</strong> By default, anything you type without a command is spoken by your
          character and heard within 15 blocks. Use <code className={code}>/ooc</code> to talk out of character to the
          whole server.{" "}
          <Link href="/wiki/characters#chat" className={link}>
            Chat channels
          </Link>
        </li>
        <li>
          <strong>Find a crafting station.</strong> Most custom items are made at stations: ordinary-looking blocks that
          open a custom menu when you right-click them, or sneak and right-click for a few of them. Every recipe in this
          guide names the station that makes it, and the stations guide shows how to open each one.{" "}
          <Link href="/wiki/stations" className={link}>
            Crafting Stations
          </Link>
        </li>
      </ol>

      <WikiSectionHeading id="choose-path">Choose your next guide</WikiSectionHeading>
      <DataTable
        columns={[{ header: "If you want to…" }, { header: "Start here" }]}
        rows={nextGuides.map(([goal, href, label]) => [
          goal,
          <Link key={href} href={href} className={link}>
            {label}
          </Link>,
        ])}
      />
      <SeeAlso hrefs={["/wiki/characters", "/wiki/classes", "/wiki/commands"]} />
    </WikiPage>
  );
}
