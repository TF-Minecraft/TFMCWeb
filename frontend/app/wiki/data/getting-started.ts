import type { WikiCommandSet, WikiSection } from "./types";

// ---------- Lobby RuleQuiz, ActivityTF (activity and referrals), VotingPlugin and Essentials /helpop ----------

export const gettingStartedCommands: WikiCommandSet = {
  system: "Getting Started",
  href: "/wiki/getting-started",
  commands: [
    {
      command: "/rulequiz",
      description: "Starts the rules quiz. Answer each question by typing in chat.",
      notes: "In the Lobby. You need to pass it to join the main server.",
    },
    {
      command: "/activity",
      description: "Opens your daily tasks and weekly activity bar, where you also claim the rewards.",
    },
    {
      command: "/referral",
      aliases: ["/referrals"],
      description: "Opens the referral menu, where you name who invited you and claim referral rewards.",
    },
    {
      command: "/referral invitedby <name>",
      description: "Names the player who invited you. You confirm before it is saved, and it cannot be changed.",
      notes: "Anyone can do this in the first 14 days of a referral season, after that only in your first week.",
    },
    {
      command: "/vote",
      description: "Lists the sites where you can vote for the server.",
    },
    {
      command: "/helpop <message>",
      description: "Sends your message to the staff and helpers who are online.",
    },
  ],
};

export const gettingStartedSection: WikiSection = {
  nav: {
    href: "/wiki/getting-started",
    label: "Getting Started",
    category: "getting-started",
    blurb: "Join the server, pass the rules quiz, link Discord, create your first character and pick up daily tasks.",
  },
  commands: gettingStartedCommands,
};
