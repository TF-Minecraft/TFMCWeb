import Link from "next/link";
import {
  Callout,
  CommandTable,
  SeeAlso,
  StationLink,
  WikiItemLink,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import { cardBackTexture, cardSuits, gamesCommands, playingCards } from "../data/games";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

function Word({ children }: { children: string }) {
  return <code className="text-[var(--tfmc-accent)]">{children}</code>;
}

export default function CardGamesPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Card Games"
      intro="Set up a card table almost anywhere and play for real denars: Blackjack, Tenceur Hold'em, Five-Draw, or Free play with no rules at all."
    >
      <WikiSectionHeading id="table">Setting up a table</WikiSectionHeading>
      <ol className={`mt-2 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Make a <WikiItemLink name="Deck of Cards" /> at the <StationLink name="Tool Station" /> from 2 Paper.
        </li>
        <li>
          Hold it and right-click the top of a solid block (slabs work), but not one that already has a table. You need
          to be playing a character.
        </li>
        <li>
          Pick a game. Hold&apos;em first asks for the blinds and how often to shuffle. Five-Draw and Free play are set
          up straight away. Blackjack tables belong to guilds (see{" "}
          <a href="#blackjack" className={link}>
            Blackjack
          </a>
          ).
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        The table belongs to the character who placed it, and passes to their heir if they die. Money left on it is not
        inherited. As the owner, sneak and right-click the deck between rounds to change a Hold&apos;em or Blackjack
        table&apos;s settings, or punch the deck to pick the table up again and get your Deck of Cards back.
      </p>

      <WikiSectionHeading id="playing">At the table</WikiSectionHeading>
      <ul className={`mt-2 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Your cards float in front of you. Only you see their faces. Left-click one to look closer, and press your
          swap-hands key (F) to show your whole hand to the table.
        </li>
        <li>The deck on the table is the shoe: right-click it to draw, deal or take your turn.</li>
        <li>
          Bets are made with gold coins in your inventory, not your pouch or bank. Withdraw some first with{" "}
          <Word>/deco toitem</Word> (see{" "}
          <Link href="/wiki/economy" className={link}>
            Denar Economy
          </Link>
          ). Right-click the felt holding coins: each click puts one coin item down at its full value, so a{" "}
          <WikiItemLink name="Pouch of Gold Denars" /> is 100. Gold Ingots are also accepted at 1 d each. Silver coins
          aren&apos;t accepted.
        </li>
        <li>
          On your turn, type your move in chat as a single word, like <Word>hit</Word> or <Word>fold</Word>.
        </li>
        <li>Winnings are paid in coins. Tax is taken from your profit, never from the stake you get back.</li>
        <li>
          Walking more than 6 blocks away takes you out of the game. What you get back depends on the game, as described
          below.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        <Word>/games help</Word> opens a rule book for each game.
      </p>

      <p className={body}>
        Use <Word>/wager</Word> without an argument to commit the coins you have put out for the current round. If that
        is less than you need to match, you fold and get the coins back.
      </p>

      <WikiSectionHeading id="blackjack">Blackjack</WikiSectionHeading>
      <p className={body}>
        Blackjack tables are run by guilds. Only a guild leader can place one, and the guild needs a free table from its{" "}
        <strong>Auto Dealer Tables</strong> upgrade (see{" "}
        <Link href="/wiki/guilds#guilds" className={link}>
          guilds
        </Link>
        ). The house plays with the guild bank&apos;s money: if the bank can&apos;t cover the bets, the round is called
        off and everyone gets their bet back.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Right-click your box on the felt with coins to bet, and again to add more. The first bet gives everyone else
          10 seconds to join in. Bets below the table minimum are given back.
        </li>
        <li>
          On your turn, right-click the shoe for a card, or say <Word>hit</Word>, <Word>stand</Word>,{" "}
          <Word>double</Word> or <Word>split</Word>. The usual blackjack rules apply, and <Word>/games help</Word> has
          the details.
        </li>
        <li>Walk away once the round has started and you lose your bet.</li>
        <li>
          Between rounds, a guild member can stand at the dealer&apos;s spot and right-click the shoe to deal by hand.
          The dealer sets the limits and opens and closes betting with the <Word>/games bet</Word> commands below.
        </li>
      </ul>

      <WikiSectionHeading id="holdem">Tenceur Hold&apos;em</WikiSectionHeading>
      <ul className={`mt-2 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Right-click the felt with coins to sit down. Once two players are seated, any of them can right-click the shoe
          to deal.
        </li>
        <li>
          The blinds are taken from you automatically at the start of a hand. If you can&apos;t cover yours, you are all
          in.
        </li>
        <li>
          On your turn, put your coins on the felt first, then say <Word>check</Word>, <Word>call</Word>,{" "}
          <Word>raise</Word> or <Word>fold</Word>. The table only counts coins you actually put out. <Word>allin</Word>{" "}
          puts in every coin you carry, and you can only call for less than the bet once you have no coins left.
        </li>
        <li>
          Walk away mid-hand and you only get back what nobody has matched yet this round. After folding, you get
          nothing back.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        The table&apos;s owner can turn an empty table into a <strong>tournament</strong> with a buy-in, starting chips,
        rebuys, an ante and a time after which the blinds double. Players play with chips, the buy-ins make up the
        prize, and leaving after play starts forfeits your entry. See the <Word>/games poker</Word> commands below.
      </p>

      <WikiSectionHeading id="five-draw">Five-Draw</WikiSectionHeading>
      <p className={body}>
        Five-Draw seats and bets like Hold&apos;em, but with no blinds. Everyone gets five hidden cards. On your draw
        turn, right-click the cards you want to swap, then right-click the shoe to get that many new ones. To keep all
        five, say <Word>draw</Word> instead. Then there is one more round of betting.
      </p>

      <WikiSectionHeading id="free-play">Free play</WikiSectionHeading>
      <p className={body}>
        No turns, no dealer, no rules. Right-click the shoe with an empty hand to take a card, and click cards then the
        shoe to throw them away. Right-click the felt with coins to add them to the middle. If you walk away, your coins
        come back to you.
      </p>
      <Callout variant="warning" className="mt-4">
        The table&apos;s owner can take the whole middle at any time by sneaking and right-clicking the shoe. Only play
        at a table whose owner you trust.
      </Callout>

      <WikiSectionHeading id="wagering-items">Betting items instead of coins</WikiSectionHeading>
      <p className={body}>
        At Hold&apos;em, Five-Draw and Free play cash tables, once you have coins on the table, you can also stake an
        item. Hold it and type <Word>/wager</Word> with what each item is worth in denars: the whole stack you hold is
        offered. The other seated players have 30 seconds to vote with <Word>/wager accept</Word> or{" "}
        <Word>/wager decline</Word>, and more than half must agree. If nobody else is seated, it counts straight away.
        Then you have 10 seconds to click the felt with the item.
      </p>

      <WikiSectionHeading id="cards" intro="A normal 52-card deck with four suits of its own.">
        The cards
      </WikiSectionHeading>
      <div className="mt-4 flex items-center gap-3 rounded-md border border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_45%,transparent)] p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardBackTexture}
          alt="Card back"
          width={16}
          height={16}
          className="h-20 w-20 object-contain [image-rendering:pixelated]"
        />
        <span className="text-sm font-semibold text-[var(--tfmc-cream)]">Card back</span>
      </div>
      <div className="mt-5 space-y-6">
        {cardSuits.map((suit) => (
          <section key={suit} aria-labelledby={`cards-${suit.toLowerCase()}`}>
            <h3
              id={`cards-${suit.toLowerCase()}`}
              className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--tfmc-cream)]"
            >
              {suit}
            </h3>
            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
              {playingCards
                .filter((card) => card.suit === suit)
                .map((card) => (
                  <figure
                    key={card.id}
                    className="flex min-w-0 flex-col items-center rounded-md border border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_45%,transparent)] p-2 text-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.texture}
                      alt={`${card.rankLabel} of ${card.suit}`}
                      width={16}
                      height={16}
                      loading="lazy"
                      className="h-24 w-24 max-w-full object-contain [image-rendering:pixelated]"
                    />
                    <figcaption className="mt-1 leading-tight">
                      <span className="block text-sm font-semibold text-[var(--tfmc-cream)]">{card.rankLabel}</span>
                      <span className="block text-xs text-[var(--tfmc-stone)]">{card.suit}</span>
                    </figcaption>
                  </figure>
                ))}
            </div>
          </section>
        ))}
      </div>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={gamesCommands.commands} showAliases={false} showNotes={false} />

      <SeeAlso hrefs={["/wiki/economy", "/wiki/factions"]} />
    </WikiPage>
  );
}
