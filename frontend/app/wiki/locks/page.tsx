import Link from "next/link";
import {
  CommandTable,
  DataTable,
  SeeAlso,
  StationLink,
  WikiItemLink,
  WikiItemText,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import { keyCopies, locksCommands } from "../data/locks";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

const lockStates = [
  ["Private", "Only you."],
  ["Guild", "You and everyone in your guild."],
  ["Faction", "Every guild in your faction."],
  ["Public", "Anyone."],
];

export default function LocksPage() {
  return (
    <WikiPage
      lastModified="2026-10-23"
      title="Locks & Keys"
      intro="Lock your doors with a key and choose who can open your chests. You need to be playing a character for any of it."
    >
      <WikiSectionHeading id="doors">Locking a door</WikiSectionHeading>
      <p className={body}>
        Make an <WikiItemLink name="Iron Key" /> at the <StationLink name="Tool Station" /> from 2 Iron Ingots. A
        goldsmith can make a{" "}
        <Link href="/wiki/gem-infusion#goldsmithing" className={link}>
          Golden Key
        </Link>
        , which is harder to pick.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Hold the key, sneak and right-click a door, trapdoor or fence gate to lock it. Do it again to unlock.</li>
        <li>Iron doors and iron trapdoors are the only ones that can&apos;t be locked.</li>
        <li>
          A locked door only opens for its key or a copy, though anyone can close a locked door or gate. Only someone
          holding the original key, a Copper Key copy, or a key chain with either can break it, or the block under it.
        </li>
        <li>
          A <WikiItemLink name="Key Chain" /> (Tool Station, 2 Iron Ingots) holds up to 5 keys and opens their doors,
          but it can&apos;t lock or unlock. Click a key onto it to add it, and right-click the chain in your inventory
          to take the last key off.
        </li>
      </ul>

      <WikiSectionHeading id="copies">Copying a key</WikiSectionHeading>
      <p className={body}>
        Pick up the first item in your inventory and click it onto the second. No station is needed.
      </p>
      <div className="mt-4">
        <DataTable
          columns={[{ header: "Pick up", nowrap: true }, { header: "Click onto" }, { header: "You get" }]}
          rows={keyCopies.map((c) => [
            <WikiItemText key={`${c.pickUp}-pickup`} text={c.pickUp} />,
            <WikiItemText key={`${c.clickOnto}-target`} text={c.clickOnto} />,
            <WikiItemText key={`${c.result}-result`} text={c.result} />,
          ])}
          caption="You can make one paper copy of the same key every 4 hours."
        />
      </div>

      <WikiSectionHeading id="containers">Chests and displays</WikiSectionHeading>
      <p className={body}>
        Any chest, barrel or other container you place is yours, and so are armour stands, item frames,{" "}
        <WikiItemLink name="Artifact Display">artifact displays</WikiItemLink> and{" "}
        <WikiItemLink name="Pedestal">pedestals</WikiItemLink>. They start out <strong>Public</strong>. Sneak and
        left-click one to change who can use it. Each click moves to the next setting:
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Setting", nowrap: true }, { header: "Who can use it" }]}
        rows={lockStates}
        minWidth="20rem"
      />
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Guild and faction mean your{" "}
          <Link href="/wiki/factions#guilds" className={link}>
            guild
          </Link>{" "}
          and its faction. Your other characters count as strangers.
        </li>
        <li>Nobody can break a container they can&apos;t open, or turn your chest into a double chest with theirs.</li>
        <li>Hoppers only move items between containers that have the same owner.</li>
        <li>Ender chests are not part of this: everyone sees only their own.</li>
      </ul>

      <WikiSectionHeading id="thieves">Keeping thieves out</WikiSectionHeading>
      <p className={body}>
        A lock stops most people, but someone with a{" "}
        <Link href="/wiki/thievery" className={link}>
          lockpick
        </Link>{" "}
        can still get in:
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Your locks can only be picked while you, or someone from the guild the lock belongs to, is online, and for a
          short while after.
        </li>
        <li>
          A Faction lock lets your whole faction in, but a thief who picks one can carry off much more than from a
          Private or Guild lock.
        </li>
        <li>
          Thieves often leave{" "}
          <Link href="/wiki/characters#clues" className={link}>
            clues
          </Link>{" "}
          behind. You can wipe the clues at your own door or container with the command below, though you may want to
          read them first.
        </li>
      </ul>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={locksCommands.commands} showAliases={false} showNotes={false} />

      <SeeAlso hrefs={["/wiki/thievery", "/wiki/factions", "/wiki/stations"]} />
    </WikiPage>
  );
}
