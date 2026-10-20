import { Callout, CommandTable, DataTable, WikiSectionHeading } from "@/app/components/wiki";
import { factionMoneyCommands } from "@/app/wiki/data";

import { Bullets, Cmd, FactionsGuidePage, P, Steps } from "../FactionsGuide";

export default function FactionsMoneyPage() {
  return (
    <FactionsGuidePage
      href="/wiki/factions/money"
      intro="Your faction earns and spends once a day, through its bank. Keep the bank above zero and everything keeps running."
    >
      <WikiSectionHeading id="bank" intro="The bank is a chunk, not a block.">
        The faction bank
      </WikiSectionHeading>
      <Bullets>
        <li>
          The leader stands in a chunk in the capital province and runs <Cmd>/faction setbank</Cmd>. Running it again
          moves the bank. The money stays.
        </li>
        <li>
          Any member standing in the bank chunk can <Cmd>/faction deposit &lt;amount&gt;</Cmd>. Only the leader can{" "}
          <Cmd>/faction withdraw &lt;amount&gt;</Cmd>.
        </li>
        <li>Your personal bank also only works while you stand in your faction or guild bank chunk.</li>
      </Bullets>
      <Callout variant="warning" title="No bank, no faction">
        Without a faction bank, your members pay no tax, your army shrinks to its free regiments, and your installations
        lose a level every day.
      </Callout>

      <WikiSectionHeading id="day" intro="The faction day is 24 hours of server time, not midnight to midnight.">
        The daily payout
      </WikiSectionHeading>
      <P>
        The guild ledger and <Cmd>/ledger</Cmd> show how long until the next day. When it ticks over, this happens in
        order:
      </P>
      <Steps>
        <li>
          <strong>Income comes in:</strong> trade, taxes from members and guilds, vassal tax, tributes, tariffs and
          reparations.
        </li>
        <li>
          <strong>The army and installations are paid</strong>, army first, then installations from the cheapest up.
        </li>
        <li>
          <strong>Loan payments</strong> come out of what is left.
        </li>
        <li>
          <strong>Dividends and wages</strong> are paid.
        </li>
        <li>
          <strong>Vehicle upkeep</strong> is paid last.
        </li>
      </Steps>
      <Bullets>
        <li>If the bank cannot cover the army, paid regiments are cut until it can. Free regiments cost nothing.</li>
        <li>An installation the bank cannot pay for loses a level. A level 1 installation is destroyed.</li>
        <li>
          Resource nodes cost their guild 4 denars per level each day, plus the upkeep of their production method.
        </li>
      </Bullets>

      <WikiSectionHeading id="taxes" intro="Your tax laws set the allowed range. You pick the rate inside it.">
        Taxes and tariffs
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Tax" }, { header: "Who pays" }, { header: "Highest possible", align: "right" }]}
        rows={[
          ["Citizen tax", "Taken from members' earnings as they earn.", "60%"],
          ["Guild tax", "Each guild, on its income.", "60%"],
          ["Dividend tax", "Taken from guild dividends before they are shared out.", "80%"],
          ["Vassal tax", "Your vassals.", "35%"],
          ["Tariffs", "Foreign guilds, on the trade they make in your land.", "75%"],
        ]}
      />
      <Bullets>
        <li>
          Without a council, the leader changes rates directly. With a council, a rate change is a proposal (see
          Government and stability).
        </li>
        <li>Rates can be set per guild, per vassal, or per foreign faction for tariffs.</li>
        <li>Tariffs need an Economy law that allows them: Mercantilism, Protectionism or Isolationism.</li>
        <li>Low stability means you collect less: 75% when Struggling, 50% below that.</li>
      </Bullets>

      <WikiSectionHeading id="ledgers">Ledgers</WikiSectionHeading>
      <Bullets>
        <li>
          <Cmd>/ledger</Cmd> shows your own money for today: earnings, dividends, wages, tax and vehicle upkeep.
        </li>
        <li>
          The faction&apos;s ledger (Faction menu, then Ledger) shows every line of income and cost, with breakdowns per
          citizen, guild and vassal.
        </li>
      </Bullets>

      <WikiSectionHeading id="loans" intro="Guilds lend to each other with written contracts.">
        Loans
      </WikiSectionHeading>
      <Steps>
        <li>
          The lender&apos;s guild leader opens the guild menu, then Loans, then Issue New Loan, while holding a book and
          quill.
        </li>
        <li>Fill in the amount, days (1 to 365), weekly interest and late fee, then sign it.</li>
        <li>
          The borrowing guild&apos;s leader signs the agreement. Both guilds need a bank. Books expire after 24 hours.
        </li>
      </Steps>
      <Bullets>
        <li>Each day, a share of the loan is paid automatically from what is left after other costs.</li>
        <li>The borrower can pay more at any time from the loan&apos;s menu.</li>
        <li>
          Every guild has a <strong>credit score</strong> from 0 to 100 that lenders can see. Paying on time raises it.
          Late days and defaulting lower it.
        </li>
        <li>The lender can pause interest or forgive the loan.</li>
      </Bullets>

      <WikiSectionHeading id="bankrupt" intro="A bank below zero is bankrupt.">
        Going broke
      </WikiSectionHeading>
      <Bullets>
        <li>A bankrupt guild or faction gets no income and pays nothing until it is back above zero.</li>
        <li>
          At the end of a day in debt, its branches are sold off one level at a time (80% back) until it is out of debt.
        </li>
        <li>
          A bankrupt faction drops to <strong>0 stability</strong>: half tax, no wars, no new titles. Its army and
          installations shrink every day.
        </li>
        <li>Members can deposit to get it out of debt.</li>
      </Bullets>

      <WikiSectionHeading id="vehicles" intro="Every vehicle costs upkeep every day.">
        Vehicle upkeep
      </WikiSectionHeading>
      <Bullets>
        <li>
          Your own vehicles are paid from your <strong>personal bank</strong>, not your pouch. Faction vehicles are paid
          from the faction bank.
        </li>
        <li>You get a warning in chat if your bank will not cover the next day.</li>
        <li>Unpaid vehicles lose health every hour and cannot be repaired. See Installations and vehicles.</li>
      </Bullets>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={factionMoneyCommands} />
    </FactionsGuidePage>
  );
}
