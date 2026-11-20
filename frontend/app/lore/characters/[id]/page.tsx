"use client";

import { use, useRef, useState } from "react";

import {
  CHARACTER_STATUSES,
  clearSkin,
  createEntity,
  getEntity,
  loreErrorMessage,
  setAffiliations,
  setPlayer,
  uploadSkin,
  type CharacterDetail,
  type PlayerCharacter,
  type SearchResult,
} from "@/lib/lore/api";
import { formatDay } from "@/lib/lore/dates";
import AdminColumn from "../../../components/admin/AdminColumn";
import { buttonClass, errorClass, inputClass, mutedClass, quietButtonClass } from "../../../components/admin/ui";
import CharacterFace from "../../../components/lore/CharacterFace";
import { Backlinks, DetailHeader, Field, Notice, RefLink, Section } from "../../../components/lore/DetailParts";
import HistoryList from "../../../components/lore/HistoryList";
import LinkedRoleList from "../../../components/lore/LinkedRoleList";
import LoreTextEditor from "../../../components/lore/LoreTextEditor";
import RelationsEditor from "../../../components/lore/RelationsEditor";
import SaveBar from "../../../components/lore/SaveBar";
import { statusLabel } from "../../../components/lore/StatusBadge";
import { useEntityEditor } from "../../../components/lore/useEntityEditor";

const MAX_SKIN_BYTES = 64 * 1024;

export default function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const characterId = Number(id);
  if (!Number.isSafeInteger(characterId) || characterId <= 0) {
    return (
      <AdminColumn>
        <Notice error>That character doesn’t exist.</Notice>
      </AdminColumn>
    );
  }
  return <CharacterEditor key={characterId} id={characterId} />;
}

