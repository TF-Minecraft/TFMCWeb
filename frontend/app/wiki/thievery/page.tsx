import Link from "next/link";
import {
  Callout,
  CommandTable,
  SeeAlso,
  StationLink,
  WikiItemLink,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import { thieveryCommandSet } from "../data/thievery";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function ThieveryPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Thievery"
      intro={
        <>
          Thieves pick locks and pockets, and bandits rob people and loot the graves of those they kill. To protect your
          own things, see{" "}
          <Link href="/wiki/locks" className={link}>
            Locks &amp; Keys
          </Link>
          .
        </>
      }
    >
      <WikiSectionHeading id="archetypes">Thief and Bandit</WikiSectionHeading>
      <p className={body}>
        Thief and Bandit are evil archetypes. Once your account is a day old, you can give one or both to a character
        whose personality fits when you{" "}
        <Link href="/wiki/characters#creating" className={link}>
          create it
        </Link>
        . A <strong>Thief</strong> can pick chests and display furniture and pick pockets. Anyone with a lockpick can
        pick a door. A <strong>Bandit</strong> can rob players and loot graves.
      </p>
      <Callout variant="warning" className="mt-4">
        Lockpicking, pickpocketing, robbing and grave looting each start a 30-minute evil RP session, and doing any of
        them again starts it over. During a session, any strike you take in a started PvP fight kills your character
        outright (see{" "}
        <Link href="/wiki/characters#injuries-graves" className={link}>
          death and graves
        </Link>
        ).
      </Callout>

      <WikiSectionHeading id="loadout">Your loadout</WikiSectionHeading>
      <p className={body}>
        Before stealing, a Thief or Bandit picks which kinds of items they know how to spot with{" "}
        <code className={code}>/thievery loadout</code>. Each kind costs points, and you have 10 at most. Adding a kind
        uses points that come back at 1 an hour; removing one gives nothing back. Your loadout is shared by all the
        characters on your account. When you steal, items of kinds you didn&apos;t pick show as <em>HIDDEN!</em> and
        can&apos;t be taken. You can only carry off so much each time, so pricey items may not fit at all.
      </p>

      <WikiSectionHeading id="lockpicks">Lockpicks</WikiSectionHeading>
      <p className={body}>
        The <WikiItemLink name="Basic Lockpick" /> (1 Steel Ingot) and the stronger{" "}
        <WikiItemLink name="Strong Lockpick" /> (2 Steel Ingots) are made at the <StationLink name="Tool Station" />.
        Hold one and right-click what you want to open. When a lockpick breaks, only one from the stack is lost. After a
        failed try, give it a minute before trying the same lock again.
      </p>
      <p className={`mt-3 ${body}`}>
        Your Dexterity and your lockpick both matter. Higher Dexterity makes the lockpicking bar and the chest tumbler
        ring move slower. A Strong Lockpick puts more green and less red on the bar. Both leave fewer seized pins in a
        chest and make a clue less likely to name you.
      </p>

      <WikiSectionHeading id="doors">Doors</WikiSectionHeading>
      <p className={body}>
        Right-click a locked door within 3 blocks. A bar runs across your screen. Right-click again when the marker is
        on green. Red breaks your lockpick, yellow just fails, and walking away cancels. A picked door swings open and
        stays unlocked for everyone for an hour. A door locked with a Golden Key needs a Strong Lockpick.
      </p>

      <WikiSectionHeading id="containers">Chests and containers</WikiSectionHeading>
      <ol className={`mt-2 list-decimal space-y-2 pl-5 ${body}`}>
        <li>Right-click a locked container as a Thief. You are held in place while you work.</li>
        <li>
          A ring of tumblers appears. Press the movement key shown in the middle while the pointer is in the green zone.
          Set all 4 to open the lock. One slip and it fails. Sneak to give up.
        </li>
        <li>
          The container opens hidden. Click a slot to look at it. The first look is always safe, and each safe slot
          shows how many seized pins are next to it. Right-click a slot to mark it as a pin. Clicking a pin snaps a
          lockpick and ends the search, but you can still take what you found.
        </li>
        <li>Take the items you uncovered that your loadout lets you see.</li>
      </ol>
      <p className={`mt-3 ${body}`}>You or your guild can only pick the same container once every 3 days.</p>

      <WikiSectionHeading id="displays">Display furniture</WikiSectionHeading>
      <p className={body}>
        Locked artifact displays, pedestals, armour stands and item frames can be picked as a Thief with a Strong
        Lockpick, from within 3 blocks, using the same bar as doors. On a success, whatever your loadout lets you see
        goes straight into your inventory.
      </p>

      <WikiSectionHeading id="graves">Graves</WikiSectionHeading>
      <p className={body}>
        A Bandit who kills a player can rob their locked grave without a lockpick. One right-click takes everything your
        loadout lets you see, as far as your inventory has room.
      </p>

      <WikiSectionHeading id="pickpocketing">Pickpocketing</WikiSectionHeading>
      <ol className={`mt-2 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Run <code className={code}>/pickpocket start</code> and right-click someone within 4 blocks.
        </li>
        <li>You are held in place. Press jump quickly to fill the ring twice within 30 seconds.</li>
        <li>
          Their main inventory opens (not their hotbar or armour). Take what you can, and stay within 4 blocks or it
          ends.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Each pocket you look through may let your mark hear something rummaging in their bag. A botched attempt always
        gets noticed, and sometimes they see exactly who it was. You or your guild can only pickpocket the same person
        once an hour.
      </p>

      <WikiSectionHeading id="robbery">Robbery</WikiSectionHeading>
      <p className={body}>
        A robbery is a hold-up both players agree to play out. As a Bandit, run{" "}
        <code className={code}>/robbery start</code> and right-click someone within 4 blocks. They have 30 seconds to
        accept with <code className={code}>/robbery accept</code> or the button in chat.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Once they accept, they are frozen and can&apos;t be hurt or touch their inventory. You get 2 minutes to look
          through everything they carry, armour included.
        </li>
        <li>
          If your loadout includes money, their coin pouch is there too. Click it to take 10 denars, or shift-click for
          100.
        </li>
        <li>Closing the menu ends the robbery. If your victim logs out during it, everything they carry drops.</li>
        <li>You or your guild can only rob the same person once every 3 days.</li>
      </ul>

      <WikiSectionHeading id="clues">Clues</WikiSectionHeading>
      <p className={body}>
        Picking a door or display can leave a clue behind, and taking from a chest always does. A clue is one of the{" "}
        <Link href="/wiki/characters#clues" className={link}>
          clues
        </Link>{" "}
        you wrote for your character or a hint at your race, and once in a while it names you outright. Other characters
        nearby slowly notice clues until they fade away. Pickpocketing and robbery leave no clues at the scene.
      </p>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={thieveryCommandSet.commands} showAliases={false} showNotes={false} />

      <SeeAlso hrefs={["/wiki/locks", "/wiki/characters", "/wiki/stations"]} />
    </WikiPage>
  );
}
