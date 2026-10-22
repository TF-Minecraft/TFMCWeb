import Link from "next/link";
import {
  Callout,
  CommandTable,
  DataTable,
  RankName,
  SeeAlso,
  WikiItemLink,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import { charactersCommands } from "../data/characters";

const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

export default function CharactersPage() {
  return (
    <WikiPage
      lastModified="2026-10-22"
      title="Characters"
      intro={
        <>
          Everything you do on the server, you do as a character. Your character is the one who speaks in chat, gets
          injured and can die for good.
        </>
      }
    >
      <Callout variant="warning">
        Until you are playing a character, almost every command is blocked. You can still use{" "}
        <code className={code}>/rpcharacter</code>, <code className={code}>/roll</code> and the out-of-character chats{" "}
        <code className={code}>/ooc</code>, <code className={code}>/looc</code> and <code className={code}>/rooc</code>.
      </Callout>

      <WikiSectionHeading id="selection">Choosing a character</WikiSectionHeading>
      <p className={body}>
        Each time you join, you arrive at the character selection screen. It shows your living characters one at a time:
        use the arrows to look through them, then click <strong>Play</strong> to enter the world where that character
        left off. Each character keeps its own inventory, ender chest, position, health and experience, so nothing
        carries over when you switch. You must link your Discord account before you can play (see{" "}
        <Link href="/wiki/getting-started" className={link}>
          Getting Started
        </Link>
        ).
      </p>
      <p className={`mt-3 ${body}`}>
        The same screen lets you create a <strong>New character</strong>, read a character&apos;s background and clues,
        and visit <strong>Memorials</strong> for characters who have died or gone missing.{" "}
        <strong>End character</strong> kills a character for good and cannot be undone.
      </p>
      <p className={`mt-3 ${body}`}>
        To get back to the selection screen while playing, run <code className={code}>/rpcharacter menu</code> and stand
        still for 5 seconds. This does not work while you are dead, falling, riding, duelling or in a fight.
      </p>
      <p className={`mt-3 ${body}`}>
        Switching to a different character has a cooldown that depends on your rank. It counts from the last time you
        switched, and it also applies to creating a new character while you have a living one. You can always go back to
        the character you were last playing. During an evil RP session you cannot switch at all.
      </p>

      <WikiSectionHeading id="rank-benefits">Rank benefits</WikiSectionHeading>
      <DataTable
        columns={[
          { header: "Rank" },
          { header: "Switch cooldown" },
          { header: "Living characters" },
          { header: "Name colours" },
          { header: "Wardrobe slots" },
        ]}
        rows={[
          [<RankName key="commoner" rank="Commoner" />, "7 days", 3, 0, 1],
          [<RankName key="noble" rank="Noble" />, "5 days", 3, 1, 1],
          [<RankName key="gilded" rank="Gilded" />, "4 days", 4, 2, 2],
          [<RankName key="ascended" rank="Ascended" />, "3 days", 5, 20, 3],
          [<RankName key="legacy" rank="Legacy" />, "2 days", 5, 20, 3],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        Name colours is how many colours your character&apos;s name can blend into a gradient. With 0, your name stays
        white.
      </p>

      <WikiSectionHeading id="creating" intro="The creator takes a while, so set aside some time.">
        Creating a character
      </WikiSectionHeading>
      <p className={body}>
        On the selection screen, choose <strong>New character</strong>, then <strong>Create character</strong>. You need
        a free slot for a living character. The creator is a series of screens with Next and Back buttons:
      </p>
      <ol className={`mt-3 list-decimal space-y-1 pl-5 ${body}`}>
        <li>Confirm that you are 18 or older in real life.</li>
        <li>Name your character.</li>
        <li>
          Choose a{" "}
          <Link href="/wiki/classes" className={link}>
            class
          </Link>{" "}
          and a race.
        </li>
        <li>Set your character&apos;s age.</li>
        <li>
          Pick background traits: homeland, cataclysm, reclamation, motivation, gift, virtue, combat, physical and
          celestial.
        </li>
        <li>Spend 12 attribute points.</li>
        <li>
          Pick personality traits. A callous, cynical, deceitful, greedy or spiteful personality can also take up to two
          evil archetypes, once your account is at least 24 hours old.
        </li>
        <li>
          Optionally add backstory injuries (as many as you like) and one prosthetic. Arcane prosthetics need fuel to
          stay powered.
        </li>
        <li>Write a description of 32 to 256 characters: how your character looks, sounds and comes across.</li>
        <li>
          Write your clues: at least 2, or 4 for an evil character, each 12 to 48 characters long (see{" "}
          <a href="#clues" className={link}>
            Clues
          </a>
          ).
        </li>
        <li>Review everything, change anything you want, and confirm.</li>
      </ol>
      <p className={`mt-3 ${body}`}>
        If you close the creator partway, <code className={code}>/rpcharacter menu</code> reopens it. You can also
        create characters on the website with the same steps: run <code className={code}>/token create profile</code> in
        game, sign in on your{" "}
        <Link href="/profile" className={link}>
          profile
        </Link>{" "}
        and choose New character. Skins are optional. Upload them on the website under your character&apos;s Wardrobe,
        then swap between them in game with <code className={code}>/rpcharacter wardrobe</code>.
      </p>
      <p className={`mt-3 ${body}`}>
        After creation, <code className={code}>/rpcharacter edit</code> reopens your choices. Some of them lock after a
        while, and the editor shows how long each one has left.
      </p>
      <p className={`mt-3 ${body}`}>
        Once you are playing, <code className={code}>/rpcharacter kit starter</code> gives you an{" "}
        <WikiItemLink name="Iron Hunting Knife">iron hunting knife</WikiItemLink>, 32 gold coins, 32 dry rations, a
        writable book, a bundle and a brown bed. Each character can claim it once, and you must wait 48 hours between
        claims on different characters.
      </p>

      <WikiSectionHeading id="looking-at-someone">Reading a character card</WikiSectionHeading>
      <p className={body}>
        Sneak and right-click another player with an empty hand to see their character card: name, gender, age,
        birthday, race and description. <code className={code}>/rpcharacter profile &lt;player&gt;</code> shows the same
        card. A player wearing a mask hides their identity: in-character chat shows them as <strong>Masked</strong>, and
        their card cannot be read.
      </p>

      <WikiSectionHeading id="chat">Chat channels</WikiSectionHeading>
      <p className={body}>
        Anything you type without a command goes to your <strong>default channel</strong>, which starts as in-character
        speech (<code className={code}>rp</code>). Change it with <code className={code}>/channel &lt;id&gt;</code>, or
        run <code className={code}>/channel</code> alone to see your current one.{" "}
        <code className={code}>/channeltoggle &lt;id&gt;</code> hides or shows an out-of-character channel in your own
        chat.
      </p>
      <div className="mt-4">
        <DataTable
          columns={[
            { header: "Channel", nowrap: true },
            { header: "Command" },
            { header: "Who hears it" },
            { header: "What it's for" },
          ]}
          rows={[
            ["In-character speech", "/rp", "Within 15 blocks", "Normal talking as your character"],
            ["Shout", "/shout", "Within 24 blocks", "A raised voice"],
            ["Yell", "/yell (/y)", "Within 48 blocks", "Your loudest shout, in bold red"],
            ["Whisper", "/whisper (/wh)", "Within 2 blocks", "Quiet words for someone right beside you"],
            ["Action", "/me", "Within 20 blocks", "Emotes and actions, shown as narration"],
            ["Scene", "/scene", "Within 20 blocks", "Describing the scene, with no speech bubble"],
            ["Local OOC", "/looc", "Within 20 blocks", "Out-of-character talk with people nearby"],
            ["Global OOC", "/ooc", "Everyone online", "Server-wide out-of-character chat"],
            ["Guild OOC", "/gooc", "Your guild", "Out-of-character talk with your guild"],
            ["Faction OOC", "/fooc", "Your faction", "Out-of-character talk with your faction"],
            ["Realm OOC", "/rooc", "Your whole realm", "Includes your overlord and vassal factions"],
            ["Party OOC", "/pooc", "Your RP party", "Out-of-character talk with your /rpcharacter party"],
          ]}
        />
      </div>
      <Callout className="mt-4">
        Walls and distance affect in-character speech. A speaker who is partly blocked or near the edge of range comes
        through with cut-off words. If you can barely hear them, their name shows as <code className={code}>???</code>,
        and at the very edge you only get <em>*muffled voices*</em>. Glass and leaves block very little sound, obsidian
        a lot.
      </Callout>

      <WikiSectionHeading id="rolling">Rolling dice</WikiSectionHeading>
      <p className={body}>
        <code className={code}>/roll</code> rolls from 1 to 200. <code className={code}>/roll &lt;max&gt;</code> rolls
        from 1 to your own maximum, and you can add a modifier such as <code className={code}>/roll 20 +3</code>.{" "}
        <code className={code}>/roll &lt;attribute&gt;</code> rolls a d20 plus that attribute&apos;s modifier, from −5
        at 0 or 1 points to +5 at 20 points (10 or 11 points give +0). You and everyone within 20 blocks see the result.
      </p>

      <WikiSectionHeading id="injuries">Injuries</WikiSectionHeading>
      <p className={body}>
        A healing injury goes away after 72 hours, counted in real time even while you are offline, and a physician can
        treat it with surgery. If it turns permanent, it stays for good. A prosthetic can replace a lost arm or leg, but
        nothing replaces lost sight.
      </p>
      <div className="mt-4">
        <DataTable
          columns={[
            { header: "Healing injury", nowrap: true },
            { header: "Effects" },
            { header: "Permanent form", nowrap: true },
            { header: "Permanent effects" },
          ]}
          rows={[
            [
              "Broken Arm",
              "−4 Strength, −2 Constitution, Weakness, off hand unusable",
              "One-Handed",
              "−3 Strength, −1 Constitution, Weakness, off hand unusable",
            ],
            ["Broken Leg", "−4 Dexterity, Slowness", "One-Legged", "−3 Dexterity, Slowness"],
            ["Half Blind", "−1 Dexterity", "Blind", "−4 Dexterity, −2 Wisdom, Blindness"],
          ]}
        />
      </div>
      <p className={`mt-3 ${body}`}>
        To roleplay an injury with someone&apos;s agreement, run{" "}
        <code className={code}>/rpcharacter injure &lt;player&gt;</code> within 10 blocks of them and pick the injury
        from a menu. They have 30 seconds to accept it.
      </p>

      <WikiSectionHeading id="injuries-graves">Death and permadeath</WikiSectionHeading>
      <p className={body}>
        Some regions are <strong>permadeath zones</strong>, and a title tells you when you enter one. Dying there can
        kill your character for good: the chance is 10% for each injury your character already has. If your character
        survives, the death costs an injury instead. A healing injury you already have turns permanent, or, if you have
        none, you gain a new healing injury. Deaths while you fight in a started war battle (see{" "}
        <Link href="/wiki/factions" className={link}>
          Factions
        </Link>
        ) never kill your character, injure it or give strikes.
      </p>
      <p className={`mt-3 ${body}`}>
        Fights between players start out nonlethal. <code className={code}>/pvp start</code> warns everyone within 80
        blocks that a fight begins in 10 seconds, and the fight lasts 15 minutes or until someone in it runs{" "}
        <code className={code}>/pvp end</code>. In a started fight, losing can give your character a{" "}
        <strong>strike</strong>:
      </p>
      <ul className={`mt-3 list-disc space-y-1 pl-5 ${body}`}>
        <li>
          A <strong>nonlethal</strong> winner knocks you out. You stay down for up to 5 minutes while they choose to
          spare you or give you a strike. You can still talk, but you cannot fight or use items. If they do not choose,
          you are spared.
        </li>
        <li>
          A <strong>lethal</strong> winner (<code className={code}>/pvp lethal</code>, then confirm) gives you a strike
          as soon as they kill you. You keep your items and wake at your spawn point, unless they are able to loot
          graves.
        </li>
        <li>
          Your first strike is a healing injury and the second a permanent one. The third kills your character, and only
          the killer can open its grave. When a strike would kill you, a nonlethal winner can wound or maim you instead.
        </li>
        <li>
          The same player must wait 24 hours before striking you again. Kills outside a started fight, and deaths with
          no player to blame, give no strike. During an evil RP session, any strike kills your character.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Check your strikes with <code className={code}>/rpcharacter strikes</code>. For practice,{" "}
        <code className={code}>/duel &lt;player&gt;</code> challenges someone within 16 blocks to a duel of up to 10
        minutes. Nobody dies or loses anything in a duel.
      </p>

      <WikiSectionHeading id="graves">Graves</WikiSectionHeading>
      <p className={body}>
        In most deaths, your belongings go into a grave chest at the spot where you died. A hologram above it shows who
        killed you and how long the grave has left. Right-click it to take your things back. Only you can open it,
        unless you run <code className={code}>/grave unlock</code> to let anyone loot your newest grave, but thieves can
        still try to rob it (see{" "}
        <Link href="/wiki/thievery" className={link}>
          Thievery
        </Link>
        ). After 40 minutes the grave disappears and drops whatever is left on the ground.
      </p>
      <p className={`mt-3 ${body}`}>
        Carry a <WikiItemLink name="Grave Insurance" /> ticket when you die and it binds to your grave. Right-click the
        ticket from anywhere to get your items back. The ticket is used up, and it cannot open a grave that only your
        killer can open.
      </p>

      <WikiSectionHeading id="wills">Wills and inheritance</WikiSectionHeading>
      <p className={body}>
        <code className={code}>/will</code> names one living character as your character&apos;s heir. Your own
        characters count, and nobody is told. The will is fixed when your character dies for good, and everything passes
        to the heir 24 hours later. The heir collects stored items with <code className={code}>/estate collect</code>.
        With no living heir, money goes to your guild and property to its leader; with no guild, the estate waits 7 days
        and is then held by staff. Leading a guild or realm never passes by will. You can also change your will on your
        website profile.
      </p>

      <WikiSectionHeading id="clues">Clues</WikiSectionHeading>
      <p className={body}>
        The clues you write during creation describe your character: visual features, smells, home, habits and so on.
        Every character also has an automatic clue that gives away their race. Low-effort or false clues can be
        punished. <code className={code}>/rpcharacter clues</code> shows your own list.
      </p>
      <p className={`mt-3 ${body}`}>
        When a clue is left at a scene, characters within a few blocks of it can notice it over time, and Wisdom and
        Intelligence improve the odds. Clues fade: an old clue is harder to read than a fresh one, and each disappears
        within two days.
      </p>

      <WikiSectionHeading id="persona">Customising your character</WikiSectionHeading>
      <p className={body}>
        While playing, you can change your character&apos;s alias (a name others see in place of theirs), gender,
        description, birthday and name colour with the <code className={code}>/rpcharacter</code> commands listed below.
        Players with <RankName rank="Noble" />, <RankName rank="Gilded" />, <RankName rank="Ascended" /> or{" "}
        <RankName rank="Legacy" /> rank can also use colour codes in chat and in their description.
      </p>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={charactersCommands.commands} showAliases={false} />

      <SeeAlso hrefs={["/wiki/getting-started", "/wiki/classes", "/wiki/thievery", "/wiki/bird-mail"]} />
    </WikiPage>
  );
}
