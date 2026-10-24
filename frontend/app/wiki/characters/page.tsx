import Link from "next/link";
import {
  Callout,
  CommandTable,
  DataTable,
  RankName,
  SeeAlso,
  StationLink,
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
      lastModified="2026-10-24"
      title="Characters"
      intro={
        <>
          Everything you do on the server, you do as a character. Your character is the one who speaks in chat, gets
          injured and can die for good.
        </>
      }
    >
      <Callout variant="warning">
        Until you pick a character on the selection screen, you cannot chat or use commands. The only ones that work
        there are <code className={code}>/linkdiscord</code> and <code className={code}>/rpcharacter menu</code>, which
        reopens the screen.
      </Callout>

      <WikiSectionHeading id="selection">Choosing a character</WikiSectionHeading>
      <p className={body}>
        Each time you join, you arrive at the character selection screen. It shows your living characters one at a time:
        use the arrows to look through them, then click <strong>Play</strong> to enter the world where that character
        left off. Each character keeps its own inventory, ender chest, position, health and experience. Profession
        levels are shared between them (see{" "}
        <Link href="/wiki/classes#professions" className={link}>
          Professions
        </Link>
        ). You must link your Discord account before you can play (see{" "}
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
        the character you were last playing. You cannot switch at all during an evil RP session, or while a player who
        knocked you out is still deciding your fate.
      </p>
      <p className={`mt-3 ${body}`}>
        If your rank drops and you have more living characters than it allows, you are frozen until you end one in{" "}
        <code className={code}>/rpcharacter menu</code>.
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
      <p className={`mt-3 ${body}`}>
        <RankName rank="Gilded" /> and above can also run{" "}
        <code className={code}>/plushie &lt;character&gt; [1|2|3]</code> to get a plushie of any character, dressed in
        their wardrobe outfit 1, 2 or 3.
      </p>

      <WikiSectionHeading id="creating" intro="The creator takes a while, so set aside some time.">
        Creating a character
      </WikiSectionHeading>
      <p className={body}>
        On the selection screen, choose <strong>New character</strong>, then <strong>Create character</strong>. You need
        a free slot for a living character. The creator is a series of screens with Next and Back buttons:
      </p>
      <ol className={`mt-3 list-decimal space-y-1 pl-5 ${body}`}>
        <li>
          Answer whether you are 18 or older in real life. This decides whether you can join age-restricted roleplay.
        </li>
        <li>Name your character.</li>
        <li>
          Choose a{" "}
          <Link href="/wiki/classes" className={link}>
            class
          </Link>{" "}
          and a race: Human, Elf, Orc, Goblin, Dwarf, Dryad or Oseni.
        </li>
        <li>Set your character&apos;s age.</li>
        <li>
          Pick background traits: homeland, cataclysm, reclamation, motivation, gift, virtue, combat, physical and
          celestial.
        </li>
        <li>
          Spend all 12 attribute points. Every race starts with 4 in each attribute. Each rank you buy raises one
          attribute by 1 and costs double the one before: 1 point, then 2, then 4.
        </li>
        <li>
          Pick personality traits. A callous, cynical, deceitful, greedy or spiteful personality can also take up to two
          evil archetypes, once your account is at least 24 hours old.
        </li>
        <li>
          Optionally add backstory injuries (as many as you like) and one{" "}
          <a href="#prosthetics" className={link}>
            prosthetic
          </a>
          .
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
        After creation, <code className={code}>/rpcharacter edit</code> reopens your choices, and the editor shows how
        long each one has left. Race, backstory injuries and prosthetic lock after 24 hours. Class, age, background
        traits and attributes lock after 5 days, though you can still change class for a fee (see{" "}
        <Link href="/wiki/classes" className={link}>
          Classes &amp; Professions
        </Link>
        ). Personality and evil archetypes never lock.
      </p>
      <p className={`mt-3 ${body}`}>
        Once you are playing, <code className={code}>/rpcharacter kit starter</code> gives you an{" "}
        <WikiItemLink name="Iron Hunting Knife">iron hunting knife</WikiItemLink>, 32 gold coins, 32 dry rations, a
        writable book, a bundle and a brown bed. Each character can claim it once, and you must wait 48 hours between
        claims on different characters. On your website profile you can give the kit&apos;s knife and book your own
        look. If you do, you cannot claim the kit until staff approve the look and it reaches the resource pack, which
        takes up to a day after approval.
      </p>

      <WikiSectionHeading id="looking-at-someone">Reading a character card</WikiSectionHeading>
      <p className={body}>
        Sneak and right-click another player with an empty hand to see their character card: name, gender, age,
        birthday, race and description. <code className={code}>/rpcharacter profile &lt;player&gt;</code> shows the same
        card. A player wearing a mask hides their identity: in-character chat shows them as <strong>Masked</strong>, and
        their card cannot be read in either of these ways. <code className={code}>/tfmc masks</code> gives you one (see{" "}
        <Link href="/wiki/roleplay-tools#masks" className={link}>
          Roleplay Tools
        </Link>
        ).
      </p>
      <p className={`mt-3 ${body}`}>
        <code className={code}>/players</code>, or <strong>Who&apos;s online</strong> in the Quick Actions menu (the G
        key), lists everyone online. Hover a name to see the account, rank and ping, and click it to open that
        character&apos;s sheet. The list is out of character, so masks do not hide sheets there. The same menu also has
        a <strong>Playtime leaderboard</strong>.
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
        a lot. A listener with more Charisma makes out more of a muffled speaker&apos;s words.
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
        A healing injury goes away after 72 hours, counted in real time even while you are offline, and its attribute
        penalties ease as it heals. A physician can also cure it with{" "}
        <Link href="/wiki/medicine" className={link}>
          surgery
        </Link>
        . If it turns permanent, it stays for good. With a broken or lost arm you drop whatever is in your off hand and
        any two-handed item you hold. A{" "}
        <a href="#prosthetics" className={link}>
          prosthetic
        </a>{" "}
        can replace a lost arm or leg, but nothing replaces lost sight.
      </p>
      <div className="mt-4">
        <DataTable
          columns={[
            { header: "Healing injury", nowrap: true },
            { header: "Effects at first" },
            { header: "Permanent form", nowrap: true },
            { header: "Permanent effects" },
          ]}
          rows={[
            [
              "Broken Arm",
              "−4 Strength, −2 Constitution, Weakness, no off hand or two-handed items",
              "One-Handed",
              "−3 Strength, −1 Constitution, Weakness, no off hand or two-handed items",
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

      <WikiSectionHeading id="prosthetics">Prosthetics</WikiSectionHeading>
      <p className={body}>
        Physicians craft prosthetic arms and legs at the <StationLink name="Medicine Station" /> (see{" "}
        <Link href="/wiki/medicine" className={link}>
          Medicine &amp; Surgery
        </Link>
        ). If your character is One-Handed or One-Legged, right-click the matching prosthetic to fit it. It replaces the
        injury and the item is used up. If you already have a prosthetic on that limb, a menu asks first, because the
        old one is destroyed.
      </p>
      <div className="mt-4">
        <DataTable
          columns={[{ header: "Item", nowrap: true }, { header: "Becomes", nowrap: true }, { header: "Effects" }]}
          rows={[
            ["Wood Claw Arm", "Wooden Claw Arm", "−2 Strength, −1 Constitution, no off hand"],
            ["Iron Claw Arm", "Basic Prosthetic Arm", "−1 Strength"],
            ["Arcane Claw Arm", "Arcane Prosthetic Arm", "−1 Strength. Depowered: −3 Strength, −1 Constitution"],
            ["Wood Claw Leg", "Pegleg", "−2 Dexterity, Slowness"],
            ["Iron Claw Leg", "Basic Prosthetic Leg", "−1 Dexterity"],
            ["Arcane Claw Leg", "Arcane Prosthetic Leg", "−1 Dexterity. Depowered: −3 Dexterity, Slowness"],
          ]}
        />
      </div>
      <p className={`mt-3 ${body}`}>
        Arcane limbs run on <WikiItemLink name="Arcane Fuel" />, made at the <StationLink name="Engineer Station" />. A
        new arcane limb starts full. Right-click Arcane Fuel to refill it. One fuel lasts about 50 hours of playing that
        character, and it only burns while you play them. When it runs out, the limb becomes Depowered and its penalties
        get heavier.
      </p>

      <WikiSectionHeading id="injuries-graves">Death and permadeath</WikiSectionHeading>
      <p className={body}>
        Some regions are <strong>permadeath zones</strong>, and a title tells you when you enter one. Dying there can
        kill your character for good, and the more injuries your character already has, the more likely that is. If your
        character survives, the death costs an injury instead. A healing injury you already have turns permanent, or, if
        you have none, you gain a new healing injury. Deaths while you fight in a started war battle (see{" "}
        <Link href="/wiki/war" className={link}>
          War
        </Link>
        ) never kill your character, injure it or give strikes.
      </p>
      <p className={`mt-3 ${body}`}>
        Every character is nonlethal by default. Outside a started fight (below), a nonlethal player who lands the
        killing blow knocks you out and blinds you for 30 seconds instead of killing you. A kill by a player in lethal
        mode is an ordinary death. You leave a grave, and in a permadeath zone it can kill your character for good, as
        above. Lava, mobs and other damage are always lethal.
      </p>
      <p className={`mt-3 ${body}`}>
        <code className={code}>/pvp start</code> warns everyone within 80 blocks that a fight begins in 10 seconds, and
        the fight lasts 15 minutes or until the player who started it runs <code className={code}>/pvp end</code>. In a
        started fight, losing can give your character a <strong>strike</strong>:
      </p>
      <ul className={`mt-3 list-disc space-y-1 pl-5 ${body}`}>
        <li>
          A <strong>nonlethal</strong> winner knocks you out. You stay down for up to 5 minutes while they choose to
          spare you or give you a strike. You can still talk, but you cannot fight or use items. If they do not choose,
          you are spared.
        </li>
        <li>
          A <strong>lethal</strong> winner (<code className={code}>/pvp lethal</code>, then confirm) gives you a strike
          as soon as they kill you. You wake at your spawn point with your items, though not the money in your pouch. If
          they are able to loot graves, your items go into a grave instead.
        </li>
        <li>
          Your first strike is a healing injury and the second a permanent one. The third kills your character, and only
          the killer can open its grave. When a strike would kill you, a nonlethal winner can wound or maim you instead.
        </li>
        <li>
          The same player must wait 24 hours before striking you again. Kills outside a started fight, and deaths with
          no player to blame, give no strike. During an evil RP session, any strike kills your character.
        </li>
        <li>Strikes never wear off.</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Check your strikes with <code className={code}>/rpcharacter strikes</code>. For practice,{" "}
        <code className={code}>/duel &lt;player&gt;</code> challenges someone within 16 blocks to a duel of up to 10
        minutes. When it ends, each of you gets back the health the other took, and a blow that would kill just ends the
        duel. Everything else stays real. Lava, mobs and other damage can still hurt or kill you, and a hit from a mob
        or another player interrupts the duel. Moving more than 32 blocks apart ends it as a draw.
      </p>

      <WikiSectionHeading id="armour">Putting on armour</WikiSectionHeading>
      <p className={body}>
        Armour takes time to fasten: a helmet 1 second, a chestplate 4, leggings 3 and boots 2. Pieces go on one at a
        time, and you are slowed while you fasten them. Taking or dealing damage, sprinting, dying or logging out stops
        it. Masks and heads go on at once.
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
        ). After 40 minutes the grave disappears and drops whatever is left on the ground. When another player kills
        you, the money in your pouch also drops as coins where you died (see{" "}
        <Link href="/wiki/economy" className={link}>
          Denar Economy
        </Link>
        ).
      </p>
      <p className={`mt-3 ${body}`}>
        Carry a <WikiItemLink name="Grave Insurance" /> ticket when you die and it binds to your grave. Right-click the
        ticket from anywhere to get your items back. The ticket is used up, and it cannot open a grave that only your
        killer can open.
      </p>

      <WikiSectionHeading id="wills">Wills and inheritance</WikiSectionHeading>
      <p className={body}>
        <code className={code}>/will</code> names one living character as your character&apos;s heir. Your own
        characters count, and nobody is told. The will is fixed when your character dies for good, and 24 hours later
        the heir receives everything except your guild&apos;s locks, which go to the guild&apos;s leader, or to the
        realm&apos;s leader if the guild has none. The heir collects stored items with{" "}
        <code className={code}>/estate collect</code>. With no living heir, money goes to your guild and property to its
        leader; with no guild, the estate waits 7 days and is then held by staff. Leading a guild or realm never passes
        by will. You can also change your will on your website profile.
      </p>

      <WikiSectionHeading id="clues">Clues</WikiSectionHeading>
      <p className={body}>
        The clues you write during creation describe your character: visual features, smells, home, habits and so on.
        Every character also has an automatic clue that gives away their race. Low-effort or false clues can be
        punished.
      </p>
      <p className={`mt-3 ${body}`}>
        <code className={code}>/rpcharacter clues</code> opens your list. Click <strong>Add Clue</strong> to type a new
        one in chat (up to 10 in all), or click a clue to remove it. If you drop below the minimum (2, or 4 for an evil
        character), you are frozen until you add more.
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

      <SeeAlso
        hrefs={["/wiki/getting-started", "/wiki/classes", "/wiki/medicine", "/wiki/thievery", "/wiki/bird-mail"]}
      />
    </WikiPage>
  );
}
