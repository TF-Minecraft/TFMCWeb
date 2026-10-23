import {
  Callout,
  CommandTable,
  DataTable,
  ItemChip,
  ItemGallery,
  SeeAlso,
  StationLink,
  WikiPage,
  WikiItemLink,
  WikiSectionHeading,
} from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import Link from "next/link";
import {
  advancedCraftingCommands,
  alloyForgeRecipe,
  armorRecipeTemplates,
  bowRecipeTemplates,
  ingredientConverterRecipe,
  ingredientTypes,
  weaponRecipeTemplates,
  weaponStationRecipe,
} from "../data/advanced-crafting";
import type { StationRecipeTemplate, TemplateIngredient } from "../data/advanced-crafting";
import { T, V } from "../data/helpers";

const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const subheading = "mt-6 text-sm font-semibold uppercase tracking-wide text-[var(--tfmc-mist)]";
const chipBox =
  "rounded border border-[color-mix(in_srgb,var(--tfmc-cream)_14%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_45%,transparent)] px-3 py-2 text-sm";

const qualityTiers = [
  ["Below 50%", "Rusted", "None"],
  ["50%", "Tempered", "Basic"],
  ["75%", "Polished", "Polished"],
  ["90%", "Gleaming", "Radiant"],
  ["100%", "Masterwork", "Mythical"],
];

/** Crafter perks that unlock metals and woods (`RPCharacters/professions/crafter.yml`, AC `ingredients.yml`). */
const smithPerks: [string, string, string[]][] = [
  ["Iron Smith", "1", ["Iron Ingot", "Refined Barkwood"]],
  ["Steel Smith", "2", ["Steel Ingot", "Refined Maplewood"]],
  ["Abyssalite Smith", "3", ["Abyssalite Ingot", "Bronze Ingot", "Refined Elderwood"]],
  ["Mythril Smith", "4", ["Mythril Ingot", "Refined Demonwood"]],
];

const gemstones = [
  "Agate",
  "Jasper",
  "Onyx",
  "Tourmaline",
  "Pearl",
  "Coral",
  "Chrysoprase",
  "Larimar",
  "Rhodonite",
  "Vesuvianite",
  "Turquoise",
  "Peridot",
  "Malachite",
  "Zircon",
  "Apatite",
  "Carnelian",
  "Labradorite",
  "Sardonyx",
  "Variscite",
  "Wulfenite",
  "Aquamarine",
  "Garnet",
  "Opal",
  "Tanzanite",
  "Moonstone",
  "Sunstone",
  "Spinel",
  "Alexandrite",
  "Firestone",
  "Cloudstone",
  "Ruby",
  "Sapphire",
  "Topaz",
  "Citrine",
  "Morganite",
  "Crystallite",
  "Tiger's Eye",
  "Serpent's Eye",
  "Musgravite",
  "Taaffeite",
];

function gemstoneTexture(name: string) {
  const filename = name
    .replace("Tiger's", "Tigers")
    .replace("Serpent's", "Serpents")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
  return T(`gems/${filename}.png`);
}

const otherCrystals: [string, string][] = [
  ["Ignitium", T("materials/ignitium.png")],
  ["Raw Tin", T("materials/raw_tin.png")],
  ["Abyssalite Fragment", T("materials/abyssalite.png")],
  ["Mythril Fragment", T("materials/mythril_fragment.png")],
];

const softMaterials: [string, [string, string][]][] = [
  [
    "Leather",
    [
      ["Leather", V("leather.png")],
      ["Rare Leather", T("pets/rareleather.png")],
      ["Epic Leather", T("pets/epicleather.png")],
      ["Legendary Leather", T("pets/legendaryleather.png")],
    ],
  ],
  [
    "Feather",
    [
      ["Feather", V("feather.png")],
      ["Rare Feather", T("pets/rarefeather.png")],
      ["Epic Feather", T("pets/epicfeather.png")],
      ["Legendary Feather", T("pets/legendaryfeather.png")],
    ],
  ],
  [
    "Wool",
    [
      ["Wool", V("white_wool.png")],
      ["Rare Wool", T("pets/rarewool.png")],
      ["Epic Wool", T("pets/epicwool.png")],
      ["Legendary Wool", T("pets/legendarywool.png")],
    ],
  ],
  ["Enchanted Dust", [["Enchanted Dust", T("magic_crafting/enchanted_dust.png")]]],
];

const forgingTools = [
  { name: "Forging Hammer", image: T("mmoitems/forging_hammer.png"), detail: "Hit · metal work" },
  { name: "Forging Small Hammer", image: T("mmoitems/forging_small_hammer.png"), detail: "Small Hit · metal work" },
  { name: "Forging Etching Tool", image: T("mmoitems/forging_etching_tool.png"), detail: "Etch · refining" },
  { name: "Forging Whittling Tool", image: T("mmoitems/forging_whittling_tool.png"), detail: "Whittle · refining" },
  { name: "Forging Engraving Tool", image: T("mmoitems/forging_engraving_tool.png"), detail: "Engrave · refining" },
  { name: "Forging Sewing Needle", image: T("mmoitems/forging_sewing_needle.png"), detail: "Sew · refining" },
  {
    name: "Forging Branding Tool",
    image: T("mmoitems/forging_branding_tool.png"),
    detail: "Finish, check or cancel a project",
  },
];

