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
import { attributes, baseClasses, classesCommands, professions, skills, slotRows, subclasses } from "../data/classes";

const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const h3 = "mt-6 font-[family-name:var(--font-fraunces)] text-lg text-[var(--tfmc-cream)]";

const pathsOf = (baseId: string) => subclasses.filter((s) => s.base === baseId);

const skillKind = (id: string) => {
  const skill = skills[id];
  if (skill.always) return "Always on";
  return skill.passive ? "Passive" : "Spell";
};

const statuses: [string, string][] = [
  ["Slowed", "You move slower."],
  ["Weakened", "You get the Weakness effect."],
  ["Burnt", "You take damage every second."],
  ["Bleeding", "You take damage every second for a few seconds. Rend causes it."],
  ["Frozen", "You cannot move or jump."],
  ["Stunned", "You cannot move or jump for a moment. Ground Smash, Warrior Lunge and Vibrative Strike cause it."],
  ["Silenced", "You cannot cast spells."],
  [
    "Wounded",
    "All healing you get is much weaker, lifesteal and regeneration included. Absorption shields are not affected. Only the Cleric's Restoration removes it early.",
  ],
];

export default function ClassesPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
      title="Classes & Professions"
      intro="Your class decides what equipment you can use and which skills you get. Professions are levelled separately, through gathering and crafting."
      width="lg"
    >
      <WikiSectionHeading id="start">Picking a class</WikiSectionHeading>
      <p className={body}>
        You choose 1 of 7 classes while{" "}
        <Link href="/wiki/characters#creating" className={link}>
          creating your character
        </Link>
        : Archer, Bard, Guardian, Mage, Musketeer, Paladin or Warrior.
      </p>
      <p className={`mt-3 ${body}`}>
        Archer, Bard, Guardian, Paladin and Warrior are starting points. They have no skills and no class equipment of
        their own. At class level 2 each of them splits into 3 <strong>subclasses</strong>, and the subclass you pick
        decides your gear and skills. The game reminds you to pick one with <code className={code}>/class</code>, and
        your level carries over.
      </p>
      <p className={`mt-3 ${body}`}>
        Mage is a starting point too. Its 3 subclasses are called <strong>paths</strong>: Invoker, Conjurer and
        Battlemage. You can pick a path from class level 1. A Mage without a path has no class equipment, so it cannot
        use Mage weapons or Mage Armour, and chat reminds it every 10 minutes to pick one with{" "}
        <code className={code}>/class</code>.
      </p>
      <p className={`mt-3 ${body}`}>Musketeer has no subclasses and keeps its own equipment from the start.</p>
      <p className={`mt-3 ${body}`}>
        <code className={code}>/class</code> opens Class Selection. <code className={code}>/subclass</code>, or the
        arrow button in Class Selection, opens Subclass Selection with the subclasses or paths of your current class.
        Click once to select and again to confirm. You can only pick a subclass of your current class. Changing class
        removes your subclass, so the menu asks first.
      </p>
      <h3 id="costs" className={h3}>
        What a change costs
      </h3>
      <ul className={`mt-3 list-disc space-y-1 pl-5 ${body}`}>
        <li>Your first class is free.</li>
        <li>Your first subclass is free, and so is the first one you pick after each class change.</li>
        <li>Any change is free for the first 5 days after the character was created.</li>
        <li>
          After that, changes cost 100, then 1,000, then 3,000 denars, and 3,000 for every change after that. The menu
          shows what your next change costs. You pay from your pouch or from the bank, and the whole price has to come
          from one of them.
        </li>
        <li>Switching to another subclass of the same class is a paid change, except between Mage paths.</li>
      </ul>
      <h3 id="mage-paths" className={h3}>
        Switching Mage paths
      </h3>
      <p className={`mt-1 ${body}`}>
        You get 1 free switch between Mage paths every 24 hours, in the same Subclass Selection menu. While it is ready,
        the menu shows &quot;Uses your free path switch for 24h&quot; and its info item shows &quot;Path switch: Free
        now&quot;. After you use it, they show &quot;Free path switch again in &lt;time&gt;&quot; and &quot;Path switch:
        Free in &lt;time&gt;&quot;. A second switch within those 24 hours is a normal paid class change. During your
        first 5 days a switch is free and does not use up the daily one.
      </p>
      <p className={`mt-3 ${body}`}>
        A path has no class skills or skill points, so you lose nothing by switching. The real cost is building and
        charging a{" "}
        <Link href="/wiki/mage-weapons#overview" className={link}>
          weapon
        </Link>{" "}
        for the new path.
      </p>

      <WikiSectionHeading id="classes">Classes and subclasses</WikiSectionHeading>
      <p className={body}>
        Every subclass is one of 3 types. <strong>Martial</strong> subclasses have only passive skills.{" "}
        <strong>Semi-casters</strong> have spells and passives. <strong>Full casters</strong> have only spells. Spells
        cost mana and are cast from your skill bar. The Mage paths are full casters too, but their spells come from the
        weapon they carry (see below). The magic schools listed for a subclass are the{" "}
        <Link href="/wiki/magic#basics" className={link}>
          schools
        </Link>{" "}
        its spells belong to.
      </p>
      {baseClasses.map((base) => (
        <div key={base.id}>
          <h3 id={`class-${base.id}`} className={h3}>
            {base.name}
          </h3>
          <p className={`mt-1 ${body}`}>{base.lore}</p>
          {base.equipment ? (
            <p className={`mt-2 ${body}`}>
              <strong>Equipment:</strong> <WikiItemText text={base.equipment} />.
            </p>
          ) : (
            <DataTable
              className="mt-2"
              columns={[
                { header: "Subclass", nowrap: true },
                { header: "Type", nowrap: true },
                { header: "Equipment" },
              ]}
              rows={pathsOf(base.id).map((path) => [
                <a key={path.id} href={`#path-${path.id}`} className={link}>
                  {path.name}
                </a>,
                path.type,
                <WikiItemText key={`${path.id}-equipment`} text={path.equipment} />,
              ])}
            />
          )}
        </div>
      ))}
      <p className={`mt-4 ${body}`}>
        A Mage path gets its spells from runes set into a weapon you build yourself, not from{" "}
        <code className={code}>/skills</code> (see{" "}
        <Link href="/wiki/mage-weapons" className={link}>
          Mage Weapons
        </Link>
        ). Mage spells work in every school, through your Resonance (see{" "}
        <Link href="/wiki/magic#basics" className={link}>
          Magic
        </Link>
        ). Mage Staffs are two-handed. Mage Wands and Mage Blades are one-handed.
      </p>
      <p className={`mt-3 ${body}`}>
        At class level 2 every Mage, with or without a path, gets 4{" "}
        <WikiItemLink name="Minor Runestone">Minor Runestones</WikiItemLink> and 4{" "}
        <WikiItemLink name="Minor Armor Runestone">Minor Armor Runestones</WikiItemLink>. You get them once per
        character, so switching paths never gives them again.
      </p>
      <p className={`mt-3 ${body}`}>
        Only Musketeers can fire guns (see{" "}
        <Link href="/wiki/guns" className={link}>
          Guns &amp; Gunsmithing
        </Link>
        ).
      </p>

      <WikiSectionHeading id="skills">Skill slots and points</WikiSectionHeading>
      <p className={body}>
        Open <code className={code}>/skills</code>, shift-left-click a skill, then left-click a slot to bind it.
        Right-click a slot to empty it. To cast a bound spell, press F (swap hands), then the number shown on the action
        bar. Each slot only takes certain kinds of skill, and new slots open as your subclass levels up:
      </p>
      <div className="mt-4">
        <DataTable
          columns={[
            { header: "Type", nowrap: true },
            { header: "Slot I" },
            { header: "Level 7" },
            { header: "Level 12" },
            { header: "Level 17" },
          ]}
          rows={slotRows}
        />
      </div>
      <p className={`mt-3 ${body}`}>
        Mage paths and Musketeers have no skills for the skill bar, so the table does not apply to them.
      </p>
      <p className={`mt-3 ${body}`}>
        Skills unlock at class level 2 and can be upgraded to skill level 4. An upgrade costs 1 skill point. Subclasses
        get 2 points at each of levels 7, 12 and 17. If you pick a subclass after passing those levels, you still get
        the slots and points for them.
      </p>
      <p className={`mt-3 ${body}`}>
        Recovery, Foe Sense and Duel Instinct are always on and need no slot. Every character heals slowly on its own
        during a fight, and faster once out of combat. Being{" "}
        <a href="#statuses" className={link}>
          Wounded
        </a>{" "}
        weakens this healing.
      </p>
      <p className={`mt-3 ${body}`}>
        To take your skill points back, craft a <WikiItemLink name="Skill Retraining Manual" /> at the{" "}
        <StationLink name="Tool Station" />. The craft gives no item. You get a Skill Reallocation Point straight away
        instead. Open <code className={code}>/skills</code> and right-click the cauldron (
        <strong>Reallocate Skill Points</strong>) to spend it. Every skill point you have spent comes back.
      </p>

      <WikiSectionHeading id="acts">Level caps</WikiSectionHeading>
      <p className={body}>
        The current story act sets the highest level a subclass, a Mage (with or without a path) or a Musketeer can
        reach. The server is in <strong>Act 1</strong>, so the cap is 11. Archer, Bard, Guardian, Paladin and Warrior
        stop at level 6 whatever the act, which is another reason to pick your subclass at level 2. Class EXP comes from
        killing creatures and from{" "}
        <Link href="/wiki/codex" className={link}>
          Codex
        </Link>{" "}
        discoveries.
      </p>
      <div className="mt-4">
        <DataTable
          columns={[{ header: "Act" }, { header: "Level cap", align: "right" }]}
          rows={[
            ["Prologue", 6],
            ["Act 1 (current)", 11],
            ["Act 2", 16],
            ["Act 3", 21],
          ]}
        />
      </div>

      <WikiSectionHeading id="path-skills">Subclass skills</WikiSectionHeading>
      <p className={body}>
        Each subclass&apos;s skills are listed below. The in-game tooltips show each skill&apos;s effect, mana cost and
        cooldown at every skill level.
      </p>
      <h3 id="statuses" className={h3}>
        Statuses
      </h3>
      <p className={`mt-1 ${body}`}>Some skills put a status on whoever they hit. Each status wears off on its own.</p>
      <DataTable
        className="mt-2"
        columns={[{ header: "Status", nowrap: true }, { header: "What it does" }]}
        rows={statuses}
      />
      <p className={`mt-2 ${body}`}>
        Skills that remove statuses, such as Bless and Restoration, do not end Stunned or Bleeding.
      </p>
      {subclasses.map((path) => (
        <div key={path.id}>
          <h3 id={`path-${path.id}`} className={h3}>
            {path.name}
          </h3>
          <p className={`mt-1 ${body}`}>
            {`${path.type} ${baseClasses.find((b) => b.id === path.base)?.name} subclass.`} {path.lore}
            {path.magic ? ` Magic: ${path.magic}.` : ""}
          </p>
          <DataTable
            className="mt-2"
            columns={[{ header: "Skill", nowrap: true }, { header: "Kind", nowrap: true }, { header: "What it does" }]}
            rows={path.skills.map((id) => [skills[id].name, skillKind(id), skills[id].description])}
          />
        </div>
      ))}

      <WikiSectionHeading id="attributes">Attributes</WikiSectionHeading>
      <p className={body}>
        Your starting attributes are set while creating your character. An <WikiItemLink name="Attribute Tome" /> gives
        you more points to spend in <code className={code}>/attributes</code>. Each attribute takes up to 20 points.
      </p>
      <div className="mt-4">
        <DataTable
          columns={[{ header: "Attribute", nowrap: true }, { header: "What it improves" }]}
          rows={attributes.map((a) => [a.name, a.perPoint])}
        />
      </div>

      <WikiSectionHeading id="professions">Professions</WikiSectionHeading>
      <p className={body}>
        Professions are shared by all your characters. Each character uses the highest level any of them has reached.
        Points are not shared. Every character gets its own points to spend in <code className={code}>/profession</code>
        , and the perks it buys are its own.
      </p>
      <ul className={`mt-3 list-disc space-y-1 pl-5 ${body}`}>
        <li>Each profession level gives you 1 point to spend on that profession&apos;s perks.</li>
        <li>
          A character can spend at most 40 points in all. The menu shows this as <strong>Spent Points</strong>.
        </li>
        <li>Most perks are in lines, and each perk in a line needs the one before it.</li>
        <li>
          To remove a perk, click it, then run <code className={code}>/profession confirm</code> within 60 seconds. You
          do not get the points back, and you cannot remove a perk that another of your perks needs.
        </li>
      </ul>
      <div className="mt-4">
        <DataTable
          columns={[{ header: "Profession" }, { header: "How to level it" }]}
          rows={professions.map((p) => [p.displayName, <WikiItemText key={p.id} text={p.howItLevels} />])}
        />
      </div>
      <h3 className={h3}>What gives profession EXP</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {professions.map((p) => (
          <section
            key={p.id}
            id={`profession-${p.id}`}
            className="rounded-md border border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_55%,transparent)] p-4"
          >
            <h4 className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--tfmc-cream)]">
              {p.displayName}
            </h4>
            {p.activities.map((group) => (
              <div key={group.label} className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tfmc-stone)]">{group.label}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="rounded border border-[color-mix(in_srgb,var(--tfmc-accent)_30%,transparent)] px-2 py-0.5 text-xs text-[var(--tfmc-mist)]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>

      <WikiSectionHeading id="parties">Parties</WikiSectionHeading>
      <p className={body}>
        <code className={code}>/party</code> opens the party menu, where you create a party and invite players. They
        accept by clicking the invite in chat. A party holds up to 8 players. Class EXP is split between members within
        48 blocks of each other, but profession EXP is not. Start a chat message with <code className={code}>@</code> to
        talk to your party. This is a different party from the roleplay chat group made with{" "}
        <code className={code}>/rpcharacter party</code> (see{" "}
        <Link href="/wiki/characters#chat" className={link}>
          Chat channels
        </Link>
        ).
      </p>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={classesCommands.commands} />
      <SeeAlso
        hrefs={["/wiki/characters", "/wiki/equipment-slots", "/wiki/magic", "/wiki/guns", "/wiki/advanced-crafting"]}
      />
    </WikiPage>
  );
}
