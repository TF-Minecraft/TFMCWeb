import Link from "next/link";
import { CommandTable, DataTable, SeeAlso, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { factionRanks, factionTitles, factionsCommands } from "../data/factions";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function FactionsPage() {
  return (
    <WikiPage
      lastModified="2026-11-23"
      title="Factions"
      intro={
        <>
          A faction is one nation on the map: its members, its guilds, the provinces it claims, its bank and its
          government. The faction leader runs most of it from <code className={code}>/faction menu</code>. Factions can
          rule over other factions, called subjects. A faction together with its subjects, and their subjects, is a
          realm. Everything belongs to your current character.
        </>
      }
    >
      <DataTable
        columns={[{ header: "Term", nowrap: true, width: "10rem" }, { header: "What it means" }]}
        rows={[
          [
            "Realm",
            <>
              A faction with all its subjects. <strong>Realm Size</strong> in the menu counts your subjects&apos;
              provinces too.
            </>,
          ],
          [
            "Subject",
            <>
              A faction under an overlord. It pays the overlord taxes and sends it levies. Menus call subjects{" "}
              <strong>Vassals</strong>.
            </>,
          ],
          [
            "Prestige",
            <>
              Your faction&apos;s standing. It decides your faction&apos;s rank and how many provinces you can hold. It
              is never spent. See{" "}
              <a href="#land" className={link}>
                Land and prestige
              </a>
              .
            </>,
          ],
          [
            "Administrative power",
            <>
              The points your government spends to act, such as changing a law. See{" "}
              <a href="#government" className={link}>
                Government and taxes
              </a>
              .
            </>,
          ],
          [
            "Diplomatic capacity",
            <>
              How many diplomatic ties your faction can keep at once. See{" "}
              <a href="#diplomacy" className={link}>
                Diplomacy
              </a>
              .
            </>,
          ],
          [
            "Stability",
            <>
              How well the state holds together. Government shows it as a status: Stable State, Strained, Struggling,
              Failing, Collapsing or Failed. See{" "}
              <a href="#stability" className={link}>
                Stability and legitimacy
              </a>
              .
            </>,
          ],
          [
            "Legitimacy",
            <>
              How far the faction accepts its ruler. Government shows it as Legitimate, Contested or Illegitimate
              Government. See{" "}
              <a href="#stability" className={link}>
                Stability and legitimacy
              </a>
              .
            </>,
          ],
          [
            "Branch levels",
            <>
              Branches are a guild&apos;s buildings, bought level by level in <code className={code}>/guild menu</code>:
              Guild Halls, Workshops, Storehouses and Counting Houses. The main guild has a Bureaucracy instead of Guild
              Halls. A guild&apos;s branch levels are all of those levels added together. See{" "}
              <Link href="/wiki/guilds#guilds" className={link}>
                Guilds
              </Link>
              .
            </>,
          ],
          [
            "Weak State",
            <>
              A stability penalty when the main guild&apos;s branch levels are too low next to the faction&apos;s
              biggest other guild. See{" "}
              <a href="#stability" className={link}>
                Stability and legitimacy
              </a>
              .
            </>,
          ],
          [
            "Prosperity",
            <>
              The money a province makes each day. Guilds build it up with their production, and every guild with trade
              power there takes a share. Your faction&apos;s info shows the total over its provinces. See{" "}
              <Link href="/wiki/guilds#trade-income" className={link}>
                Trade income
              </Link>
              .
            </>,
          ],
          [
            "Trade power",
            <>
              A guild&apos;s trading strength, mostly from its Guild Halls. It decides the guild&apos;s share of each
              province&apos;s prosperity and adds to the faction&apos;s prestige. See{" "}
              <Link href="/wiki/guilds#trade" className={link}>
                Trade
              </Link>
              .
            </>,
          ],
        ]}
      />

      <WikiSectionHeading id="joining" intro="The easiest start is to join a faction that already exists.">
        Joining a faction
      </WikiSectionHeading>
      <p className={body}>
        Ask a faction&apos;s leader to invite you. Click Accept on the invite, or type{" "}
        <code className={code}>/faction join</code>. <code className={code}>/faction list</code> shows every faction.
        Each faction is split into{" "}
        <Link href="/wiki/guilds" className={link}>
          guilds
        </Link>
        . You start in the main guild, which the faction leader runs. The main guild holds up to 64 members.
      </p>

      <WikiSectionHeading id="founding" intro="You become the leader of a faction of one.">
        Founding a faction
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          <code className={code}>/faction create &lt;name&gt;</code> founds the faction.
        </li>
        <li>
          Stand in an unclaimed province and run <code className={code}>/faction setcapital &lt;name&gt;</code> to claim
          it as your capital.
        </li>
        <li>
          Stand in a chunk of your capital province and run <code className={code}>/faction setbank</code>. This is
          where members pay in and where everyone banks their own{" "}
          <Link href="/wiki/economy" className={link}>
            money
          </Link>
          .
        </li>
        <li>
          Invite players with <code className={code}>/faction invite &lt;player&gt;</code>.
        </li>
      </ol>

      <WikiSectionHeading id="land" intro="Land is claimed one province at a time.">
        Land and prestige
      </WikiSectionHeading>
      <p className={body}>
        Stand in a province and run <code className={code}>/faction claim</code>. The province must border your land or
        lie across a river or lake from it. You can also claim any coast you can reach over water from the land
        connected to your capital, as long as no land is in the way. Sea provinces can&apos;t be claimed.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Each claim needs prestige: 50 for your second province, 100 for your third and 50 more for each one after
          that.
        </li>
        <li>
          Prestige comes mostly from your active members and the time they play. Your faction&apos;s wealth, your
          guilds&apos; trade power, your highest title, your subjects and branch levels add more, and every province
          adds 10.
        </li>
        <li>
          Low stability lowers prestige, and so does every member being{" "}
          <a href="#inactivity" className={link}>
            inactive
          </a>
          .
        </li>
        <li>If your prestige drops too low for the land you hold, other factions can claim your provinces.</li>
        <li>
          You can hold at most 5 provinces outside a title. Form a{" "}
          <a href="#titles" className={link}>
            County
          </a>{" "}
          to grow further.
        </li>
      </ul>

      <WikiSectionHeading id="titles" intro="The faction leader forms titles from the Tier menu.">
        Titles and ranks
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Title" }, { header: "Formed from" }, { header: "Prestige", align: "right" }]}
        rows={factionTitles.map((t) => [t.title, t.formedFrom, t.prestige])}
      />
      <p className={`mt-3 ${body}`}>
        Only your highest title adds prestige. You can&apos;t form or claim another County once you hold as many
        Counties as you have active members.
      </p>
      <p className={`mt-3 ${body}`}>
        Titles that already exist on the map are claimed from the Titles menu once you hold enough of their provinces.
        The share you need depends on your faction&apos;s rank:
      </p>
      <DataTable
        columns={[
          { header: "Rank" },
          { header: "Prestige", align: "right" },
          { header: "Provinces needed to claim a title", align: "right" },
        ]}
        rows={factionRanks.map((r) => [r.rank, r.prestige, r.share])}
      />
      <p className={`mt-3 ${body}`}>
        The higher ranks also need a share of the strongest faction&apos;s prestige. Low stability raises the share of
        provinces a claim needs.
      </p>

      <WikiSectionHeading
        id="government"
        intro={
          <>
            Laws, taxes and the council are all under Government in <code className={code}>/faction menu</code>.
          </>
        }
      >
        Government and taxes
      </WikiSectionHeading>
      <p className={body}>
        Laws decide how the faction is run. They come in these groups: <strong>Citizen Tax</strong>,{" "}
        <strong>Vassal Tax</strong>, <strong>Guild Tax</strong>, <strong>Leadership</strong>,{" "}
        <strong>Government</strong>, <strong>Council</strong>, <strong>Military</strong>, <strong>Vassalage</strong>,{" "}
        <strong>Economy</strong>, <strong>Borders</strong>, <strong>Repression</strong>, <strong>Favouring</strong> and{" "}
        <strong>Assembly</strong>.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Changing a law costs administrative power and locks that law for 3 days.</li>
        <li>
          A faction has a council only under an Oligarchy, Plutocracy or Democracy <strong>Government</strong> law. The{" "}
          <strong>Council</strong> law sets how big the council is. Community and Autocracy have no council, whatever
          the Council law says.
        </li>
        <li>In a faction with no council, the faction leader&apos;s change applies straight away.</li>
        <li>
          In a faction with a council, the faction leader and the council members propose changes to laws and taxes in
          Government, and a{" "}
          <a href="#council" className={link}>
            council session
          </a>{" "}
          decides them. The administrative power is paid when a change is proposed, not when it passes.
        </li>
        <li>
          Every law also has an upkeep. It lowers your maximum administrative power for as long as the law stays in
          force.
        </li>
        <li>
          If upkeep pushes that maximum below zero, or your diplomatic ties use more capacity than you have, the faction
          pays the shortfall in denars every day.
        </li>
        <li>
          The <strong>Repression</strong> and <strong>Favouring</strong> laws let the government penalise or support
          chosen guilds and subjects, which changes their trade and their support for the government. Each guild or
          subject you favour or repress adds to the ongoing cost.
        </li>
        <li>
          <Link href="/wiki/guilds#leader-actions" className={link}>
            Elevating or evicting a guild
          </Link>{" "}
          costs administrative power too.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Administrative power grows back by itself every hour, up to a limit. The main guild raises it with its
        Bureaucracy branch and its <strong>Administrative Power Gain</strong> and{" "}
        <strong>Max Administrative Power</strong> upgrades. Government shows how much you have and how much you gain
        each hour.
      </p>
      <p className={`mt-3 ${body}`}>
        Taxes take a share of what members and guilds earn. Money is settled once a day, and{" "}
        <code className={code}>/ledger</code> shows your own daily earnings, taxes and upkeep.
      </p>

      <WikiSectionHeading id="council" intro="A council session votes on the proposals that are waiting.">
        Council sessions
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          The faction leader opens <code className={code}>/faction menu</code>, goes to Government and clicks{" "}
          <strong>Start Council Meeting</strong>. The button only shows while proposals are waiting. At least 75% of the
          council, the leader included, must be online.
        </li>
        <li>
          Within 60 seconds, the leader right-clicks a placed lantern, or the session is cancelled. It must be an
          ordinary lantern. A soul lantern doesn&apos;t work.
        </li>
        <li>
          The lantern is now the meeting spot. Floating text shows the current proposal and the votes, and
          right-clicking the lantern opens the proposal as a book.
        </li>
        <li>
          Council members vote by typing <strong>Yay</strong>, <strong>Nay</strong> or <strong>Abstain</strong> in chat
          within 10 blocks of the lantern. Members who are offline count as abstaining.
        </li>
        <li>Proposals are voted on one at a time. A proposal passes with more Yay than Nay, and a tie fails.</li>
        <li>
          At the end, the passed proposals take effect and the leader receives a <strong>Council Session</strong> report
          book.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>Breaking the lantern or the leader logging out ends the session.</p>
      <p className={`mt-3 ${body}`}>
        No council seat can change during a session. On an appointed council, the faction leader can right-click an
        occupied seat to vacate it. This costs nothing, and the member who held it is told.
      </p>

      <WikiSectionHeading id="elections">Elections</WikiSectionHeading>
      <p className={body}>
        When the laws allow elections, members vote at a <WikiItemLink name="Voting Booth" />. Only the faction leader
        can set one up. To stand, sign up as a candidate at your faction&apos;s Voting Booth before voting begins. Each
        guild other than the main guild may put forward one candidate for leader and one for council. Leaders of other
        guilds can&apos;t stand for faction leader.
      </p>
      <p className={`mt-3 ${body}`}>
        An election starts on a Monday, at least 21 days after the last one ended, and only if someone has signed up.
        Voting lasts 7 days. Council elections follow the same timetable.
      </p>

      <WikiSectionHeading id="stability">Stability and legitimacy</WikiSectionHeading>
      <p className={body}>
        Legitimacy comes from your government type and from the stance each other guild&apos;s leader and each
        subject&apos;s leader picks in the Government menu: Support, Neutral or Oppose. A faction with no other guilds
        or subjects is fully legitimate.
      </p>
      <p className={`mt-3 ${body}`}>These lower stability:</p>
      <ul className={`mt-2 list-disc space-y-2 pl-5 ${body}`}>
        <li>Low legitimacy (a doubtful claim to rule).</li>
        <li>
          The Weak State penalty. Your <strong>Government</strong> law sets how close the main guild&apos;s branch
          levels must be to the biggest other guild&apos;s. Plutocracy and Community governments never get the penalty,
          and an elected leader eases it.
        </li>
        <li>A Community government holding more land than it can manage.</li>
        <li>A civil war or a coup.</li>
        <li>Declining an ally&apos;s call to arms.</li>
        <li>Giving in to a movement&apos;s demands.</li>
        <li>Evicting a guild.</li>
        <li>Losing a war with a Forced Market Open or Forced Government Change demand.</li>
        <li>Bankruptcy, which drops stability to nothing.</li>
      </ul>
      <p className={`mt-3 ${body}`}>The temporary hits wear off with time.</p>
      <p className={`mt-3 ${body}`}>Low stability means:</p>
      <ul className={`mt-2 list-disc space-y-2 pl-5 ${body}`}>
        <li>Less administrative power and diplomatic capacity.</li>
        <li>Higher upkeep for laws.</li>
        <li>Title claims need more provinces.</li>
        <li>Less prestige.</li>
        <li>Lower tax income from Struggling State, and lower again from Failing State.</li>
        <li>Foreign guilds gain extra trade power in your provinces.</li>
      </ul>
      <p className={`mt-3 ${body}`}>A Collapsing or Failed State can&apos;t declare war or form titles.</p>

      <WikiSectionHeading
        id="diplomacy"
        intro="The faction leader sets relations with other factions from the Diplomacy menu."
      >
        Diplomacy
      </WikiSectionHeading>
      <p className={body}>
        Each faction has an opinion of every other. Your stance (Friendly, Neutral, Unfriendly or Hostile, chosen in the
        Diplomacy menu) and your relations set a target, and the opinion slowly moves towards it.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>An alliance needs both sides at 40 or more.</li>
        <li>A rivalry needs -10 or less.</li>
        <li>
          <Link href="/wiki/war#declaring" className={link}>
            Declaring war
          </Link>{" "}
          needs -50 or less.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        You can also sign trade agreements and non-aggression pacts, place embargoes and take subjects. To make a
        faction your subject, your <strong>Vassalage</strong> law must allow subjects and your title tier must be equal
        to or higher than theirs. Agreements that need both sides are answered by the other leader with{" "}
        <code className={code}>/faction accept</code> while they are online.
      </p>
      <p className={`mt-3 ${body}`}>Ties use diplomatic capacity, and a tie with a stronger faction uses more.</p>
      <ul className={`mt-2 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          These use capacity: subjects, alliances, tributaries, trade agreements, the favoured side of an unequal
          treaty, embargoes, non-aggression pacts and a Friendly stance.
        </li>
        <li>These cost nothing: Rival, Unfriendly, Hostile and Neutral.</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        You can&apos;t take on a tie you lack the capacity for, but you can always end or downgrade one. The main
        guild&apos;s Bureaucracy branch, the <strong>Max Diplomatic Capacity</strong> upgrade and holding a Palatinate
        all raise your capacity.
      </p>
      <p className={`mt-3 ${body}`}>
        Ending a non-aggression pact takes 14 days&apos; notice. Until the notice runs out, the pact still holds and
        still blocks war. Picking the pact again withdraws your notice.
      </p>
      <p className={`mt-3 ${body}`}>
        An ally at war can call you to arms. The call stays open until you answer it (see{" "}
        <Link href="/wiki/war#calls" className={link}>
          War
        </Link>
        ), and declining lowers your stability.
      </p>
      <DataTable
        columns={[{ header: "Relation" }, { header: "What it means" }]}
        rows={[
          ["Subject", "A realm under an overlord, contributing taxes and levies."],
          [
            "Integrated Subject",
            "A closer subject with heavier taxes and more levies, using less diplomatic capacity.",
          ],
          ["March", "A military subject with lighter taxes and cheaper troops. At most one."],
          ["Mercantile", "A trading subject with heavier taxes, faster resource work and fewer levies."],
          ["Palatinate", "A privileged subject that helps diplomacy, prestige and title claims. At most one."],
          ["Tributary / Suzerain", "The tributary pays tribute to its suzerain."],
          ["Unequal Treaty", "A trade agreement that gives one side better trade access than the other."],
        ]}
      />

      <WikiSectionHeading
        id="movements"
        intro={
          <>
            Open Government in <code className={code}>/faction menu</code> to choose a cause and rally support.
          </>
        }
      >
        Movements and civil war
      </WikiSectionHeading>
      <p className={body}>
        A movement forces a change the government will not make. Main-guild members, leaders of other guilds and leaders
        of subjects can start one. A guild in a faction with only one province can&apos;t start or join a movement.
      </p>
      <p className={`mt-3 ${body}`}>
        The causes are Change Leader, Nationhood (for guilds), Independence (for guilds or subjects), Snap Elections,
        Dissolve, White Peace, Surrender and Usurp. Pick one that applies to your group, then invite support. Foreign
        factions can back a movement too.
      </p>
      <p className={`mt-3 ${body}`}>
        Usurp is open to a direct subject whose overlord holds a title, as long as the subject&apos;s own{" "}
        <strong>Vassalage</strong> law allows subjects. The usurper takes the overlord&apos;s highest title and its
        other subjects, and the old overlord becomes its subject.
      </p>
      <p className={`mt-3 ${body}`}>
        A movement builds organization every day from its support: the share of the realm&apos;s active members behind
        it, its backers and the trade power of the guilds supporting it. It builds faster against an Illegitimate
        Government. A movement with no leader loses organization.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Each time the organization bar is full, the movement leader steps the movement up to the next phase in the
          movement menu. The phases are Gathering, Pressuring, Agitated and Rebellious.
        </li>
        <li>
          When the movement is Rebellious and the bar is full again, the movement leader clicks{" "}
          <strong>Send Demands</strong>.
        </li>
        <li>
          If the government accepts, the demands are applied. If it refuses, a civil war starts, with the movement and
          its backers fighting the government.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        The government can also click <strong>Demand Disband</strong> in a movement&apos;s menu. If the movement
        refuses, a civil war begins. The faction&apos;s <strong>Assembly</strong> law sets when the government can do
        this:
      </p>
      <ul className={`mt-2 list-disc space-y-2 pl-5 ${body}`}>
        <li>None: once the movement is Agitated or Rebellious.</li>
        <li>Right to Assembly: only when the movement is Rebellious.</li>
        <li>State Crackdowns: at any phase.</li>
      </ul>

      <WikiSectionHeading id="inactivity">Inactivity</WikiSectionHeading>
      <p className={body}>
        A member who stays offline for 4 weeks is marked inactive. They stay in their guild, and playing again makes
        them active.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          An inactive member adds no prestige and doesn&apos;t count towards limits based on member numbers: new County
          claims, levy caps, guild stability shares and movement strength.
        </li>
        <li>
          They give up council seats, candidacies, votes and their place in the succession. They also lose the
          leadership of a movement or cause and an appointed Spymaster post.
        </li>
        <li>A faction leader stays leader, and a guild leader keeps the guild.</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        If every member is inactive, the faction slowly loses prestige. Once it can no longer hold its land, it loses
        provinces too, with the capital last. Inactive guilds keep their upgrade levels, but the output from those
        upgrades fades while they stay inactive.
      </p>

      <WikiSectionHeading
        id="spymaster"
        intro="Each faction has a Spymaster, who hides its military and spies on everyone else's."
      >
        Spymaster
      </WikiSectionHeading>
      <p className={body}>
        The faction leader appoints a Spymaster with <code className={code}>/faction spymaster &lt;player&gt;</code>.
        While nobody is appointed, the leader holds the office. A new Spymaster reaches full strength after a week. The
        leader must wait 2 days before appointing someone else, unless the Spymaster&apos;s character dies.
      </p>
      <p className={`mt-3 ${body}`}>Your Spymaster hides your military from other factions:</p>
      <ul className={`mt-2 list-disc space-y-2 pl-5 ${body}`}>
        <li>Your regiments.</li>
        <li>Your faction&apos;s vehicles and where each one is berthed. The installations themselves stay visible.</li>
        <li>
          The military entries in your ledger: military and vehicle upkeep, plus mercenary contracts. The totals still
          include them.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Members, money, laws, government, installations and offices are open to everyone.
      </p>
      <p className={`mt-3 ${body}`}>
        Each day your Spymaster gathers a report on every other faction&apos;s military. A report comes back botched, as
        rumours or as a broad, reliable or detailed estimate. Better reports give closer numbers. The quality depends on
        both factions&apos; Spymasters. Overlords find it easier to spy on their subjects.
      </p>
      <p className={`mt-3 ${body}`}>
        The Spymaster can share your military with your overlord, your subjects or your allies. They then see the exact
        figures for everything a report of the quality you choose would show. Set it with{" "}
        <code className={code}>
          /faction spymaster share &lt;overlord|vassals|allies&gt; &lt;none|rumours|broad|reliable|detailed&gt;
        </code>
        , or in the Spymaster&apos;s office in <code className={code}>/faction espionage</code>. Choosing{" "}
        <code className={code}>none</code> stops sharing.
      </p>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={factionsCommands.commands} />

      <SeeAlso hrefs={["/wiki/guilds", "/wiki/war", "/wiki/economy", "/wiki/commands"]} />
    </WikiPage>
  );
}
