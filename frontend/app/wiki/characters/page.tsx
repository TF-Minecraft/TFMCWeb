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
const subheading = "mt-6 text-sm font-semibold uppercase tracking-wide text-[var(--tfmc-mist)]";

export default function CharactersPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
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
        left off. Each character keeps its own inventory, ender chest, position, health and experience levels.
        Profession levels are shared between them (see{" "}
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
        the character you were last playing. When playing a character would start the cooldown, the selection screen
        asks you to confirm first. You cannot switch at all during an{" "}
        <a href="#injuries-graves" className={link}>
          evil RP session
        </a>
        , or while a player who knocked you out is still deciding your fate.
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
          [<RankName key="noble" rank="Noble" />, "5 days", 3, 1, 2],
          [<RankName key="gilded" rank="Gilded" />, "4 days", 4, 2, 3],
          [<RankName key="ascended" rank="Ascended" />, "3 days", 5, 20, 5],
          [<RankName key="legacy" rank="Legacy" />, "2 days", 5, 20, 5],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        <strong>Name colours</strong> is how many colours your character&apos;s name can blend into a gradient. With 0,
        your name stays white. <strong>Wardrobe slots</strong> is how many skins each character can wear, base skin
        included. If your rank drops, the skins in slots it no longer unlocks stay saved and come back when you regain
        the rank.
      </p>
      <p className={`mt-3 ${body}`}>
        <RankName rank="Gilded" /> and above can also run <code className={code}>/plushie &lt;character&gt; [1-5]</code>{" "}
        to get a plushie of any character, dressed in one of their wardrobe outfits.
      </p>

      <WikiSectionHeading id="creating" intro="The creator takes a while, so set aside some time.">
        Creating a character
      </WikiSectionHeading>
      <p className={body}>
        On the selection screen, choose <strong>New character</strong>, then <strong>Create character</strong>. You need
        a free slot for a living character. The creator is a series of screens with <strong>Next</strong> and{" "}
        <strong>Back</strong> buttons. <strong>Cancel creation</strong> asks whether you want to{" "}
        <strong>Keep creating</strong> or <strong>Discard draft</strong>.
      </p>
      <ol className={`mt-3 list-decimal space-y-1 pl-5 ${body}`}>
        <li>
          On your first character only, say whether you are 18 or older in real life. This decides whether you can join
          age-restricted roleplay.
        </li>
        <li>
          Type your character&apos;s real name, 3 to 24 characters with no colour codes. It stays hidden from other
          players until you share it in roleplay. <RankName rank="Noble" /> rank and above can colour the name here with{" "}
          <strong>Preview name</strong> and <strong>Edit colours</strong>.
        </li>
        <li>
          Choose an alias. This is the name other players see in the TAB list, in chat, on your character card and in{" "}
          <code className={code}>/faction list</code>.
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              Type a nickname or title, or type <code className={code}>same</code> to show your real name. Typing your
              real name again counts as <code className={code}>same</code>, and you can&apos;t leave it empty.
            </li>
            <li>
              An alias is 3 to 24 characters. It can use letters, spaces, full stops, commas, hyphens, apostrophes and á
              é í ó ú, but no digits or colour codes.
            </li>
          </ul>
        </li>
        <li>
          Choose a{" "}
          <Link href="/wiki/classes" className={link}>
            class
          </Link>{" "}
          and a race: Human, Elf, Orc, Goblin, Dwarf, Dryad or Oseni.
        </li>
        <li>Set your character&apos;s age.</li>
        <li>
          Pick background traits: homeland, cataclysm, reclamation, motivation, gift (pick 2), virtue, combat, physical
          (pick 1 to 3) and celestial.
        </li>
        <li>
          Spend all 12 attribute points. Every race starts with 4 in each attribute. Each point you add to an attribute
          costs double the one before: 1, then 2, then 4. The <strong>Reset</strong> and <strong>Balanced</strong>{" "}
          buttons help.
        </li>
        <li>
          Pick 3 to 5 personality traits. A callous, cynical, deceitful, greedy or spiteful personality can also take up
          to 2{" "}
          <Link href="/wiki/thievery#archetypes" className={link}>
            evil archetypes
          </Link>{" "}
          once your account is at least 24 hours old.
        </li>
        <li>
          If you want, add backstory injuries (as many as you like) and 1{" "}
          <a href="#prosthetics" className={link}>
            prosthetic
          </a>
          .
        </li>
        <li>
          Write a description of 32 to 256 characters: how your character looks, sounds and comes across. You can also
          set <strong>Gender (optional)</strong> on this screen.
        </li>
        <li>
          Write your clues: at least 2, or 4 for an evil character, each 12 to 48 characters long (see{" "}
          <a href="#clues" className={link}>
            Clues
          </a>
          ).
        </li>
        <li>
          Check the review screen. Every step has an <strong>[Edit]</strong> link, and the alias reads &quot;Same as the
          real name&quot; if you set none. Confirm with <strong>Create character</strong>.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        If you close the creator partway, <code className={code}>/rpcharacter menu</code> reopens it.
      </p>
      <p className={`mt-3 ${body}`}>
        You can also create characters on the website with the same steps. Run{" "}
        <code className={code}>/token create profile</code> in game, sign in on your{" "}
        <Link href="/profile" className={link}>
          profile
        </Link>{" "}
        and choose <strong>New character</strong>. The alias is optional there: leaving it blank, typing{" "}
        <code className={code}>same</code> or repeating the real name all mean no alias.
      </p>

      <h3 id="skins" className={subheading}>
        Skins
      </h3>
      <p className={`mt-1 ${body}`}>
        Skins are optional. Upload them on the website under your character&apos;s Wardrobe, then swap between them in
        game with <code className={code}>/rpcharacter wardrobe</code>.
      </p>
      <p className={`mt-3 ${body}`}>
        Each skin can carry its own description, which others read while you wear it. Shift-click the skin in{" "}
        <code className={code}>/rpcharacter wardrobe</code> and type it in chat, or fill in{" "}
        <strong>Description while worn</strong> on the website. The base skin uses your character description.
      </p>

      <h3 id="editing" className={subheading}>
        Changing your choices
      </h3>
      <p className={`mt-1 ${body}`}>
        <code className={code}>/rpcharacter edit</code> reopens your choices and shows how long you have before each one
        locks.
      </p>
      <ul className={`mt-2 list-disc space-y-1 pl-5 ${body}`}>
        <li>Race, backstory injuries and prosthetic lock after 24 hours.</li>
        <li>
          Class, age, background traits and attributes lock after 5 days. After that you can still change class for a
          fee (see{" "}
          <Link href="/wiki/classes" className={link}>
            Classes &amp; Professions
          </Link>
          ).
        </li>
        <li>Personality and evil archetypes never lock.</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        The alias isn&apos;t in the editor. Change it with <code className={code}>/rpcharacter alias &lt;name&gt;</code>{" "}
        or remove it with <code className={code}>/rpcharacter alias clear</code>. You must wait 10 seconds between
        changes.
      </p>

      <h3 id="starter-kit" className={subheading}>
        Starter kit
      </h3>
      <p className={`mt-1 ${body}`}>
        Once you are playing, <code className={code}>/rpcharacter kit starter</code> gives you an{" "}
        <WikiItemLink name="Iron Hunting Knife" />, 32 gold coins, 32 dry rations, a writable book, a bundle and a brown
        bed. Each character can claim it once, and you must wait 48 hours between claims on different characters.
      </p>
      <p className={`mt-3 ${body}`}>
        On your website profile you can give the kit&apos;s knife and book your own look. If you do, you can&apos;t
        claim the kit until staff approve the look and it reaches the resource pack, which takes up to a day after
        approval.
      </p>

      <WikiSectionHeading id="looking-at-someone">Reading a character card</WikiSectionHeading>
      <p className={body}>
        Sneak and right-click another player with an empty hand to see their character card. It shows their alias (the
        name other players see), or their real name if they set no alias, then their gender, age, birthday, race and
        description. <code className={code}>/rpcharacter profile &lt;player&gt;</code> shows the same card. A player
        wearing a mask hides their identity. In-character chat shows them as <strong>Masked</strong>, and their card
        cannot be read in either of these ways. <code className={code}>/tfmc masks</code> gives you one (see{" "}
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
            ["Realm OOC", "/rooc", "Your whole realm", "Includes your overlord and subject factions"],
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
        <code className={code}>/roll &lt;attribute&gt;</code> rolls 1 to 20 and adds that attribute&apos;s modifier,
        from −5 at 0 or 1 points to +5 at 20 points (10 or 11 points give +0). You and everyone within 20 blocks see the
        result.
      </p>

      <WikiSectionHeading id="injuries">Injuries</WikiSectionHeading>
      <p className={body}>
        A <strong>healing injury</strong> goes away after 72 hours, counted in real time even while you are offline, and
        its penalties ease as it heals. A <strong>permanent injury</strong> stays for good.
      </p>
      <p className={`mt-3 ${body}`}>Your character can get an injury in these ways:</p>
      <ul className={`mt-2 list-disc space-y-1 pl-5 ${body}`}>
        <li>dying in a permadeath zone and surviving</li>
        <li>taking a strike in a started fight</li>
        <li>losing a started fight to a player who chooses Wound or Maim</li>
        <li>
          accepting a roleplay injury that another player offers with <code className={code}>/rpcharacter injure</code>
        </li>
        <li>adding backstory injuries during creation</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        The first 3 are explained under{" "}
        <a href="#injuries-graves" className={link}>
          Death and permadeath
        </a>
        .
      </p>
      <p className={`mt-3 ${body}`}>
        A physician can cure a healing injury with{" "}
        <Link href="/wiki/medicine" className={link}>
          surgery
        </Link>
        . With a broken or lost arm you drop whatever is in your off hand and any two-handed item you hold. A{" "}
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
        Each body part has a limit. Your arms hold at most 2 of Broken Arm, One-Handed and an arm prosthetic. Your legs
        hold at most 2 of Broken Leg, One-Legged and a leg prosthetic. Your eyes hold 1 injury, Half Blind or Blind.
        When a full body part takes a permanent injury, it replaces that part&apos;s healing injury instead of adding a
        new one, so Half Blind becomes Blind.
      </p>
      <h3 id="blind" className={subheading}>
        Getting around while Blind
      </h3>
      <p className={`mt-1 ${body}`}>Any Blind character gets 2 kinds of help:</p>
      <ul className={`mt-2 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          You can hear creatures moving near you. They glow for you alone, as long as nothing stands between you and
          them. Anything standing still, sneaking or invisible stays hidden.
        </li>
        <li>
          A sound and a line above your hotbar warn you when the ground falls away ahead, or when something dangerous is
          just ahead.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        A <WikiItemLink name="Walking Cane" /> adds 2 more while you hold it. Make one at the{" "}
        <StationLink name="Tool Station" />. The Canes category in <code className={code}>/armourshop</code> has free
        looks for it, including the old Forearm Crutch and Slim Forearm Crutch, and a cane with one of those looks still
        works as a cane.
      </p>
      <ul className={`mt-2 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          With the cane in either hand, hold sprint while walking forward to stride. It is faster than walking but
          slower than a sprint. It uses hunger like sprinting, so you need enough food, and it doesn&apos;t work while
          you sneak, swim or ride.
        </li>
        <li>
          Right-click with the cane to tap. For a moment it outlines the hazards, ledges you could fall from, doors,
          gates and walls around you. Only you see the outlines, and there is a short wait between taps.
        </li>
      </ul>
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
            ["Wood Claw Arm", "Wooden Claw Arm", "−2 Strength, −1 Constitution, no off hand or two-handed items"],
            ["Iron Claw Arm", "Basic Prosthetic Arm", "−2 Strength"],
            ["Arcane Claw Arm", "Arcane Prosthetic Arm", "−1 Strength. Depowered: −3 Strength, −1 Constitution"],
            ["Wood Claw Leg", "Pegleg", "−2 Dexterity, Slowness"],
            ["Iron Claw Leg", "Basic Prosthetic Leg", "−2 Dexterity"],
            ["Arcane Claw Leg", "Arcane Prosthetic Leg", "−1 Dexterity. Depowered: −3 Dexterity, Slowness"],
          ]}
        />
      </div>
      <p className={`mt-3 ${body}`}>
        Arcane limbs run on <WikiItemLink name="Arcane Fuel" />, made at the <StationLink name="Engineer Station" />. A
        new arcane limb starts full. Right-click Arcane Fuel to refill it. 1 Arcane Fuel lasts about 50 hours of playing
        that character, and it only burns while you play them. While it has fuel, an arcane limb has the lightest
        penalty of any prosthetic. When it runs out, the limb becomes Depowered and its penalties get heavier.
      </p>

      <WikiSectionHeading id="injuries-graves">Death and permadeath</WikiSectionHeading>
      <p className={body}>
        Every character is nonlethal by default. To switch to lethal, run <code className={code}>/pvp lethal</code> and
        confirm. Lava, mobs and other damage are always lethal.
      </p>
      <p className={`mt-3 ${body}`}>
        A <strong>started fight</strong> is one somebody announced with <code className={code}>/pvp start</code>.
        Everyone within 80 blocks is warned that a fight begins in 10 seconds. It lasts 15 minutes, or until the player
        who started it runs <code className={code}>/pvp end</code>.
      </p>
      <p className={`mt-3 ${body}`}>
        A <strong>strike</strong> is a mark your character gets for losing a started fight. The first strike gives you a
        healing injury and the second a permanent injury. The third kills your character. Strikes never wear off. Check
        yours with <code className={code}>/rpcharacter strikes</code>.
      </p>
      <p className={`mt-3 ${body}`}>
        An <strong>evil RP session</strong> is the 30 minutes after your latest lockpick, theft or robbery (see{" "}
        <Link href="/wiki/thievery" className={link}>
          Thievery
        </Link>
        ). Each new one starts the 30 minutes again, and the time keeps counting while you are offline. During a
        session, any strike kills your character.
      </p>

      <h3 id="outside-a-fight" className={subheading}>
        Outside a started fight
      </h3>
      <p className={`mt-1 ${body}`}>
        A nonlethal player who lands the killing blow knocks you out and blinds you for 30 seconds instead of killing
        you. A kill by a lethal player is an ordinary death, and you leave a{" "}
        <a href="#graves" className={link}>
          grave
        </a>
        . Neither gives you a strike.
      </p>

      <h3 id="permadeath-zones" className={subheading}>
        Permadeath zones
      </h3>
      <p className={`mt-1 ${body}`}>
        A title tells you when you enter a <strong>permadeath zone</strong>. Dying there can kill your character for
        good, and the more injuries your character already has, the more likely that is. If your character survives, a
        healing injury you already have turns permanent. If you have none, you gain a new healing injury.
      </p>
      <p className={`mt-3 ${body}`}>
        Deaths while you fight in a{" "}
        <Link href="/wiki/war#battles" className={link}>
          war battle
        </Link>{" "}
        never kill your character, injure it or give it a strike.
      </p>

      <h3 id="losing-a-fight" className={subheading}>
        Losing a started fight
      </h3>
      <ul className={`mt-2 list-disc space-y-1 pl-5 ${body}`}>
        <li>
          A <strong>nonlethal</strong> winner knocks you out. You stay down for up to 5 minutes while they choose{" "}
          <strong>Spare</strong> or <strong>Strike</strong>. You can still talk, but you can&apos;t fight or use items.
          If they don&apos;t choose, you are spared.
        </li>
        <li>
          When a strike would kill your character (the third, or any strike during an evil RP session), a nonlethal
          winner chooses <strong>Wound</strong>, <strong>Maim</strong> or <strong>Kill</strong> instead. Wound gives you
          a healing injury and Maim a permanent injury. Neither adds a strike.
        </li>
        <li>
          A <strong>lethal</strong> winner gives you the strike as soon as they kill you. They can&apos;t spare, wound
          or maim you. You wake at your spawn point with your items, but without the money in your pouch.
        </li>
        <li>
          If your killer is a{" "}
          <Link href="/wiki/thievery#archetypes" className={link}>
            Bandit
          </Link>
          , your items go into a grave they can loot instead. If you are in an evil RP session and your character
          survives the death, your grave is unlocked and anyone can loot it.
        </li>
        <li>A strike that kills your character always leaves a grave that only the killer can open.</li>
        <li>
          The same player must wait 24 hours before striking you again. Deaths with no player to blame give no strike.
        </li>
      </ul>

      <h3 id="duels" className={subheading}>
        Duels
      </h3>
      <p className={`mt-1 ${body}`}>
        <code className={code}>/duel &lt;player&gt;</code> challenges someone within 16 blocks to a duel of up to 10
        minutes. When it ends, you get back the health, hunger, mana and stamina the duel cost you, and duel blows
        don&apos;t wear your gear. A blow that would kill ends the duel instead.
      </p>
      <p className={`mt-3 ${body}`}>
        Lava, mobs and other damage can still hurt or kill you. A hit from a mob or another player interrupts the duel,
        and then only the health the duel took comes back. Moving more than 32 blocks apart ends it as a draw.
      </p>

      <WikiSectionHeading id="armour">Putting on armour</WikiSectionHeading>
      <p className={body}>
        Armour takes time to fasten: a helmet 1 second, a chestplate 4, leggings 3 and boots 2. Pieces go on one at a
        time, and you are slowed while you fasten them. Taking or dealing damage, sprinting, dying or logging out stops
        it. Masks and heads go on at once.
      </p>

      <WikiSectionHeading id="graves">Graves</WikiSectionHeading>
      <p className={body}>
        After most deaths, your belongings go into a grave chest where you died. A hologram above it shows your
        killer&apos;s alias and how long the grave has left. Right-click the grave to take your things back.
      </p>
      <ul className={`mt-3 list-disc space-y-1 pl-5 ${body}`}>
        <li>
          Only you can open your grave. <code className={code}>/grave unlock</code> lets anyone loot your newest one.
        </li>
        <li>
          A Bandit who killed your character can rob your grave while it is locked (see{" "}
          <Link href="/wiki/thievery#graves" className={link}>
            Thievery
          </Link>
          ).
        </li>
        <li>A grave from a strike that killed your character opens only for the killer and can&apos;t be unlocked.</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        After 40 minutes the grave disappears and drops whatever is left on the ground. When another player kills you,
        the money in your pouch drops as{" "}
        <Link href="/wiki/economy#coins" className={link}>
          coins
        </Link>{" "}
        where you died.
      </p>
      <p className={`mt-3 ${body}`}>
        Right-click a <WikiItemLink name="Grave Insurance" /> ticket from anywhere to get your items back from your
        character&apos;s newest grave. Any ticket works, even one you got after you died. The ticket is used up, and it
        can&apos;t open a grave that only your killer can open.
      </p>

      <WikiSectionHeading id="wills">Wills and inheritance</WikiSectionHeading>
      <p className={body}>
        <code className={code}>/will</code> names one living character as your character&apos;s heir. Your own
        characters count, and nobody is told. You can also change your will on your website{" "}
        <Link href="/profile" className={link}>
          profile
        </Link>
        .
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          The will is fixed when your character dies for good. 24 hours later the heir receives everything, and collects
          stored items with <code className={code}>/estate collect</code>. Letters still waiting for your character go
          to the heir too.
        </li>
        <li>
          Guild locks are the exception: the locked containers your character owns with access set to Guild or Faction
          (see{" "}
          <Link href="/wiki/locks#containers" className={link}>
            Locks
          </Link>
          ). They go to your guild&apos;s leader, or to the realm&apos;s leader if the guild has no leader. If the guild
          is gone, they go to the realm&apos;s leader, or to the heir if there is none. If you had no guild, they go to
          the heir.
        </li>
        <li>
          Private and Public locks, doors, personal vehicles, shops and Research stations are property and follow the
          heir.
        </li>
        <li>
          With no living heir, your money goes to your guild and your property to its leader. With no heir and no guild,
          the estate waits 7 days and is then held by staff.
        </li>
        <li>
          Leading a guild or realm does not pass by will. The one exception: if your character was the last member of
          their realm, the heir becomes its leader 24 hours after the death, as long as they are alive and in no other
          faction. An heir who is still in another faction has a week from the death to leave it.
        </li>
      </ul>

      <WikiSectionHeading id="clues">Clues</WikiSectionHeading>
      <p className={body}>
        The clues you write describe your character: visual features, smells, home, habits. Every character also has an
        automatic clue that gives away their race. Low-effort or false clues can be punished.
      </p>
      <p className={`mt-3 ${body}`}>
        <code className={code}>/rpcharacter clues</code> opens your list. Click <strong>Add Clue</strong> to type a new
        one in chat, up to 10 in all, or click a clue to remove it. If you drop below the minimum (2, or 4 for an evil
        character), you are frozen until you add more.
      </p>
      <p className={`mt-3 ${body}`}>
        A thief can drop one of their clues at a door, display or chest they pick or rob (see{" "}
        <Link href="/wiki/thievery#clues" className={link}>
          Thievery
        </Link>
        ), and you can place your own.
      </p>
      <p className={`mt-3 ${body}`}>
        Characters within a few blocks of a clue can notice it over time, and Wisdom and Intelligence help. Clues fade.
        An old clue is harder to read than a fresh one, and each disappears within 2 days.
      </p>
      <p className={`mt-3 ${body}`}>
        To place a clue, run <code className={code}>/rpcharacter placeclue &lt;clue&gt;</code> with a clue of 12 to 48
        characters, then right-click the block where you want it within 30 seconds. The clue is anonymous and fades like
        any other. <code className={code}>/rpcharacter removeclue</code> removes the clues you placed within 10 blocks
        of you.
      </p>

      <WikiSectionHeading id="persona">Customising your character</WikiSectionHeading>
      <p className={body}>
        While playing, you can change your character&apos;s alias, gender, description, birthday and name colour with
        the <code className={code}>/rpcharacter</code> commands below. The alias is the name others see in place of your
        character&apos;s real name, and you first set it during creation. A mask still hides it in in-character chat.
      </p>
      <p className={`mt-3 ${body}`}>
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