/**
 * A recipe output name as the config stores it: `%material%` is a placeholder
 * the plugin fills in at craft time with a generated material name.
 */
function TemplateName({ name }: { name: string }) {
  const [before, after = ""] = name.split("%material%");
  return (
    <span>
      {before}
      <span className="italic text-[var(--tfmc-accent)]">Material</span>
      {after}
    </span>
  );
}

/** "4 × Metal · 2 × Leather · ...": ingredient *types*, not specific items. */
function IngredientTypeList({ ingredients }: { ingredients: TemplateIngredient[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {ingredients.map((ingredient) => (
        <span key={ingredient.type} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-black/40"
            style={{ backgroundColor: ingredientTypes[ingredient.type].color }}
          />
          {ingredient.qty} × {ingredientTypes[ingredient.type].label}
        </span>
      ))}
    </span>
  );
}

const socketTrackLabel: Record<StationRecipeTemplate["socketGroup"], string> = {
  gemstones: "Gemstone",
  mage_armor_runes: "Armor Rune",
};

const recipeCount = armorRecipeTemplates.length + weaponRecipeTemplates.length + bowRecipeTemplates.length;

export default function AdvancedCraftingPage() {
  return (
    <WikiPage
      lastModified="2026-10-22"
      title="Advanced Crafting"
      intro={
        <>
          Weapons, armour and bows are forged by hand at a <StationLink name="Forging Station" />. You pick a recipe,
          load the materials, then work them with forging tools. The materials decide the item&apos;s stats and how well
          you work them decides its socket. At the <StationLink name="Alloy Forge" /> you can also invent new alloys and
          name them.
        </>
      }
    >
      <WikiSectionHeading id="before-you-start">Before you start</WikiSectionHeading>
      <p className={body}>
        Every metal and wood needs a perk from the <strong>Crafter</strong> profession. You earn points by levelling
        Crafter and spend them in <code className={code}>/profile</code>. Each perk needs the one before it. Without the
        perk, the station refuses the material with &quot;You are not skilled enough&quot;. Crystals, leather, feathers,
        wool and Enchanted Dust need no perk.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Crafter perk" }, { header: "Points", align: "right" }, { header: "Unlocks" }]}
        rows={smithPerks.map(([perk, cost, materials]) => [
          perk,
          cost,
          <span key={perk} className="inline-flex flex-wrap gap-x-3 gap-y-1">
            {materials.map((name) => (
              <ItemChip key={name} name={name} texture={name === "Iron Ingot" ? V("iron_ingot.png") : undefined} />
            ))}
          </span>,
        ])}
      />
      <p className={`mt-3 ${body}`}>
        Raw materials have to be turned into ingredients before a station will take them. Right-click an{" "}
        <StationLink name="Ingredient Converter" /> while holding them: the whole stack is converted and a{" "}
        <strong>Stat Preview</strong> shows which stats the material adds to each kind of item. You can do the same with
        an ingredient or alloy just to see its preview.
      </p>
      <p className={`mt-3 ${body}`}>
        The forging tools are made at the <StationLink name="Tool Station" /> (sneak and right-click a crafting table).
      </p>

      <WikiSectionHeading id="crafting-a-weapon">Forging an item</WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Right-click an empty <StationLink name="Forging Station" /> and choose a category (Armor, Weapons or Bows),
          then a recipe. A station works on one recipe at a time.
        </li>
        <li>
          Right-click the station with each ingredient to load it. Recipes ask for types, such as &quot;4 × Metal&quot;,
          so you choose which metal or wood goes in.
        </li>
        <li>
          Once everything is loaded, left-click the station with the forging tools. Each material needs its own amount
          of work from each tool, and the recipe doesn&apos;t tell you how much.
        </li>
        <li>
          Left-click with the <WikiItemLink name="Forging Branding Tool" /> to finish. You can finish whenever you like
          after loading. Right-click with it to see your progress, or sneak and left-click to cancel.
        </li>
      </ol>
      <Callout variant="warning">
        Cancelling, or breaking the station mid-project, drops the loaded ingredients and loses the work. You can&apos;t
        break a Forging Station while holding a forging tool.
      </Callout>

      <WikiSectionHeading id="quality">Quality and sockets</WikiSectionHeading>
      <p className={body}>
        When you finish, you see your <strong>Hit Percentage</strong>: how close your work came to what the materials
        needed. Working too much costs as much as working too little, and only exact work can reach Masterwork. The
        grade decides the socket the item gets. It doesn&apos;t change the stats, which come from the materials, but
        your Crafter XP is scaled by the percentage.
      </p>
      <DataTable
        className="mt-4"
        columns={[
          { header: "Hit Percentage", align: "right", nowrap: true },
          { header: "Quality" },
          { header: "Socket" },
        ]}
        rows={qualityTiers}
      />
      <p className={`mt-3 ${body}`}>
        Mage armour gets Armor Rune sockets instead of gemstone ones (Minor, Lesser, Greater and Ascendant, at the same
        thresholds). Everything else takes{" "}
        <Link href="/wiki/gem-infusion" className={link}>
          infused gemstones
        </Link>
        .
      </p>

      <WikiSectionHeading id="recipes">Recipes</WikiSectionHeading>
      <p className={body}>
        There are {recipeCount} recipes. &quot;4 × Metal&quot; means any four metal ingredients: four Iron Ingots, a
        mix, or an alloy. The item is named after the material you used most, shown here as{" "}
        <span className="italic text-[var(--tfmc-accent)]">Material</span>. Durability also comes from the materials.
      </p>

      <h3 className={subheading}>Armor</h3>
      <DataTable
        columns={[
          { header: "Class", nowrap: true },
          { header: "Item" },
          { header: "Ingredients" },
          { header: "Socket", nowrap: true },
        ]}
        rows={armorRecipeTemplates.map((recipe) => [
          recipe.group,
          <TemplateName key={recipe.id} name={recipe.name} />,
          <IngredientTypeList key={recipe.id} ingredients={recipe.ingredients} />,
          socketTrackLabel[recipe.socketGroup],
        ])}
        rowKey={(_row, index) => armorRecipeTemplates[index].id}
        minWidth="40rem"
      />

      <h3 className={subheading}>Weapons</h3>
      <DataTable
        columns={[{ header: "Item" }, { header: "Ingredients" }]}
        rows={weaponRecipeTemplates.map((recipe) => [
          <TemplateName key={recipe.id} name={recipe.name} />,
          <IngredientTypeList key={recipe.id} ingredients={recipe.ingredients} />,
        ])}
        rowKey={(_row, index) => weaponRecipeTemplates[index].id}
      />

      <h3 className={subheading}>Bows</h3>
      <DataTable
        columns={[{ header: "Item" }, { header: "Ingredients" }]}
        rows={bowRecipeTemplates.map((recipe) => [
          <TemplateName key={recipe.id} name={recipe.name} />,
          <IngredientTypeList key={recipe.id} ingredients={recipe.ingredients} />,
        ])}
        rowKey={(_row, index) => bowRecipeTemplates[index].id}
      />

      <WikiSectionHeading id="ingredients">Ingredients</WikiSectionHeading>
      <h3 className={subheading}>Crystals</h3>
      <p className={`mt-1 ${body}`}>The 40 gemstones and four other crystals. Only crystals can go into an alloy.</p>
      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {gemstones.map((name) => (
          <li key={name} className={chipBox}>
            <ItemChip name={name} texture={gemstoneTexture(name)} />
          </li>
        ))}
        {otherCrystals.map(([name, texture]) => (
          <li key={name} className={chipBox}>
            {name === "Raw Tin" ? (
              <Link
                href="/wiki/materials/tin"
                className="underline-offset-2 hover:text-[var(--tfmc-accent)] hover:underline"
              >
                <ItemChip name={name} texture={texture} link={false} />
              </Link>
            ) : (
              <ItemChip name={name} texture={texture} />
            )}
          </li>
        ))}
      </ul>

      <h3 className={subheading}>Leather, feathers, wool and dust</h3>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {softMaterials.map(([type, items]) => (
          <section key={type} className={chipBox}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--tfmc-mist)]">{type}</h4>
            <ul className="mt-2 space-y-2">
              {items.map(([name, texture]) => (
                <li key={name}>
                  <ItemChip name={name} texture={texture} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <WikiSectionHeading id="tools">Forging tools</WikiSectionHeading>
      <ItemGallery items={forgingTools} centeredSelectors />

      <WikiSectionHeading id="alloy-forge">Inventing an alloy</WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Right-click an <StationLink name="Alloy Forge" /> with a metal or wood to set the base.
        </li>
        <li>Add up to four different crystals the same way.</li>
        <li>
          Right-click the forge with a Lava Bucket to forge. The bucket is emptied and every ingredient is used up to
          make one alloy.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        A mix someone has already found always gives the same alloy, in any order. A new mix can fail, and then it gives
        Unusable Scrap, for everyone, from then on. Scrap can go to the{" "}
        <Link href="/wiki/recycler" className={link}>
          Recycling Station
        </Link>
        .
      </p>
      <p className={`mt-3 ${body}`}>
        When a new alloy works, it&apos;s saved for the whole server with a made-up name. You have 60 seconds to rename
        it with <code className={code}>/alloy name &lt;Name&gt;</code>. After that, anyone can load it at a Forging
        Station.
      </p>

      <WikiSectionHeading id="stations">Building the stations</WikiSectionHeading>
      <div className="mt-4 grid grid-cols-1 gap-4">
        <CraftingGrid recipe={weaponStationRecipe} />
        <CraftingGrid recipe={ingredientConverterRecipe} />
        <CraftingGrid recipe={alloyForgeRecipe} />
      </div>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={advancedCraftingCommands.commands} showAliases={false} />

      <SeeAlso hrefs={["/wiki/gem-infusion", "/wiki/recycler", "/wiki/materials", "/wiki/stations"]} />
    </WikiPage>
  );
}
