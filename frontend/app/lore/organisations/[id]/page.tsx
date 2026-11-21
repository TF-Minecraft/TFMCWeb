"use client";

import { use } from "react";

import { createEntity, getEntity, setOrganisationMembers, type SearchResult } from "@/lib/lore/api";
import AdminColumn from "../../../components/admin/AdminColumn";
import { inputClass, mutedClass } from "../../../components/admin/ui";
import {
  Backlinks,
  DetailHeader,
  Field,
  Notice,
  ReadField,
  ReadValue,
  RefLink,
  Section,
} from "../../../components/lore/DetailParts";
import HistoryList from "../../../components/lore/HistoryList";
import LinkedRoleList from "../../../components/lore/LinkedRoleList";
import LoreText from "../../../components/lore/LoreText";
import LoreTextEditor from "../../../components/lore/LoreTextEditor";
import RelationsEditor from "../../../components/lore/RelationsEditor";
import SaveBar from "../../../components/lore/SaveBar";
import { useEditMode } from "../../../components/lore/useEditMode";
import { useEntityEditor } from "../../../components/lore/useEntityEditor";

export default function OrganisationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const organisationId = Number(id);
  if (!Number.isSafeInteger(organisationId) || organisationId <= 0) {
    return (
      <AdminColumn>
        <Notice error>That faction or organisation doesn’t exist.</Notice>
      </AdminColumn>
    );
  }
  return <OrganisationEditor key={organisationId} id={organisationId} />;
}

function OrganisationEditor({ id }: { id: number }) {
  const editor = useEntityEditor("organisation", id);
  const [editing, setEditing] = useEditMode();
  const { detail } = editor;

  if (!detail) {
    return (
      <AdminColumn>
        {editor.loadError ? <Notice error>{editor.loadError}</Notice> : <Notice>Loading…</Notice>}
      </AdminColumn>
    );
  }

  const locked = !editing || Boolean(detail.deleted_at);

  async function refresh() {
    editor.replace(await getEntity("organisation", id));
  }

  async function done() {
    if (await editor.save()) setEditing(false);
  }

  async function createCharacter(label: string): Promise<SearchResult> {
    const made = await createEntity("character", { name: label });
    return { kind: "character", id: made.id, label: made.name, sublabel: "", status: made.status };
  }

  return (
    <AdminColumn>
      <DetailHeader
        kind="organisation"
        title={editor.value("name")}
        updatedAt={detail.updated_at}
        updatedBy={detail.updated_by_name}
        deletedAt={detail.deleted_at}
        onDelete={editor.remove}
        onRestore={editor.restore}
        edit={{ editing, onEdit: () => setEditing(true), onDone: () => void done(), saving: editor.saving }}
      />

      <Section title="Details">
        {locked ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadField label="Kind">
                <ReadValue text={editor.value("kind")} />
              </ReadField>
              <ReadField label="Game faction">
                <ReadValue text={editor.value("game_faction")} />
              </ReadField>
            </div>
            <ReadField label="Summary">
              <LoreText text={editor.value("summary")} />
            </ReadField>
            <ReadField label="Notes">
              <LoreText text={editor.value("notes")} />
            </ReadField>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label="Name">
              <input
                className={inputClass}
                value={editor.value("name")}
                maxLength={120}
                onChange={(e) => editor.set("name", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kind" hint="Free text, for example guild, house, cult or company.">
                <input
                  className={inputClass}
                  value={editor.value("kind")}
                  maxLength={60}
                  onChange={(e) => editor.set("kind", e.target.value)}
                />
              </Field>
              <Field label="Game faction" hint="The in-game faction this is tied to, if any.">
                <input
                  className={inputClass}
                  value={editor.value("game_faction")}
                  maxLength={120}
                  onChange={(e) => editor.set("game_faction", e.target.value)}
                />
              </Field>
            </div>
            <LoreTextEditor
              label="Summary"
              value={editor.value("summary")}
              onChange={(v) => editor.set("summary", v)}
              rows={3}
              maxLength={2000}
              placeholder="What they are, in a line or two."
            />
            <LoreTextEditor
              label="Notes"
              value={editor.value("notes")}
              onChange={(v) => editor.set("notes", v)}
              rows={8}
              maxLength={20000}
            />
          </div>
        )}
      </Section>

      <Section title="Members">
        <LinkedRoleList
          kind="character"
          items={detail.members}
          disabled={locked}
          empty="No members yet."
          placeholder="Add a character…"
          onCreate={createCharacter}
          onSave={async (links) =>
            editor.replace(
              await setOrganisationMembers(
                id,
                links.map((link) => ({ character_id: link.id, role: link.role })),
              ),
            )
          }
        />
      </Section>

      <Section title="Relations">
        <RelationsEditor
          sourceKind="organisation"
          sourceId={id}
          relations={detail.relations}
          disabled={locked}
          onChanged={refresh}
        />
      </Section>

      <Section title="Storylines">
        {detail.storylines.length === 0 ? (
          <p className={mutedClass}>Not in any storyline. Add it from a storyline’s page.</p>
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

      <Backlinks items={detail.backlinks} />
      <HistoryList kind="organisation" id={id} refreshKey={editor.historyKey} />

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