function CharacterEditor({ id }: { id: number }) {
  const editor = useEntityEditor("character", id);
  const { detail } = editor;

  if (!detail) {
    return (
      <AdminColumn>
        {editor.loadError ? <Notice error>{editor.loadError}</Notice> : <Notice>Loading…</Notice>}
      </AdminColumn>
    );
  }

  const locked = Boolean(detail.deleted_at);

  async function refresh() {
    editor.replace(await getEntity("character", id));
  }

  async function createOrganisation(label: string): Promise<SearchResult> {
    const made = await createEntity("organisation", { name: label });
    return { kind: "organisation", id: made.id, label: made.name, sublabel: "", status: null };
  }

  return (
    <AdminColumn>
      <DetailHeader
        kind="character"
        title={editor.value("name")}
        status={editor.value("status")}
        updatedAt={detail.updated_at}
        updatedBy={detail.updated_by_name}
        deletedAt={detail.deleted_at}
        onDelete={editor.remove}
        onRestore={editor.restore}
      />

      <Section title="Details">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <Field label="Name">
              <input
                className={inputClass}
                value={editor.value("name")}
                maxLength={120}
                disabled={locked}
                onChange={(e) => editor.set("name", e.target.value)}
              />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={editor.value("status")}
                disabled={locked}
                onChange={(e) => editor.set("status", e.target.value)}
              >
                {CHARACTER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <LoreTextEditor
            label="Summary"
            value={editor.value("summary")}
            onChange={(v) => editor.set("summary", v)}
            rows={3}
            maxLength={2000}
            placeholder="Who they are, in a line or two."
            disabled={locked}
          />
          <LoreTextEditor
            label="Notes"
            value={editor.value("notes")}
            onChange={(v) => editor.set("notes", v)}
            rows={8}
            maxLength={20000}
            disabled={locked}
          />
        </div>
      </Section>

      <FaceSection detail={detail} locked={locked} onChange={editor.replace} />

      <Section title="Factions & organisations">
        <LinkedRoleList
          kind="organisation"
          items={detail.affiliations}
          disabled={locked}
          empty="Not part of any faction or organisation."
          placeholder="Add to a faction or organisation…"
          onCreate={createOrganisation}
          onSave={async (links) =>
            editor.replace(
              await setAffiliations(
                id,
                links.map((link) => ({ organisation_id: link.id, role: link.role })),
              ),
            )
          }
        />
      </Section>

      <Section title="Relations">
        <RelationsEditor
          sourceKind="character"
          sourceId={id}
          relations={detail.relations}
          disabled={locked}
          onChanged={refresh}
        />
      </Section>

      <Section title="Storylines">
        {detail.storylines.length === 0 ? (
          <p className={mutedClass}>Not in any storyline. Add them from a storyline’s page.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {detail.storylines.map((item) => (
              <li key={item.id}>
                <RefLink item={item} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Events">
        {detail.events.length === 0 ? (
          <p className={mutedClass}>Not in any event. Add them from an event’s page.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {detail.events.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3">
                <RefLink item={item} />
                {item.scheduled_on ? (
                  <span className="text-xs text-[var(--tfmc-stone)]">
                    {formatDay(item.scheduled_on, { year: true })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Backlinks items={detail.backlinks} />
      <HistoryList kind="character" id={id} refreshKey={editor.historyKey} />

      <SaveBar
        dirty={editor.dirty}
        saving={editor.saving}
        error={editor.error}
        conflict={Boolean(editor.conflict)}
        onSave={() => void editor.save()}
        onDiscard={editor.discard}
        onKeepMine={() => void editor.keepMine()}
        onTakeTheirs={editor.takeTheirs}
      />
    </AdminColumn>
  );
}

/** The character's face: an uploaded skin, or the head of a linked Minecraft player (for one adopted
 * from RPCharacters, the skin that character wears). Such a character's player is fixed. */
function FaceSection({
  detail,
  locked,
  onChange,
}: {
  detail: CharacterDetail;
  locked: boolean;
  onChange: (next: CharacterDetail) => void;
}) {
  const [player, setPlayerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const disabled = locked || busy;
  const fromRoster = Boolean(detail.rpc_character_id);
  const roster = detail.player_character;

  async function run(action: () => Promise<CharacterDetail>) {
    setBusy(true);
    setError("");
    try {
      onChange(await action());
      return true;
    } catch (err) {
      setError(loreErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (file.size > MAX_SKIN_BYTES || (file.type && file.type !== "image/png")) {
      setError("Upload a 64×64 or 64×32 Minecraft skin PNG.");
      return;
    }
    await run(() => uploadSkin(detail.id, file));
  }

  async function link(e: React.FormEvent) {
    e.preventDefault();
    const name = player.trim();
    if (!name) return;
    if (await run(() => setPlayer(detail.id, name))) setPlayerName("");
  }

  return (
    <Section title="Face">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <CharacterFace
          id={detail.id}
          name={detail.name}
          hasFace={detail.has_face}
          cacheKey={detail.updated_at}
          size={96}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">
              Minecraft player
            </span>
            {fromRoster ? (
              <>
                <p className="text-sm text-[var(--tfmc-cream)]">
                  {detail.player_name ? `Played by ${detail.player_name}` : "A player’s character"}
                  {roster ? ` as ${roster.name}` : ""}
                </p>
                <p className="text-xs text-[var(--tfmc-stone)]">
                  {roster
                    ? `From RPCharacters${rosterFacts(roster)}. The player stays linked to this character.`
                    : "From RPCharacters, but no longer on the roster."}
                </p>
              </>
            ) : detail.player_name ? (
              <p className="flex flex-wrap items-center gap-3 text-sm text-[var(--tfmc-cream)]">
                Played by {detail.player_name}
                {locked ? null : (
                  <button
                    type="button"
                    className={quietButtonClass}
                    disabled={disabled}
                    onClick={() => void run(() => setPlayer(detail.id, null))}
                  >
                    Unlink
                  </button>
                )}
              </p>
            ) : (
              <p className={mutedClass}>No player linked.</p>
            )}
            {locked || fromRoster ? null : (
              <form onSubmit={link} className="flex gap-2">
                <input
                  className={`${inputClass} min-w-0 flex-1 sm:max-w-64`}
                  value={player}
                  maxLength={16}
                  placeholder="Player name"
                  aria-label="Minecraft player name"
                  disabled={disabled}
                  onChange={(e) => setPlayerName(e.target.value)}
                />
                <button type="submit" className={buttonClass} disabled={disabled || !player.trim()}>
                  {detail.player_name ? "Change player" : "Link player"}
                </button>
              </form>
            )}
          </div>
          {locked ? null : (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tfmc-stone)]">Skin</span>
              <div className="flex flex-wrap items-center gap-3">
                <label className={`${buttonClass} cursor-pointer ${disabled ? "pointer-events-none opacity-50" : ""}`}>
                  {busy ? "Working…" : "Upload skin PNG"}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png"
                    className="sr-only"
                    disabled={disabled}
                    onChange={(e) => void upload(e.target.files?.[0])}
                  />
                </label>
                {detail.has_skin ? (
                  <button
                    type="button"
                    className={quietButtonClass}
                    disabled={disabled}
                    onClick={() => void run(() => clearSkin(detail.id))}
                  >
                    Remove uploaded skin
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-[var(--tfmc-stone)]">
                {fromRoster
                  ? "An uploaded skin’s face is shown before the skin the character wears in game."
                  : "An uploaded skin’s face is shown before the linked player’s head."}
              </p>
            </div>
          )}
          {error ? (
            <p className={errorClass} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

function rosterFacts(roster: PlayerCharacter): string {
  const facts = [roster.race, roster.class, roster.status === "DEAD" ? "dead" : null].filter(Boolean);
  return facts.length ? ` (${facts.join(", ")})` : "";
}
