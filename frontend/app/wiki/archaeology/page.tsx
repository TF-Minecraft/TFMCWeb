import { Callout, DataTable, SeeAlso, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import { archaeologyRecipes } from "../data/archaeology";

export default function ArchaeologyPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Archaeology"
      width="lg"
      intro="Find an unclaimed ruin, confirm it from soil samples, establish a field camp, excavate by sound, and preserve each find for study or display."
    >
      <WikiSectionHeading id="equipment">Prepare the equipment</WikiSectionHeading>
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        Make the <WikiItemLink name="Archeology Table" /> at a Crafting Table. This workshop is where you make all
        archaeology tools, including the tracker, prospecting kit, establishment kit, excavation tools, brush,{" "}
        <WikiItemLink name="Field Pencil">field pencil</WikiItemLink>, and cabinet.
      </p>
      <div className="mt-4">
        <CraftingGrid recipe={archaeologyRecipes[0]} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {archaeologyRecipes.slice(1).map((recipe) => (
          <CraftingGrid key={recipe.key} recipe={recipe} />
        ))}
      </div>

      <WikiSectionHeading id="find-a-ruin">1. Find a ruin</WikiSectionHeading>
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        Hold the tracker and follow its pulses. They get faster as you approach a ruin that nobody has claimed. If the
        beeps fade, turn back and try another direction. The tracker stays quiet for a ruin where you already planted a
        camp. When you are close enough, chat tells you to prospect the ground.
      </p>

      <WikiSectionHeading id="prospect">2. Confirm it</WikiSectionHeading>
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        Use the prospecting kit on shovel-dug earth: dirt, grass, sand, gravel, clay, or mud. Stone and furniture do not
        count. Hold still while taking each sample; walking away cancels it. Spread samples out and follow the traces
        until chat confirms the site. Confirmation alone does not claim the ruin.
      </p>

      <WikiSectionHeading id="camp">3. Plant the camp</WikiSectionHeading>
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        After confirmation, hold the establishment kit and aim at a neighboring chunk rather than the ruin itself. Turn
        until the camp ghost sits cleanly, then confirm. You become the director, and the tracker will no longer pulse
        for this ruin. The tents sit beside the dig; the prism marks the ruin ground and the layers below it.
        Establishing camp does not spend the work day.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Use the camp board to read the dossier, manage who may work, review the finds list, and choose{" "}
        <strong>Show limits</strong>. The glowing cut boundary appears only to you and only briefly. If you have reached
        your camp limit, close an old camp before claiming another.
      </p>

      <WikiSectionHeading id="dig">4. Dig: hear, then release</WikiSectionHeading>
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        Inside the dig site, hold left-click with an excavation tool. The block does not crack like ordinary mining.
        Listen to the cue, then release the button.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Cue" }, { header: "Meaning" }]}
        rows={[
          ["Soft clings, then a louder ready chime", "Empty fill. Release on the ready chime to lift cubes."],
          ["Release too soon", "Nothing leaves. The next hold starts clean."],
          ["Release too late", "More cubes leave, giving you less control."],
        ]}
      />
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        The HUD names the stratum and may show how many cuts remain today. Light tools make narrow shafts; heavier tools
        take wider bites, and a late release always removes more than a timely one. Empty fill can reveal traces of
        material still touching the hole, which tells you when to slow down.
      </p>
      <Callout variant="warning" title="A buried find can be destroyed">
        A find cling means you are cutting into a piece. Punching through it damages the find, and a destroyed cell is
        gone for good. An ordinary pick can wreck a buried find too, even before anyone establishes a camp.
      </Callout>

      <WikiSectionHeading id="brush">5. Brush the find out</WikiSectionHeading>
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        A find is a shape inside the dirt, not a loot block. Expose the shape carefully. When every remaining cube has
        air on at least one face, those cubes begin dripping. Hold right-click with the brush while aiming at a dripping
        cube. Looking away pauses that cube; looking back continues it. Keep brushing until one recovered item comes
        free. A pick never drops the item, and a completely destroyed find drops nothing.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        The item label tells you whether it is intact, worn, crumbling, or somewhere between. Its starting condition was
        decided in the ground; careful excavation can preserve it, but cannot turn a naturally damaged piece into a
        pristine one.
      </p>

      <WikiSectionHeading id="register">6. Clean, sketch, register</WikiSectionHeading>
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        Take the recovered piece to the cabinet and right-click while holding it in your main hand. Sneak if you only
        want the block&apos;s ordinary Minecraft use. A dirty piece opens the lab, where each stain names the tool that
        removes it.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        To make the drawing, you need ordinary Paper as your field sheet and a{" "}
        <WikiItemLink name="Field Pencil">field pencil</WikiItemLink>. Click the paper onto the pencil in your
        inventory, or hold the paper and right-click with the pencil in your other hand. Draw the find, then sign the
        sketch.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Go back to the cabinet with the cleaned find in your main hand. Put the signed drawing in the top slot and click{" "}
        <strong>Register</strong>. Keep the find in your hand the whole time, or the cabinet refuses.
      </p>

      <WikiSectionHeading id="classify">7. Classify the find</WikiSectionHeading>
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        After registering, use the cabinet again with the find in your main hand. It asks one question about the piece
        at a time and offers three readings. Click one to sign it. A signed reading can&apos;t be changed. Keep
        answering until chat says the record is complete. You can stop at any point. The answers you signed stay on
        file, and the next visit picks up at the next question.
      </p>

      <WikiSectionHeading id="museum">8. Museum</WikiSectionHeading>
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        Build any room you like. Put a find on an item frame, glow item frame, armor stand, lectern or shelf the
        ordinary way. Then sneak and right-click the displayed find to read its plaque, the same reading you get from
        the camp board. Clicking without sneaking keeps the ordinary Minecraft action, such as hanging, rotating, or
        taking an item.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        You can rename a recovered find at an anvil, and the new name is kept on its record. Finds shaped like blocks
        can&apos;t be placed as blocks, so show them on a display instead.
      </p>

      <WikiSectionHeading id="finish">9. When the site is finished</WikiSectionHeading>
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        Once every find has been recovered or destroyed, the excavation is exhausted. Close the camp from the board to
        leave the site and free room for another ruin. You receive a field book; right-click it later to reopen the
        excavation dossier and finds record even after the tents are gone.
      </p>

      <SeeAlso hrefs={["/wiki/materials"]} />
    </WikiPage>
  );
}
