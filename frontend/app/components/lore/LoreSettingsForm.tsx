"use client";

import { useMemo, useState } from "react";

import { loreErrorMessage, setMySettings, type LoreSettings, type NotifyMode } from "@/lib/lore/api";
import { supportedTimeZones, timeZoneChoices } from "@/lib/lore/calendar";
import { browserTimeZone } from "@/lib/lore/dates";
import { buttonClass, errorClass, inputClass, mutedClass } from "../admin/ui";
import { Field } from "./DetailParts";

const NOTIFY_LABEL: Record<NotifyMode, string> = {
  off: "Off",
  available: "Days I'm available",
  all: "All events",
};

/** Notification mode and time zone. The zone defaults to the browser's until saved. */
export default function LoreSettingsForm({
  settings,
  onSaved,
}: {
  settings: LoreSettings;
  onSaved: (saved: LoreSettings) => void;
}) {
  const browserZone = browserTimeZone();
  const [timezone, setTimezone] = useState(settings.timezone || browserZone);
  const [notify, setNotify] = useState<NotifyMode>(settings.notify_mode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const zones = useMemo(() => timeZoneChoices(timezone, supportedTimeZones()), [timezone]);
  const dirty = timezone !== (settings.timezone || "") || notify !== settings.notify_mode;

  async function save() {
    setBusy(true);
    setError("");
    try {
      onSaved(await setMySettings({ timezone, notify_mode: notify }));
      setSaved(true);
    } catch (err) {
      setError(loreErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Notifications"
        hint="Discord DMs when an event is scheduled, moved or cancelled. They start once the bot is updated."
      >
        <select
          className={inputClass}
          value={notify}
          disabled={busy}
          onChange={(e) => {
            setNotify(e.target.value as NotifyMode);
            setSaved(false);
          }}
        >
          {(Object.keys(NOTIFY_LABEL) as NotifyMode[]).map((mode) => (
            <option key={mode} value={mode}>
              {NOTIFY_LABEL[mode]}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Time zone"
        hint={
          settings.timezone
            ? "Times are shown in this zone, plus CET and EST."
            : `Not saved yet; using your browser's zone (${browserZone}).`
        }
      >
        <select
          className={inputClass}
          value={timezone}
          disabled={busy}
          onChange={(e) => {
            setTimezone(e.target.value);
            setSaved(false);
          }}
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={buttonClass} disabled={busy || !dirty} onClick={save}>
          Save settings
        </button>
        {saved && !dirty ? <span className="text-xs text-[var(--tfmc-mist)]">Saved.</span> : null}
      </div>
      {!settings.on_roster ? (
        <p className={mutedClass}>Saving settings or any availability puts you on the roster.</p>
      ) : null}
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
