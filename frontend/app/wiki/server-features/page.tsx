import Link from "next/link";

import { CommandTable, DataTable, RankName, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { serverFeaturesCommands } from "../data/server-features";

const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

export default function ServerFeaturesPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
      title="Account & Website"
      intro="Link your Minecraft account to Discord, sign in to the website and see what supporter ranks unlock."
    >
      <WikiSectionHeading id="website-link">Linking Discord</WikiSectionHeading>
      <p className={body}>
        You cannot play on the main server until your Discord account is linked. Until then you stay on the character
        screen, which has a <strong>Link Discord to play</strong> button. Type{" "}
        <code className={code}>/linkdiscord</code> in game to get a code you can click to copy, then run{" "}
        <code className={code}>/linkdiscord &lt;code&gt;</code> in the TFMC Discord server. The game confirms the link
        within a second or so. <code className={code}>/unlinkdiscord</code> removes it again.
      </p>

      <WikiSectionHeading id="profile">Your website profile</WikiSectionHeading>
      <p className={body}>
        Open your{" "}
        <Link href="/profile" className={link}>
          profile
        </Link>{" "}
        and choose <strong>Sign in with Discord</strong>, or use a one-time code from{" "}
        <code className={code}>/token create profile</code> in game. There you can create characters, change their wills
        and manage wardrobes and kits. It also shows the skins and drinks you designed and your linked accounts.
      </p>
      <p className={`mt-3 ${body}`}>
        Once you are signed in with Discord, you can link your Minecraft account on the profile, either by signing in
        with Microsoft or with the code from <code className={code}>/linkdiscord</code>, and connect your Patreon
        account. After that, the profile opens without a code.
      </p>

      <WikiSectionHeading id="uploads">Skin and drink codes</WikiSectionHeading>
      <p className={body}>
        <code className={code}>/token create skin</code> and <code className={code}>/token create drink</code> give you
        a code for uploading your own{" "}
        <Link href="/wiki/armour-shop" className={link}>
          skin
        </Link>{" "}
        or{" "}
        <Link href="/wiki/brewing#custom-drinks" className={link}>
          drink
        </Link>{" "}
        on the website. They are for <RankName rank="Noble" /> rank and above, and both share one cooldown that depends
        on your rank.
      </p>
      <div className="mt-4">
        <DataTable
          columns={[
            { header: "Rank", nowrap: true },
            { header: "Skin or drink code", align: "right" },
          ]}
          rows={[
            [<RankName key="commoner" rank="Commoner" />, "Not available"],
            [<RankName key="noble" rank="Noble" />, "Every 28 days"],
            [<RankName key="gilded" rank="Gilded" />, "Every 21 days"],
            [<RankName key="ascended" rank="Ascended" />, "Every 14 days"],
            [<RankName key="legacy" rank="Legacy" />, "Every 7 days"],
          ]}
        />
      </div>

      <WikiSectionHeading id="patreon">Supporting the server</WikiSectionHeading>
      <p className={body}>
        You get a supporter rank through Patreon. Run <code className={code}>/patreon</code> to link your Patreon
        account and see your status, and <code className={code}>/patreon unlink</code> to remove the link. The Noble,
        Gilded and Ascended ranks follow your Patreon tier. <code className={code}>/tfmc patreon</code> shows the
        Patreon page.
      </p>
      <p className={`mt-3 ${body}`}>
        Supporter ranks get priority in the queue to join the main server. <RankName rank="Noble" /> rank and above can
        also use emotes and images in chat.
      </p>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={serverFeaturesCommands.commands} showAliases={false} />

      <SeeAlso hrefs={["/wiki/getting-started", "/wiki/characters", "/wiki/bird-mail", "/wiki/armour-shop"]} />
    </WikiPage>
  );
}
