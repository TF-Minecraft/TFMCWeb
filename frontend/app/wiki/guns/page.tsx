import Link from "next/link";
import { DataTable, SeeAlso, StationLink, WikiPage, WikiSectionHeading, wikiPixelIcon } from "@/app/components/wiki";
import type { Recipe } from "@/app/wiki/data";
import { ammoMetals, gunAmmoKinds, gunAmmoRecipe, gunPartTexture, gunParts } from "../data/guns";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const subheading = "mt-6 text-sm font-semibold uppercase tracking-wide text-[var(--tfmc-mist)]";

const partGroups = [
  ["Barrel", "Barrels"],
  ["Loader", "Loaders"],
  ["Chamber", "Chambers"],
  ["Action", "Actions"],
  ["Stock", "Stocks"],
  ["Grip", "Grips"],
] as const;

const partColumns = [
  { header: "Part", width: "24%" },
  { header: "Fits", width: "16%" },
  { header: "Cost", width: "18%" },
  { header: "Notes" },
];

const gunTypes = [
  ["Rifle", "Barrel, loader, chamber, action and stock.", "Yes"],
  ["Pistol", "Barrel, loader, chamber, action and grip.", "No"],
  ["Shotgun", "Barrel, loader, chamber, action and stock.", "No"],
  ["Launcher", "Barrel, loader, chamber and action. No stock.", "Yes"],
];

const smithMaterials = [
  {
    perk: "Iron Smith",
    metal: "Iron",
    metalNote: "Cheap and crude. Upsides are smaller and downsides are harsher.",
    wood: "Barkwood",
    woodNote: "Crude, like iron.",
  },
  {
    perk: "Steel Smith",
    metal: "Steel",
    metalNote: "Every part works as designed.",
    wood: "Maplewood",
    woodNote: "Steadier on the move and mounted.",
  },
  {
    perk: "Abyssalite Smith",
    metal: "Abyssalite",
    metalNote: "The most accurate and the best at piercing armour, but slow to reload and heavy on the move.",
    wood: "Elderwood",
    woodNote: "The most accurate.",
  },
  {
    perk: "Mythril Smith",
    metal: "Mythril",
    metalNote: "The fastest and the steadiest, with the mildest downsides.",
    wood: "Demonwood",
    woodNote: "Strong and light.",
  },
];

function ItemName({ name, texture, qty }: { name: string; texture: string; qty?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={texture} alt={name} width={16} height={16} className={`h-6 w-6 shrink-0 ${wikiPixelIcon}`} />
      <span className="text-[var(--tfmc-cream)]">{qty ? `${qty} ${name}` : name}</span>
    </span>
  );
}

function Material({ name, note }: { name: string; note: string }) {
  return (
    <>
      <strong className="text-[var(--tfmc-cream)]">{name}.</strong> {note}
    </>
  );
}

/** What a recipe makes, plus what it takes when that is more than one of each ingredient. */
function AmmoYield({ recipe }: { recipe: Recipe }) {
  const takesMore = recipe.ingredients.some((item) => item.qty > 1);
  return (
    <>
      <ItemName name={recipe.output.name} qty={recipe.output.qty} texture={recipe.output.texture!} />
      {takesMore ? (
        <span className="mt-1 block text-xs text-[var(--tfmc-stone)]">
          from {recipe.ingredients.map((item) => `${item.qty} ${item.name}`).join(" + ")}
        </span>
      ) : null}
    </>
  );
}

