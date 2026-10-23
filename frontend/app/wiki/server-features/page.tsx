import Link from "next/link";

import { CommandTable, DataTable, RankName, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { serverFeaturesCommands } from "../data/server-features";

const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

export default function ServerFeaturesPage() {
  return (
    <WikiPage
      lastModified="2026-10-22"
      title="Account & Website"
      intro="Your Minecraft account, your Discord account and the TFMC website work together once they are linked."
    >
      <WikiSectionHeading id="website-link">Linking Discord</WikiSectionHeading>
      <p className={body}>
        You cannot play in Survival until your Discord account is linked; until then you are held in place. Type{" "}
        <code className={code}>/linkdiscord</code> in game to get a code you can click to copy, then run{" "}
        <code className={code}>/linkdiscord &lt;code&gt;</code> in the TFMC Discord server. The game confirms the link
        within a second or so. <code className={code}>/unlinkdiscord</code> removes it again.
      </p>
      <p className={`mt-3 ${body}`}>
        If you leave the Discord server, you have a grace period to rejoin. After that your account is unlinked and you
        cannot play in Survival until you link again.
      </p>

      <WikiSectionHeading id="profile">Your website profile</WikiSectionHeading>
      <p className={body}>
        Run <code className={code}>/token create profile</code> in game for a one-time code, then enter it on your{" "}
        <Link href="/profile" className={link}>
          profile
        </Link>{" "}
        to sign in. There you can create characters, change their wills, manage wardrobes and kits, and see your custom
        skins and drinks and your linked accounts.
      </p>

      <WikiSectionHeading id="uploads">Skin and drink codes</WikiSectionHeading>
      <p className={body}>
        <code className={code}>/token create skin</code> and <code className={code}>/token create drink</code> give you
        a code for uploading a custom{" "}
        <Link href="/wiki/armour-shop" className={link}>
          skin
        </Link>{" "}
        or{" "}
        <Link href="/wiki/drink-builder" className={link}>
          drink
        </Link>{" "}
        on the website. They are a supporter perk, and both share one cooldown that depends on your rank.
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
        Supporter ranks come from Patreon. Run <code className={code}>/patreon</code> to link your Patreon account and
        see your status, and <code className={code}>/patreon unlink</code> to remove the link. The Noble, Gilded and
        Ascended ranks follow your Patreon tier. <code className={code}>/tfmc patreon</code> shows the Patreon page.
      </p>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={serverFeaturesCommands.commands} showAliases={false} />

      <SeeAlso hrefs={["/wiki/getting-started", "/wiki/characters", "/wiki/bird-mail", "/wiki/armour-shop"]} />
    </WikiPage>
  );
}
