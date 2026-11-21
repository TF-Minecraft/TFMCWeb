import Link from "next/link";
import { Callout, DataTable, SeeAlso, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import { archaeologyRecipes } from "../data/archaeology";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function ArchaeologyPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
      title="Archaeology"
      width="lg"
      intro="Find a ruin nobody has claimed, set up a camp beside it, dig by listening for sound cues, then clean and register what you find so you can display it."
    >
      <WikiSectionHeading id="equipment">What you need</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        You need to be{" "}
        <Link href="/wiki/characters" className={link}>
          playing a character
        </Link>{" "}
        for every step. The ruins you confirm, your camp and your role at a dig belong to that character.
      </p>
      <p className={`mt-3 ${body}`}>
        Craft the <WikiItemLink name="Archeology Table" /> at a crafting table from 8 Oak Planks around 1 Bone.
        Right-click it to open the Archeology Station menu. Everything else is made there: the Field Compass, Soil
        Probe, Camp Kit, <WikiItemLink name="Field Pencil" />, Brush, the digging tools (Knife, Spoon, Hand Pick,
        Trowel, Breaker Pick and Spoil Shovel) and the Archeology Cabinet. A Brush from a crafting table works too.
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
      <p className={`mt-4 ${body}`}>
        Hold the Field Compass in either hand. When you face roughly towards a ruin nobody has claimed, it beeps and
        draws an arc of sparkles on the ground ahead of you. It only hears ruins in front of you, so turn until the
        beeps are fastest and walk that way.
      </p>
      <p className={`mt-3 ${body}`}>
        The closer you get, the faster and higher the beeps and the more arcs you see. When you are close and facing the
        ruin, chat says &quot;Archaeological signal detected.&quot; and tells you to prospect, which is the next step. A
        full ring around your feet means you are standing inside the ruin&apos;s area.
      </p>
      <p className={`mt-3 ${body}`}>
        A ruin is claimed once it has a camp. The Field Compass then ignores it, whoever planted the camp.
      </p>

      <WikiSectionHeading id="prospect">2. Confirm the ruin</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Hold the Soil Probe in your main hand and right-click soft ground inside the ruin&apos;s area, where the full
        ring shows. Soft ground is anything you would dig with a shovel, such as dirt, grass, sand, gravel, clay or mud.
        On stone you get &quot;That is not soil.&quot;
      </p>
      <p className={`mt-3 ${body}`}>
        Each sample takes 2 seconds and wears the probe. Moving away cancels it with &quot;Sampling interrupted.&quot;
      </p>
      <p className={`mt-3 ${body}`}>
        You need 4 samples, each at least 3 blocks from your others. Chat counts them from 1/4 to 4/4 and ends with
        &quot;Archaeological site confirmed. A camp can be established.&quot; From your second sample on, a grey line
        hints at how rich the site is.
      </p>
      <p className={`mt-3 ${body}`}>
        &quot;No archaeological traces here.&quot; means that sample was outside the ruin&apos;s area. Samples never
        point you anywhere, so use the Field Compass for direction.
      </p>
      <p className={`mt-3 ${body}`}>
        Confirming does not claim the ruin. Another character can confirm the same one, and the first camp wins.
      </p>

      <WikiSectionHeading id="camp">3. Plant the camp</WikiSectionHeading>
      <ol className={`mt-4 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Hold the Camp Kit near a ruin you have confirmed. You see a light-blue glass outline around the ruin&apos;s
          area and a full-size preview of the camp where you look. Only you see them.
        </li>
        <li>
          Aim at the ground right next to the ruin. The camp has to share a side with the ruin&apos;s area. It
          can&apos;t go diagonally from it, on the ruin itself or on ground already in use.
        </li>
        <li>Turn to rotate the camp. It faces the way you face.</li>
        <li>
          Watch the bar at the top of your screen. When the spot works it turns green and says &quot;Right-click to
          establish.&quot; When it doesn&apos;t, it turns red and gives the reason, and the parts of the camp that
          can&apos;t go there show as red glass.
        </li>
        <li>Right-click to plant the camp. The Camp Kit is used up and you become the camp&apos;s director.</li>
      </ol>
      <p className={`mt-3 ${body}`}>
        While the camp stands, nobody can break its tents, fences, campfire or name sign. The ruin&apos;s area is now
        the dig, and ordinary shovels and pickaxes can&apos;t break blocks in it. You get &quot;Use an excavation
        tool.&quot;
      </p>
      <p className={`mt-3 ${body}`}>
        A character can direct 1 camp at a time. If you get &quot;You already direct an excavation...&quot;,{" "}
        <a href="#finish" className={link}>
          close your camp
        </a>{" "}
        before planting another.
      </p>
      <p className={`mt-3 ${body}`}>Right-click any part of the camp to open the camp board. Anyone can read it.</p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Section", nowrap: true }, { header: "What it shows" }]}
        rows={[
          ["Site", "The camp's name, director, status, progress and layers"],
          ["Finds", "The site's finds. Click one to read its page"],
          ["Staff", "Who works at the camp"],
          ["Dossier", "Field notes and the site's approximate interest: low, medium, high or exceptional"],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        <strong>Show limits</strong> draws the edges of the dig as glowing lines through the ground for a moment. Only
        you see them.
      </p>
      <p className={`mt-3 ${body}`}>
        Only the director and the workers they add can work on the dig. Everyone else gets &quot;You are not authorised
        to work on this excavation.&quot; A camp holds up to 18 people including the director. Each worker has one of 2
        roles:
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <strong>Archaeologist</strong>: can dig and lift finds.
        </li>
        <li>
          <strong>Excavator</strong>: can dig, but can&apos;t lift finds.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>The director runs the camp from the same board:</p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <strong>Add worker</strong> adds a character to the camp. Type their name in chat.
        </li>
        <li>
          You can change a worker&apos;s role, and <strong>Remove from the excavation</strong> takes them off the camp.
        </li>
        <li>
          <strong>Rename</strong> gives the camp a name of 1 to 40 characters, and the sign updates.
        </li>
        <li>
          <strong>Primary color</strong> and <strong>Secondary color</strong> change the wool colours of the tents.
        </li>
        <li>
          <strong>Move camp</strong> lets you move the camp.
        </li>
        <li>
          <strong>Close excavation</strong> closes it. See{" "}
          <a href="#finish" className={link}>
            Close the camp
          </a>
          .
        </li>
      </ul>

      <WikiSectionHeading id="dig">4. Dig by ear</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        The dig goes from the surface down through up to 4 layers: Overburden, Upper occupation, Lower occupation and
        Deep sealed fill. Not every ruin has the deepest one. A find is a shape buried in the dirt and made of several
        parts, not one block.
      </p>
      <p className={`mt-3 ${body}`}>
        Hold left-click on a block in the dig with a digging tool or an empty hand. The block doesn&apos;t crack like
        ordinary mining. Listen for the cue instead. Each time blocks are removed counts as 1 cut.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Cue" }, { header: "What it means" }]}
        rows={[
          ["1 to 3 quiet chimes, each with a small pale-blue puff", "Keep holding"],
          ["A louder, higher chime with gold sparkles", "Let go now. The cut happens"],
          ["You let go too soon", "Nothing is removed and no cut is used. Hold again to start over"],
          ["You hold too long", "The cut happens anyway and removes more. A heavy smash means several blocks went"],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        Each camp has a limited number of cuts per Minecraft day. When they run out you get &quot;The excavation work
        day is over.&quot; They refill when a new Minecraft day starts. Planting the camp, brushing, cleaning, drawing
        and classifying use no cuts.
      </p>
      <p className={`mt-3 ${body}`}>The tool decides how much 1 cut removes. Tools wear with each block.</p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Tool", nowrap: true }, { header: "What a cut removes" }, { header: "Faster on" }]}
        rows={[
          ["Knife", "A narrow column straight down", "None"],
          ["Spoon", "A narrow column straight down", "Soil, sand and gravel"],
          ["Hand Pick", "A wider patch around the block", "Stone"],
          ["Trowel", "A wider patch around the block", "Soil, sand and gravel"],
          ["Breaker Pick", "The most, scattered nearby", "Stone"],
          ["Spoil Shovel", "The most, scattered nearby", "Soil, sand and gravel"],
          ["Empty hand", "1 block", "None"],
        ]}
      />
      <p className={`mt-4 ${body}`}>
        The display above your hotbar shows the layer you are in (I to IV) and the cuts left today. Aim at an uncovered
        find and it adds the find&apos;s condition. Aim into your hole and it shows which find material touches it, or
        &quot;clear&quot;.
      </p>
      <p className={`mt-3 ${body}`}>
        No sound warns you before you hit a find. Slow down when you see either of these:
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          After a cut that hits nothing, chat lists the parts of finds touching that spot by material, for example
          &quot;Traces of Bone: 2&quot;.
        </li>
        <li>Each part of a find gives off orange sparks once one of its sides is uncovered.</li>
      </ul>
      <Callout variant="warning" title="A buried find can be destroyed" className="mt-4">
        Cutting into a find makes a shattering sound and you get &quot;Buried archaeological remains were
        destroyed.&quot; The find loses condition for each part you hit, and a find with no parts left is lost. Ordinary
        mining in a ruin can wreck finds too, even before any camp exists.
      </Callout>

      <WikiSectionHeading id="brush">5. Brush the find out</WikiSectionHeading>
      <ol className={`mt-4 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Clear the dirt until every part of the find has an open side. If you brush before that, you get &quot;The
          shape is not fully free.&quot;
        </li>
        <li>
          Hold right-click with a Brush on a sparkling part. Each part takes 2 seconds and shows a &quot;Brushing&quot;
          bar. Looking away pauses it and looking back continues.
        </li>
        <li>
          Move on to the next part. You don&apos;t need all of them. After a few clean parts the find comes free and
          drops as an item, and chat names it with its condition.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>Only the director and Archaeologists can brush. Mining a find never drops it.</p>
      <p className={`mt-3 ${body}`}>
        A find&apos;s condition is Intact, Sound, Worn, Fragmentary or Crumbling. Its starting condition was set in the
        ground. Careful digging keeps it but can&apos;t improve it.
      </p>

      <WikiSectionHeading id="register">6. Clean, draw and register</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Place an Archeology Cabinet anywhere. Anyone holding the find can clean, draw and register it.
      </p>
      <p className={`mt-3 ${body}`}>
        <strong>Clean.</strong> Right-click the cabinet with the find in your main hand. With anything else you get
        &quot;Bring an artifact.&quot; The cleaning screen shows dirty panes. Each pane names its stain and says which
        tool to wipe it with. The 3 tools are in the screen, so you need none of your own. Pick a tool and click every
        pane that asks for it. The wrong tool only plays a low note.
      </p>
      <p className={`mt-3 ${body}`}>
        <strong>Draw.</strong> Put ordinary Paper on the <WikiItemLink name="Field Pencil" /> in your inventory, or hold
        the paper and right-click with the pencil in your other hand. You get a Field sketch. A pencil lasts 64
        sketches. While you hold the Field sketch you stand still and your keys draw:
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Key", nowrap: true }, { header: "What it does" }]}
        rows={[
          ["Movement keys", "Move the pen"],
          ["Sneak", "Paint"],
          ["Right-click", "Erase"],
          ["Jump", "Open the ink colours"],
          ["Switch to another item", "Save the sketch"],
          [
            "Left-click",
            <>
              Sign the sketch. Type <code className={code}>sign</code> in chat to confirm or{" "}
              <code className={code}>cancel</code> to go back
            </>,
          ],
        ]}
      />
      <p className={`mt-4 ${body}`}>A signed sketch can&apos;t be edited, and a blank one can&apos;t be signed.</p>
      <p className={`mt-3 ${body}`}>
        <strong>Register.</strong>
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Right-click the cabinet again with the cleaned find in your main hand. The &quot;Register&quot; window opens.
        </li>
        <li>Put the signed sketch in the top slot.</li>
        <li>
          Click <strong>Register</strong>. Keep the find in your hand the whole time.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>Registering adds the find&apos;s rarity label to its description.</p>

      <WikiSectionHeading id="classify">7. Classify the find</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Right-click the cabinet once more with the registered find in your main hand. Only the camp&apos;s director or
        an Archaeologist can classify, and they still can after the camp is closed.
      </p>
      <p className={`mt-3 ${body}`}>
        Each find has 3 questions with 3 readings each. Click a reading to sign it. A signed reading can&apos;t be
        changed (&quot;Once signed, it cannot be unpicked.&quot;). You can stop at any time and your signed answers
        stay. The find is done when chat says &quot;The record on this piece is complete.&quot;
      </p>

      <WikiSectionHeading id="museum">8. Display your finds</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        Put a find on an item frame, glow item frame, armour stand, lectern or shelf the ordinary way. Sneak and
        right-click the displayed find to read its plaque, which is its page from the camp&apos;s Finds list. A click
        without sneaking does what it always does in Minecraft.
      </p>
      <p className={`mt-3 ${body}`}>
        Finds can&apos;t be placed as blocks. If you rename a find at an anvil, the record keeps the new name.
      </p>

      <WikiSectionHeading id="finish">9. Close the camp</WikiSectionHeading>
      <p className={`mt-4 ${body}`}>
        A site is finished when every find has been recovered or destroyed. The director can then use{" "}
        <strong>Issue report</strong> in the Finds list to get a written book of the dig.
      </p>
      <p className={`mt-3 ${body}`}>
        The director can close the camp at any time, finished or not. Choose <strong>Close excavation</strong> on the
        camp board and type <code className={code}>confirm</code> in chat. You are warned if finds remain. The
        camp&apos;s blocks become ordinary blocks and you get a Field book. Right-click it any time to open the site
        record. Closing also frees you to plant another camp.
      </p>

      <SeeAlso hrefs={["/wiki/materials"]} />
    </WikiPage>
  );
}
