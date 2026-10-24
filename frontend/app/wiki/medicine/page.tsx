import Link from "next/link";
import {
  Callout,
  CommandTable,
  DataTable,
  SeeAlso,
  StationLink,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import { medicineCommands, medicineSection } from "../data/medicine";

const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

export default function MedicinePage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title={medicineSection.nav.label}
      intro="A physician can operate on another character's healing injury to cure it, and makes the prosthetic limbs that replace a lost arm or leg."
    >
      <WikiSectionHeading id="physician">Becoming a physician</WikiSectionHeading>
      <p className={body}>
        Buy the Herborist perk <strong>Physician</strong> for 2 points in <code className={code}>/profession</code> (see{" "}
        <Link href="/wiki/classes#professions" className={link}>
          Professions
        </Link>
        ). It lets your character operate, and it unlocks the recipes at the <StationLink name="Medicine Station" />:
        the surgical instruments, the prosthetic limbs and the doctor&apos;s outfit.
      </p>

      <WikiSectionHeading id="operating">Starting an operation</WikiSectionHeading>
      <ol className={`list-decimal space-y-1 pl-5 ${body}`}>
        <li>
          Stand within 5 blocks of your patient and run <code className={code}>/surgery &lt;player&gt;</code>. You both
          need to be playing a character.
        </li>
        <li>
          Surgery treats the patient&apos;s healing injury with the most healing time left. Permanent injuries cannot be
          operated on (see{" "}
          <Link href="/wiki/characters#injuries" className={link}>
            Injuries
          </Link>
          ).
        </li>
        <li>
          The patient is told which injury it is, how long it still has to heal and what a failure would cost. They have
          60 seconds to click Accept or run <code className={code}>/surgery accept</code>, or turn it down with{" "}
          <code className={code}>/surgery deny</code>.
        </li>
        <li>
          Once they accept, the operating menu opens for you. Each move uses up one instrument from your inventory, so
          bring spares.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        The patient has to stay close. If they move more than 10 blocks away, log out or switch character, the operation
        fails. Closing the menu before you sedate or cut is safe; after that, it counts as abandoning the patient.
      </p>

      <WikiSectionHeading
        id="instruments"
        intro="All of them are crafted at the Medicine Station and need the Physician perk."
      >
        Instruments
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Instrument", nowrap: true }, { header: "What it does" }]}
        rows={[
          ["Stethoscope", "Examines the patient, showing the operation needed and how many incisions reach the injury"],
          ["Clinical Thermometer", "Takes the patient's temperature, so you can then give the tincture"],
          ["Chloroform", "Puts the patient under. It wears off, and too much means the patient will not wake"],
          ["Smelling Salts", "Revives a patient who has collapsed"],
          ["Scalpel", "Makes an incision. Never cut a patient who is awake"],
          ["Splint", "Sets a broken bone"],
          ["Silver Wire", "Binds a shattered bone so it can be splinted"],
          ["Artery Forceps", "Stops the bleeding from an open wound"],
          ["Sea Sponge", "Mops up the blood so you can see, which steadies your next move"],
          ["Carbolic Acid", "Cleans the wound so the fever cannot rise"],
          ["Willow-Bark Tincture", "Brings a fever down"],
          ["Catgut Suture", "Closes an incision"],
          ["Linen Dressing", "Treats the injury once every bone is set"],
          ["Transfusion Syringe", "Strengthens a weak pulse"],
        ]}
      />

      <WikiSectionHeading id="vitals">Keeping the patient alive</WikiSectionHeading>
      <p className={body}>
        The menu shows the patient&apos;s consciousness, pulse, temperature and bleeding, and whether the wound is
        clean. They change with every move. Chloroform wears off, cutting dirties the wound and can weaken the pulse,
        blood loss weakens it further, and a fever keeps climbing. Some injuries bring complications, such as a wound
        that keeps bleeding, a patient who goes into shock, or an infection. Any move can slip, and working in blood
        makes it more likely.
      </p>
      <p className={`mt-3 ${body}`}>
        Examine the patient first, and sedate them before you cut. Cutting dirties the wound, so clean it again before
        you finish. Chat messages tell you when a bone turns up, when bleeding starts and when the patient is waking.
      </p>

      <WikiSectionHeading id="outcome">Success and failure</WikiSectionHeading>
      <p className={body}>
        The operation succeeds when the injury is dressed, every bone is set, every incision is closed, the bleeding has
        stopped, the wound is clean, the fever is down, the pulse is strong and the patient is still under. The injury
        is then cured at once.
      </p>
      <Callout variant="warning" className="mt-4">
        If the operation fails after you sedated or cut the patient, their injury takes 12 hours longer to heal. Nobody
        dies on the table, and a failed operation only costs healing time.
      </Callout>

      <WikiSectionHeading id="prosthetics">Prosthetic limbs</WikiSectionHeading>
      <p className={body}>
        Physicians also craft wooden, iron and arcane arms and legs at the <StationLink name="Medicine Station" />. How
        a character puts one on, and how arcane limbs are refuelled, is on the{" "}
        <Link href="/wiki/characters#prosthetics" className={link}>
          Characters
        </Link>{" "}
        page.
      </p>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={medicineCommands.commands} />

      <SeeAlso hrefs={["/wiki/characters", "/wiki/classes", "/wiki/stations"]} />
    </WikiPage>
  );
}
