import Link from "next/link";
import {
  Callout,
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

export default function ClassesPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Classes & Professions"
      intro="Your class decides what equipment you can use and which skills you get. Professions are levelled separately, through gathering and crafting."
      width="lg"
    >
      <WikiSectionHeading id="start">Picking a class</WikiSectionHeading>
      <p className={body}>
        You choose one of seven classes while creating your character. Archer, Bard, Guardian, Paladin and Warrior are
        starting points: they have no skills and no class equipment of their own. At class level 2 each of them splits
        into three <strong>paths</strong> (subclasses), and the path you pick decides your gear and skills. The game
        reminds you to pick one with <code className={code}>/class</code>, and your level carries over. Mage and
        Musketeer have no paths and keep their own equipment from the start.
      </p>
      <p className={`mt-3 ${body}`}>
        <code className={code}>/class</code> opens Class Selection and <code className={code}>/subclass</code> shows the
        paths of your current class. Click a class once to select it and again to confirm. You can only pick paths of
        your current class, and changing your base class removes your path, so the menu asks first.
      </p>
      <ul className={`mt-3 list-disc space-y-1 pl-5 ${body}`}>
        <li>Your first class and your first path are free.</li>
        <li>Any change is also free for the first 5 days after the character was created.</li>
        <li>
          After that, changes cost 100, then 1,000, then 3,000 denars, and 3,000 for every change after that. The menu
          shows what your next change costs. You pay from your pouch or from the bank, and the full price must come from
          one of them.
        </li>
      </ul>

      <WikiSectionHeading id="classes">Classes and paths</WikiSectionHeading>
      <p className={body}>
        Every path is one of three types. <strong>Martial</strong> paths have only passive skills,{" "}
        <strong>semi-casters</strong> mix spells and passives, and <strong>full casters</strong> have only spells.
        Spells cost mana and are cast from your skill bar; the magic schools listed are the ones their spells draw on.
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
              columns={[{ header: "Path", nowrap: true }, { header: "Type", nowrap: true }, { header: "Equipment" }]}
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
        Mage spells come from runes set into weapons you build yourself (see{" "}
        <Link href="/wiki/magic" className={link}>
          Magic
        </Link>
        ). At class level 2 a Mage gets 4 <WikiItemLink name="Minor Runestone">Minor Runestones</WikiItemLink> and 4{" "}
        <WikiItemLink name="Minor Armor Runestone">Minor Armor Runestones</WikiItemLink> to start with. Only Musketeers
        can fire guns (see{" "}
        <Link href="/wiki/guns" className={link}>
          Guns &amp; Gunsmithing
        </Link>
        ).
      </p>
      <Callout className="mt-4">
        Some gear made before the paths were added still lists the old base classes, so no path can use it.
      </Callout>

      <WikiSectionHeading id="skills">Skill slots and points</WikiSectionHeading>
      <p className={body}>
        Open <code className={code}>/skills</code>, shift-left-click a skill, then left-click a slot to bind it.
        Right-click a slot to empty it. To cast a bound spell, press F (swap hands), then the number shown on the action
        bar. Each slot only takes certain kinds of skill, and new slots open as your path levels up:
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
        Skills unlock at class level 2 and can be upgraded to skill level 4. Paths get 2 skill points at levels 7, 12
        and 17, and each upgrade costs 1 point. Picking a path above those levels still gives you their slots and
        points. Foe Sense and Duel Instinct are always on and need no slot.
      </p>
      <p className={`mt-3 ${body}`}>
        To take your skill points back, craft a <WikiItemLink name="Skill Retraining Manual" /> at the{" "}
        <StationLink name="Tool Station" />. Instead of an item, you get a Skill Reallocation Point straight away. Then
        right-click the cauldron, <strong>Reallocate Skill Points</strong>, in <code className={code}>/skills</code> to
        spend it and get back every skill point you have spent.
      </p>

      <WikiSectionHeading id="acts">Level caps</WikiSectionHeading>
      <p className={body}>
        The current story act sets the highest level a path, Mage or Musketeer can reach. The server is in{" "}
        <strong>Act 1</strong>, so the cap is 11. Base classes stop at level 6 whatever the act, which is another reason
        to pick your path at level 2. Class EXP comes from killing creatures and from{" "}
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

      <WikiSectionHeading id="path-skills">Path skills</WikiSectionHeading>
      <p className={body}>
        Each path&apos;s skills are listed below. The in-game tooltips show each skill&apos;s effect, mana cost and
        cooldown at every skill level.
      </p>
      {subclasses.map((path) => (
        <div key={path.id}>
          <h3 id={`path-${path.id}`} className={h3}>
            {path.name}
          </h3>
          <p className={`mt-1 ${body}`}>
            {path.type} {baseClasses.find((b) => b.id === path.base)?.name} path. {path.lore}
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
          columns={[{ header: "Attribute", nowrap: true }, { header: "Each point gives" }]}
          rows={attributes.map((a) => [a.name, a.perPoint])}
        />
      </div>

      <WikiSectionHeading id="professions">Professions</WikiSectionHeading>
      <p className={body}>
        Professions are shared by all your characters: each one plays at the highest level any of them has reached.
        Profession points arrive unspent on every character, and the upgrades you buy in{" "}
        <code className={code}>/profession</code> stay with the character that bought them.
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
        accept by clicking the invite in chat. A party holds up to 8 players. Class EXP is shared between members within
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
