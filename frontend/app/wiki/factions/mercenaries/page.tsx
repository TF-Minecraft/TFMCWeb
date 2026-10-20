import { CommandTable, DataTable, WikiSectionHeading } from "@/app/components/wiki";
import { factionMercenaryCommands } from "@/app/wiki/data";

import { Bullets, Cmd, FactionsGuidePage, Steps } from "../FactionsGuide";

export default function FactionsMercenariesPage() {
  return (
    <FactionsGuidePage
      href="/wiki/factions/mercenaries"
      intro="A guild can run a mercenary company and hire out its fighters to other factions' wars."
    >
      <WikiSectionHeading id="company" intro="Mercenaries need the mercenary character trait.">
        Running a company
      </WikiSectionHeading>
      <Bullets>
        <li>
          A guild leader with the mercenary trait runs <Cmd>/company found &lt;name&gt;</Cmd>. It costs 100 denars from
          the guild bank and is ready after 24 hours, with 1 slot.
        </li>
        <li>
          <Cmd>/company invite &lt;player&gt;</Cmd> fills a slot. Recruits do not need to be in your guild.
        </li>
        <li>
          <Cmd>/company expand</Cmd> adds a slot after 24 hours, once every slot is filled.
        </li>
        <li>Every slot costs the guild 8 denars a day, filled or not.</li>
        <li>
          Company upgrades in the guild menu give mercenaries more health and mana while they fight under contract.
        </li>
      </Bullets>

      <WikiSectionHeading id="contracts" intro="Contracts are signed books.">
        Contracts
      </WikiSectionHeading>
      <Steps>
        <li>
          <Cmd>/company draft</Cmd> gives a contract book. Fill in slots, price per battle (50 or more per slot), price
          per day (10 or more per slot), length (up to 14 days), and refunds.
        </li>
        <li>Sign it to get a review copy, then sign that.</li>
        <li>
          Hold it and run <Cmd>/company offer &lt;faction&gt;</Cmd>. The offer lasts 1 day, and the contract clock
          starts now.
        </li>
        <li>A council member of the hiring faction signs it while standing in the company&apos;s home province.</li>
      </Steps>
      <Bullets>
        <li>The hirer pays the daily price every day, and the battle price on battle days.</li>
        <li>For every slot missing at a battle, the hirer gets the absence refund back.</li>
        <li>
          Buyers browse with <Cmd>/mercenaries</Cmd> or <Cmd>/mercenaries list</Cmd>.
        </li>
      </Bullets>

      <WikiSectionHeading id="reputation" intro="Companies have a reputation from 0 to 100, starting at 50.">
        Reputation
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Reputation" }, { header: "Standing" }]}
        rows={[
          ["80 and up", "Trusted"],
          ["60 to 79", "Reliable"],
          ["35 to 59", "Unproven"],
          ["Below 35", "Notorious"],
        ]}
      />
      <Bullets>
        <li>Finishing a contract with perfect attendance raises it.</li>
        <li>Missing battles, breaking a contract or the guild going broke lowers it.</li>
      </Bullets>

      <WikiSectionHeading id="loyalty" intro="Mercenaries fight for their contract, within limits.">
        Who mercenaries can fight
      </WikiSectionHeading>
      <Bullets>
        <li>They fight on the hirer&apos;s side in any of its wars.</li>
        <li>
          They cannot serve a faction at war with their own faction, or with its allies, overlord or vassals. A
          conflicting contract ends with no refund.
        </li>
        <li>A company cannot fight for both sides of one war.</li>
        <li>Mercenaries count in live battles but not when a battle is decided automatically.</li>
      </Bullets>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={factionMercenaryCommands} />
    </FactionsGuidePage>
  );
}