export default function GunsPage() {
  return (
    <WikiPage
      lastModified="2026-11-12"
      title="Guns & Gunsmithing"
      intro={
        <>
          Guns are put together from parts at the <StationLink name="Gunsmithing Station" />. Anyone can build one, but
          only a{" "}
          <Link href="/wiki/classes" className={link}>
            Musketeer
          </Link>{" "}
          can fire it.
        </>
      }
      width="lg"
    >
      <WikiSectionHeading id="build">Building a gun</WikiSectionHeading>
      <ol className={`mt-2 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Craft the <StationLink name="Gunsmithing Station" /> on a crafting table and place it on the floor.
        </li>
        <li>Right-click it without sneaking. The Gun Assembly menu opens.</li>
        <li>
          Click the button in the top-left corner to choose a rifle, pistol, shotgun or launcher. Switching clears the
          parts you picked.
        </li>
        <li>
          Each part slot starts with a part you can make. Click a slot to pick a different one. Green arrows show what a
          part does well and red arrows what it does badly, without numbers. A barrier means you can&apos;t make any
          part for that slot. A launcher always shows one where the stock would go.
        </li>
        <li>
          Pick the metal to make the part from. Stocks and grips are made from wood instead, and each takes a fitting of
          leather, wool or feathers. Pick its quality: plain, Good, Great or Perfect.
        </li>
        <li>
          The finished gun appears on the right and shows its real stats. Click it to take it. The materials for every
          part come out of your inventory at once. If you are missing any, nothing is taken.
        </li>
      </ol>
      <DataTable
        className="mt-4"
        columns={[{ header: "Gun", nowrap: true }, { header: "Parts" }, { header: "Two-handed", nowrap: true }]}
        rows={gunTypes}
      />
      <p className={`mt-3 ${body}`}>
        The gun is named after its parts, for example a Matchlock Musket, a Double Flintlock Rifle or a Flintlock
        Blunderbuss. You can see every part on it, each in its own metal or wood.
      </p>

      <WikiSectionHeading id="materials">Perks and materials</WikiSectionHeading>
      <p className={body}>
        Your <strong>Smith</strong> perks from the Crafter profession decide which materials you can build with, not
        which parts. They are the same perks that unlock metals and woods for{" "}
        <Link href="/wiki/advanced-crafting#before-you-start" className={link}>
          Advanced Crafting
        </Link>
        , and each needs the one before it. Iron Smith is enough to build every type of gun. Fittings need no perk.
      </p>
      <p className={`mt-3 ${body}`}>A better material is not better at everything.</p>
      <DataTable
        className="mt-4"
        minWidth="40rem"
        columns={[{ header: "Perk", nowrap: true }, { header: "Metal parts" }, { header: "Stocks and grips" }]}
        rows={smithMaterials.map((row) => [
          row.perk,
          <Material key="metal" name={row.metal} note={row.metalNote} />,
          <Material key="wood" name={row.wood} note={row.woodNote} />,
        ])}
      />
      <p className={`mt-3 ${body}`}>
        A better fitting improves only what its stock or grip is for, never its downsides. The{" "}
        <Link href="#parts" className={link}>
          parts table
        </Link>{" "}
        says what that is. Plain leather is ordinary Leather, and plain wool has to be White Wool.
      </p>

      <WikiSectionHeading id="firing">Loading and firing</WikiSectionHeading>
      <ul className={`mt-2 list-disc space-y-2 pl-5 ${body}`}>
        <li>Guns only work while you are playing a character.</li>
        <li>A two-handed gun says so in its tooltip. Keep your off hand empty while you use one.</li>
        <li>
          A gun you have just taken in hand has to be drawn before it will fire or reload. Its hotbar slot shows the
          wait. Moving slows the draw and crouching speeds it up.
        </li>
        <li>
          Hold the gun in your main hand with its ammunition in your inventory. When it is empty, right-click to reload.
          It loads as many rounds as it holds, or as many as you carry.
        </li>
        <li>
          Moving while you reload slows it down. Switching to another hotbar slot stops the reload and gives the ammo
          back.
        </li>
        <li>
          Press the swap-hands key (F) while holding the gun to choose which shot the next reload uses. If you run out
          of that kind, the reload fails until you choose another.
        </li>
        <li>
          Crouch to aim. The gun comes up, you walk slower and your view narrows. Shots fired from the hip spread wider.
        </li>
        <li>
          Right-click to fire. If the chamber holds more than one shot, the gun fires that many times before it needs
          reloading.
        </li>
        <li>
          A rifle with the Experimental Arclock is fired through its scope. Aim, hold right-click until the scope
          steadies, then release to fire. Letting go too early lowers the scope without a shot.
        </li>
        <li>
          Only one gun of each type stays loaded. Firing one unloads your other guns of the same type and gives their
          ammo back.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Crouching gives the tightest shots. Walking, riding, sprinting and jumping all spread them wider. Your Charisma
        tightens your aim and speeds up your reloads.
      </p>
      <p className={`mt-3 ${body}`}>
        Bullets drop over distance, and past a certain range they start to lose damage. They fly through leaves and
        glass without breaking them. A shot to a player&apos;s head does extra damage. Shot and rockets push part of
        each hit straight through armour.
      </p>
      <p className={`mt-3 ${body}`}>
        Rockets explode when they hit something and hurt everyone nearby. They never break blocks, and they don&apos;t
        lose damage over distance. A rocket that bursts close to where it was fired hurts others only a little, but you
        always take your own blast in full.
      </p>
      <p className={`mt-3 ${body}`}>
        Bullets and rockets also damage vehicles. Bullets you fire from a seat in your own vehicle pass through it.
      </p>

      <WikiSectionHeading id="parts">Parts</WikiSectionHeading>
      <p className={body}>
        The cost is paid in the material you choose. Ingots are ingots of your metal, and refined wood is Refined
        Barkwood, Maplewood, Elderwood or Demonwood. The leather, wool or feathers are the fitting.
      </p>
      {partGroups.map(([kind, heading]) => (
        <section key={kind}>
          <h3 className={subheading}>{heading}</h3>
          <DataTable
            minWidth="46rem"
            fixedLayout
            columns={partColumns}
            rowKey={(_, index) => `${kind}-${index}`}
            rows={gunParts
              .filter((part) => part.kind === kind)
              .map((part) => [
                <ItemName key={part.part} name={part.part} texture={gunPartTexture(part.part)} />,
                part.for,
                part.cost,
                part.note,
              ])}
          />
        </section>
      ))}

      <WikiSectionHeading id="ammo">Ammunition</WikiSectionHeading>
      <p className={body}>
        Ammunition is made at the <StationLink name="Alchemy Station" /> from ingots, with no perk needed. Add Gunpowder
        to make the <strong>Powered</strong> version, which hits a little harder (for Spreadshot: one more pellet and a
        little more range). Better metal hits harder and gets more of each hit through armour (for Spreadshot: more
        pellets that fly further), but you get fewer rounds per ingot.
      </p>
      <p className={`mt-3 ${body}`}>
        The table shows what one ingot makes, or one ingot and one Gunpowder for the powered version. The biggest
        rockets take more, and the table says how much.
      </p>
      <DataTable
        className="mt-4"
        minWidth="52rem"
        columns={[
          { header: "Ammunition", nowrap: true },
          { header: "Fired by" },
          ...ammoMetals.map((metal) => ({ header: metal })),
        ]}
        rows={gunAmmoKinds.flatMap((kind) =>
          [false, true].map((powered) => [
            powered ? `Powered ${kind.kind}` : kind.kind,
            kind.firedBy,
            ...ammoMetals.map((metal) => <AmmoYield key={metal} recipe={gunAmmoRecipe(metal, kind, powered)} />),
          ]),
        )}
      />
      <p className={`mt-3 ${body}`}>
        The metal of the barrel decides which metals the gun can load, plain or powered. An iron barrel loads only iron.
        A steel barrel adds steel, an abyssalite barrel adds bronze, and a mythril barrel loads all four. It works the
        same for Shot, Spreadshot and Rockets. The Proof Chamber and the Steamlock narrow it further, as the{" "}
        <Link href="#parts" className={link}>
          parts table
        </Link>{" "}
        says. The gun&apos;s tooltip lists every shot it takes.
      </p>

      <WikiSectionHeading id="old-guns">Old guns</WikiSectionHeading>
      <p className={body}>
        Guns built before you could choose a material for each part are taken apart automatically. It happens when you
        join with one, select it on your hotbar, click it in your inventory, or right-click the Gunsmithing Station
        while holding it. You get back the materials it cost and any shots loaded in it. A gun that was free or given by
        staff is removed with nothing back. An old gun in a chest stays as it is until someone takes it out.
      </p>

      <SeeAlso hrefs={["/wiki/classes", "/wiki/advanced-crafting", "/wiki/recycler", "/wiki/stations"]} />
    </WikiPage>
  );
}
