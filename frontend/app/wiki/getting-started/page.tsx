import Link from "next/link";
import { DataTable, RankName, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import JoinServer from "@/app/components/site/JoinServer";
import { SITE_DISCORD_URL } from "@/lib/site/config";
import { gettingStartedSection } from "../data/getting-started";

const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

const nextGuides = [
  ["Join or found a faction", "/wiki/factions", "Factions"],
  ["Choose your skills and level your professions", "/wiki/classes", "Classes & Professions"],
  ["Forge weapons, armour and tools", "/wiki/advanced-crafting", "Advanced Crafting"],
  ["Find out where an item is made", "/wiki/stations", "Crafting Stations"],
  ["Grow crops", "/wiki/farming", "Farming"],
  ["Catch fish and treasure", "/wiki/fishing", "Fishing"],
  ["Cook food", "/wiki/cooking", "Cooking"],
  ["Learn magic", "/wiki/magic", "Magic"],
  ["Earn and spend money", "/wiki/economy", "Money & Market Blocks"],
  ["Look up a command", "/wiki/commands", "Command Index"],
] as const;

export default function GettingStartedPage() {
  return (
    <WikiPage
      lastModified="2026-10-23"
      title={gettingStartedSection.nav.label}
      intro="How to get from the server address to your first day as a character. Each step links to the page with the details."
    >
      <WikiSectionHeading id="join">Joining the server</WikiSectionHeading>
      <p className={body}>Connect with Minecraft: Java Edition to this address. You arrive in the Lobby.</p>
      <div className="mt-4 w-fit" data-wiki-search-exclude>
        <JoinServer />
      </div>
      <p className={`mt-4 ${body}`}>
        Join the{" "}
        <a href={SITE_DISCORD_URL} className={link}>
          TFMC Discord
        </a>{" "}
        as well. You need it to link your account, and it has the server lore and announcements.
      </p>

      <WikiSectionHeading id="lobby">The Lobby and the rules quiz</WikiSectionHeading>
      <p className={body}>
        Read the server rules, then type <code className={code}>/rulequiz</code> in the Lobby. The questions appear in
        chat one at a time, and you answer by typing in chat. If you make too many mistakes, you have to wait before you
        can try again. Passing makes you a <RankName rank="Commoner" />.
      </p>
      <p className={`mt-3 ${body}`}>
        Then right-click the <strong>TFMC Roleplay</strong> figure to queue for the main server. Next to it,{" "}
        <strong>TFMC Tutorial</strong> takes you to the Tutorial world at any time, even before the quiz. It explains
        the server&apos;s features and lets you try them out. Characters and items from the Tutorial do not carry over
        to the main server.
      </p>

      <WikiSectionHeading id="discord">Linking Discord</WikiSectionHeading>
      <p className={body}>
        You need to link your Discord account before you can play. You can already do it in the Lobby, and the character
        screen on the main server has a <strong>Link Discord to play</strong> button. You can create a character before
        you link, but you cannot play one until you have.{" "}
        <Link href="/wiki/server-features#website-link" className={link}>
          How to link
        </Link>
      </p>

      <WikiSectionHeading id="character">Creating your character</WikiSectionHeading>
      <p className={body}>
        When you reach the main server, Minecraft asks you to accept its resource pack. Accept it, and the character
        screen opens once the pack has loaded. If it does not load, set <strong>Server Resource Packs</strong> to
        Enabled for the server in your multiplayer list (select it and click Edit), then join again.
      </p>
      <p className={`mt-3 ${body}`}>
        The character screen opens every time you join. With no character yet, it offers{" "}
        <strong>Create character</strong>. The creator has several screens, from name, class and race to a short
        description and clues, so set aside some time. When you finish, click <strong>Play</strong>.{" "}
        <Link href="/wiki/characters#creating" className={link}>
          Creating a character
        </Link>
      </p>

      <WikiSectionHeading id="first-steps">Your first steps</WikiSectionHeading>
      <ul className={`list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <code className={code}>/rpcharacter kit starter</code> gives each new character a starter kit.{" "}
          <Link href="/wiki/characters#creating" className={link}>
            What it holds
          </Link>
        </li>
        <li>
          By default, what you type is spoken by your character, and only people nearby hear it. Use{" "}
          <code className={code}>/ooc &lt;message&gt;</code> to talk out of character to everyone online.{" "}
          <Link href="/wiki/characters#chat" className={link}>
            Chat channels
          </Link>
        </li>
        <li>
          Some regions are permadeath zones, and you are warned when you enter one. Read how death works before you
          travel far.{" "}
          <Link href="/wiki/characters#injuries-graves" className={link}>
            Death and permadeath
          </Link>
        </li>
        <li>
          <code className={code}>/helpop &lt;message&gt;</code> reaches the staff and helpers who are online. For
          anything else, open a ticket in the Discord. Tips show up in chat now and then, and{" "}
          <code className={code}>/tfmc tips disable</code> turns them off.
        </li>
      </ul>

      <WikiSectionHeading id="activity">Daily tasks</WikiSectionHeading>
      <p className={body}>
        <code className={code}>/activity</code> opens your activity menu. Each day it deals you a set of hidden tasks,
        such as voting, playing for an hour or cooking dishes. Click a task to reveal it, because only revealed tasks
        earn points. Points fill your weekly bar. Each time the bar reaches a reward, claim it in the same menu. The bar
        starts again every Monday. <code className={code}>/vote</code> lists the voting sites.
      </p>

      <WikiSectionHeading id="choose-path">Where to go next</WikiSectionHeading>
      <DataTable
        columns={[{ header: "If you want to…" }, { header: "Read" }]}
        rows={nextGuides.map(([goal, href, label]) => [
          goal,
          <Link key={href} href={href} className={link}>
            {label}
          </Link>,
        ])}
      />

      <SeeAlso hrefs={["/wiki/characters", "/wiki/server-features", "/wiki/classes"]} />
    </WikiPage>
  );
}
