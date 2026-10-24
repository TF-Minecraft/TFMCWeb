import Link from "next/link";
import { DataTable, SeeAlso, StationLink, WikiPage, WikiSectionHeading, wikiPixelIcon } from "@/app/components/wiki";
import { ammoMetals, gunAmmoKinds, gunAmmoRecipe, gunPartTexture, gunParts } from "../data/guns";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

const partKinds = ["Barrel", "Loader", "Chamber", "Action", "Stock"] as const;

const gunTypes = [
  ["Rifle", "Barrel, loader, chamber, action and stock.", "Iron Smith"],
  ["Pistol", "Barrel, loader, chamber and action. No stock.", "Iron Smith"],
  ["Shotgun", "Spread Barrel, loader, chamber, action and stock.", "Steel Smith"],
  ["Launcher", "Launcher Barrel, loader, chamber and Rocketlock. No stock.", "Abyssalite Smith"],
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

export default function GunsPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
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
        <li>Right-click it without sneaking. The Gun Assembly menu opens on a rifle.</li>
        <li>Click the button in the top-left corner to switch between rifle, pistol, shotgun and launcher.</li>
        <li>
          Each part slot already holds a part you are able to make. Click a slot to pick a different part. A barrier
          means you can&apos;t make any part for that slot yet. Pistols and launchers always show one in the stock slot,
          because they take no stock.
        </li>
        <li>
          Click the finished gun on the right. The materials for all its parts are taken from your inventory at once.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Which parts you can use depends on your <strong>Smith</strong> perks from the Crafter profession, the same perks
        that unlock metals and woods for{" "}
        <Link href="/wiki/advanced-crafting#before-you-start" className={link}>
          Advanced Crafting
        </Link>
        : Iron Smith for iron parts and oak stocks, Steel Smith for steel and maplewood, Abyssalite Smith for abyssalite
        and elderwood, and Mythril Smith for mythril and demonwood.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Gun", nowrap: true }, { header: "Parts" }, { header: "Lowest perk", nowrap: true }]}
        rows={gunTypes}
      />
      <p className={`mt-3 ${body}`}>
        The gun is named after its parts (a Matchlock Musket, a Steamlock Pistol, a Blunderbuss) and its look comes from
        its action, or from its barrel for shotguns and launchers. Its tooltip lists its stats and the ammunition it
        takes.
      </p>

      <WikiSectionHeading id="firing">Loading and firing</WikiSectionHeading>
      <ul className={`mt-2 list-disc space-y-2 pl-5 ${body}`}>
        <li>Guns only work while you are playing a character.</li>
        <li>
          Rifles and launchers are two-handed, and their tooltip says so. Keep your off hand empty while you use one.
        </li>
        <li>
          Hold the gun in your main hand with its ammunition in your inventory. When it is empty, right-click to reload.
          It loads as many rounds as it holds, or as many as you carry.
        </li>
        <li>
          Moving while you reload slows it down. Switching to another hotbar slot stops the reload and gives the ammo
          back.
        </li>
        <li>Right-click to fire. Revolvers and Quad Shot launchers fire several times before they need reloading.</li>
        <li>
          Sneak and right-click to choose which ammunition the next reload uses. If you run out of that kind, the reload
          fails until you choose another.
        </li>
        <li>
          Only one gun of each type stays loaded. Firing one unloads your other guns of the same type and gives their
          ammo back.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Bullets drop over distance and fly through leaves and glass without breaking them. A shot to a player&apos;s
        head does extra damage. Shot and rockets push part of each hit straight through armour. Rockets explode when
        they hit something and hurt everyone nearby, you included, but they never break blocks. Bullets and rockets also
        damage vehicles. Your Charisma tightens your aim and speeds up your reloads.
      </p>

      <WikiSectionHeading id="parts">Parts</WikiSectionHeading>
      <p className={body}>
        A part&apos;s exact stats show in the Gun Assembly menu. Better metal and wood generally means a better gun.
      </p>
      <DataTable
        className="mt-4"
        minWidth="44rem"
        columns={[
          { header: "Part" },
          { header: "Fits", nowrap: true },
          { header: "Perk", nowrap: true },
          { header: "Cost", nowrap: true },
          { header: "Notes" },
        ]}
        rows={partKinds.flatMap((kind) =>
          gunParts
            .filter((part) => part.kind === kind)
            .map((part) => [
              <ItemName key={part.part} name={part.part} texture={gunPartTexture(part.part)} />,
              part.for.replaceAll("/", ", "),
              `${part.rank[0].toUpperCase()}${part.rank.slice(1)} Smith`,
              part.cost,
              part.note,
            ]),
        )}
      />

      <WikiSectionHeading id="ammo">Ammunition</WikiSectionHeading>
      <p className={body}>
        Ammunition is made at the <StationLink name="Alchemy Station" /> from one ingot, with no perk needed. Add one
        Gunpowder to make the <strong>Powered</strong> version, which hits a little harder. Better metal hits harder and
        gets more of each hit through armour (for Spreadshot: more pellets that fly further), but you get fewer rounds
        per ingot.
      </p>
      <DataTable
        className="mt-4"
        minWidth="44rem"
        columns={[
          { header: "Ammunition" },
          { header: "Fired by" },
          ...ammoMetals.map((metal) => ({ header: `From 1 ${metal} Ingot` })),
        ]}
        rows={gunAmmoKinds.map((kind) => [
          kind.kind,
          kind.firedBy,
          ...ammoMetals.map((metal) => {
            const recipe = gunAmmoRecipe(metal, kind);
            return (
              <ItemName
                key={metal}
                name={recipe.output.name}
                qty={recipe.output.qty}
                texture={recipe.output.texture!}
              />
            );
          }),
        ])}
      />
      <p className={`mt-3 ${body}`}>
        Rifled barrels take Iron or Steel Shot and smoothbore barrels only Iron Shot. Bronze and Mythril Shot only fit a
        rifle with the Experimental Arclock. Spreadshot and Rockets of every metal fit any shotgun or launcher.
      </p>

      <SeeAlso hrefs={["/wiki/classes", "/wiki/advanced-crafting", "/wiki/recycler", "/wiki/stations"]} />
    </WikiPage>
  );
}
