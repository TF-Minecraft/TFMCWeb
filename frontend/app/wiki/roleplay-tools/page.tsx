import {
  Callout,
  CommandTable,
  DataTable,
  SeeAlso,
  StationLink,
  WikiItemLink,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import { roleplayToolsCommands } from "../data/roleplay-tools";
import { stationRecipe } from "../data/station-recipes";

const code = "text-[var(--tfmc-accent)]";
const body = "text-sm text-[var(--tfmc-mist)]";

const stoneRecipes = [stationRecipe("gen-tool-station-lorestone"), stationRecipe("gen-tool-station-namestone")];
const blindfoldRecipe = stationRecipe("gen-tool-station-blindfold");

export default function RoleplayToolsPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Roleplay Tools"
      intro="Small tools for setting a scene: sit down, lie down or crawl, pose armor stands, put on a mask or a blindfold, hang pictures, edit books, and give your items their own names and lore. Every player can use them."
    >
      <WikiSectionHeading id="sitting">Sitting</WikiSectionHeading>
      <p className={body}>
        Right-click a stair, slab, carpet or snow layer with an empty hand, from up to 3 blocks away, to sit on it. You
        sit where you clicked, and on stairs you face the way the stair faces. Only the bottom half of stairs and slabs
        works. You can also type <code className={code}>/sit</code> to sit where you stand. Several players can share a
        block, but you cannot sit on other players.
      </p>
      <p className={`mt-3 ${body}`}>
        Sneak to stand up. Taking damage does not unseat you, but breaking the block under you does. If you keep sitting
        down by accident while building, <code className={code}>/sit toggle</code> turns click-to-sit off;{" "}
        <code className={code}>/sit</code> still works.
      </p>

      <WikiSectionHeading id="poses">Lying down, poses and crawling</WikiSectionHeading>
      <p className={body}>
        <code className={code}>/lay</code>, <code className={code}>/layback</code>,{" "}
        <code className={code}>/bellyflop</code> and <code className={code}>/spin</code> put you in a pose, and{" "}
        <code className={code}>/crawl</code> drops you to a crawl. Sneak to get back up. While posed you cannot use
        blocks, items or other players, so save poses for a quiet moment. Lying down counts towards skipping the night
        when someone else is in a bed.
      </p>

      <WikiSectionHeading id="armor-statues">Posing armor stands</WikiSectionHeading>
      <p className={body}>
        <code className={code}>/tfmc statues</code> gives you the Armor Statues book, free and as often as you need it.
        Open the book and click an option to change the nearest armor stand within 3 blocks. Use Check Target first: it
        makes the stand that will be edited glow for a few seconds.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Category" }, { header: "What you can change" }]}
        rows={[
          ["Settings", "Arms, base plate, size, visibility, gravity and visual fire"],
          ["Poses", "Ready-made poses such as Salute, Facepalm and Stargazing, a random pose, or each limb by hand"],
          ["Position", "Rotation, small moves, aligning the stand to a block, and scale from 0.25 to 3 times"],
          ["Tools", "Mirror and flip, copy and paste a pose, swap equipment slots, and undo or redo"],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        Locking a stand stops accidental edits and equipment clicks, but it does not protect the stand from other
        players.
      </p>

      <WikiSectionHeading id="masks">Masks and banner patterns</WikiSectionHeading>
      <p className={body}>
        <code className={code}>/tfmc masks</code> gives you a random mask. Most masks hide who you are while you wear
        them on your head: in-character chat shows you as <strong>Masked</strong>, and nobody can read your character
        card by sneak-right-clicking you or with <code className={code}>/rpcharacter profile</code>. The{" "}
        <code className={code}>/players</code> list is out of character, so it still shows your sheet.{" "}
        <code className={code}>/tfmc patterns</code> gives you all ten banner patterns for the loom: Flower, Guster,
        Field Masoned, Skull, Thing, Globe, Snout, Flow, Creeper and Bordure Indented. You can use each command once
        every 10 seconds.
      </p>
      <p className={`mt-3 ${body}`}>
        A <WikiItemLink name="Blindfold" />, made at the <StationLink name="Tool Station" /> from 2 Leather, blinds
        whoever wears it on their head until they take it off.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CraftingGrid recipe={blindfoldRecipe} />
      </div>

      <WikiSectionHeading id="images">Pictures</WikiSectionHeading>
      <p className={body}>
        <code className={code}>/image create &lt;url&gt; [scale]</code> turns a picture from the internet into map art.
        Run it, then click the block where the picture should go. The scale is a percentage of the picture&apos;s size.
        To remove a picture, run <code className={code}>/image delete</code> and click it. Anyone can delete any
        picture.
      </p>

      <WikiSectionHeading id="books">Books and anvils</WikiSectionHeading>
      <p className={body}>
        Hold a written book you signed and run <code className={code}>/book</code> to make it editable again. Run it
        while holding a book and quill to sign it. <code className={code}>/book title &lt;title&gt;</code> and{" "}
        <code className={code}>/book author &lt;name&gt;</code> change the title and author of a signed book you wrote.{" "}
        <code className={code}>/anvil</code> opens an anvil wherever you are.
      </p>

      <WikiSectionHeading id="lorestones">
        <WikiItemLink name="Lorestone">Lorestones</WikiItemLink> and{" "}
        <WikiItemLink name="Namestone">namestones</WikiItemLink>
      </WikiSectionHeading>
      <p className={body}>
        Craft them at the <StationLink name="Tool Station" />. Pick the stone up on your cursor and click it onto a
        single, unstacked item in your inventory, then type your text in chat within 60 seconds, or type{" "}
        <code className={code}>cancel</code>. A <WikiItemLink name="Lorestone" /> adds a line of lore, and a{" "}
        <WikiItemLink name="Namestone" /> renames the item. The stone is used up when it works. If you cancel, run out
        of time or something goes wrong, you get it back.
      </p>
      <Callout variant="warning" className="mt-4">
        Typing <code className={code}>clear</code> into a lorestone removes every lore line on the item, including the
        lines that describe its stats and what it does. They do not come back.
      </Callout>
      <p className={`mt-3 ${body}`}>
        A line can be up to 100 characters, colour codes included, and an item can have up to 10 lore lines, counting
        the ones it already has. Use <code className={code}>&amp;</code> colour codes or{" "}
        <code className={code}>&amp;#RRGGBB</code> hex colours. If you type a name without colour codes, the namestone
        offers a palette you can click, or you can type a colour name or a hex value.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {stoneRecipes.map((recipe) => (
          <CraftingGrid key={recipe.key} recipe={recipe} />
        ))}
      </div>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={roleplayToolsCommands.commands} />

      <SeeAlso hrefs={["/wiki/characters", "/wiki/furniture"]} />
    </WikiPage>
  );
}
