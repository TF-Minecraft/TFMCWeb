"use client";

import LoadingSkeleton from "@/app/components/shared/LoadingSkeleton";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { createSubmission, checkSubmissionConflict, getCatalog, SkinsApiError } from "../../../lib/skins/api";
import type { SkinsCatalog } from "../../../lib/skins/catalog";
import { filterStaffCategories } from "../../../lib/skins/catalog";
import { DEV_CATALOG_ENTITLEMENTS, DEV_SESSION_SKIN_KINDS } from "../../../lib/skins/entitlementsDev";
import { setLastSubmissionId } from "../../../lib/skins/session";
import {
  ARMOR_SINGLE_SETS,
  ARMOR_TYPES,
  RANGED_3D_TOTAL_BYTES,
  armorTier,
  armorTierLabel,
  baseSetLabel,
  kindsForBaseSet,
} from "../../../lib/skins/baseSets";
import {
  firstAllowedKind,
  kindAllowed,
  kindsForTarget,
  rankForKind,
  sameTarget,
  type SkinTarget,
} from "../../../lib/skins/kindAccess";
import {
  assert3dPairBudgets,
  assertRanged3dBudget,
  assertTextureFile,
  expectedSizeForField,
  fileFieldsForKind,
  formatBytes,
  isBookKind,
  isGunKind,
  isLargeTextureKind,
  isModel3dKind,
  isModelField,
  isRanged3dKind,
  mcmetaAllowed,
  mcmetaField,
  pairBudgetHint,
  ranged3dTotalBytes,
  ARMOR_BODY_FIELDS,
  type SkinKind,
} from "../../../lib/skins/sizes";
import { NAME_STYLES, normalizePreviewHex, type NameStyle } from "../../../lib/skins/namePreview";
import FancyCheckbox from "./FancyCheckbox";
import FileSlot from "./FileSlot";
import KindPicker from "./KindPicker";
import SkinTargetPicker from "./SkinTargetPicker";
import ModelPreview from "./ModelPreview";
import ArmorPreview from "./ArmorPreview";
import NameColourPicker from "../shared/NameColourPicker";
import { DISPLAY_NAME_HINT, displayNameError } from "../../../lib/textValidation";
import { GRIP_Y_DEFAULT, GRIP_Y_MAX, GRIP_Y_MIN } from "../../../lib/skins/flatItemDisplay";
import { assertVanillaJavaBlockModelFile } from "../../../lib/skins/javaModel";

const MAX_SETS = ARMOR_TYPES.length;

function isFlatPreviewKind(kind: SkinKind): boolean {
  return (
    kind === "handheld" || kind === "large_handheld" || kind === "bow" || kind === "large_bow" || kind === "crossbow"
  );
}

type Props = {
  sessionToken: string;
  /** Staff curated lane — category/scroll required. */
  staff?: boolean;
  /** From redeem / player meta (fallback: catalog defaults). */
  nameColourStops?: number;
  max3dPairBytes?: number;
  skinKinds?: string[] | null;
  allowArmor3dHelmet?: boolean;
  /** Override locked colour picker message (e.g. meta not synced yet). */
  colourLockedMessage?: string;
  /** Shows the new skin once it's in. */
  onSubmitted: (id: string) => void;
};

type TierEntry = {
  /** Armour type (light, medium, …) of the metal line, or the single set id. */
  type: string;
  /** Display suffix for this set; empty means the default (Light Iron, …). */
  alias: string;
  /** When true, helmet is model+texture instead of 16×16 icon. */
  helmet3d: boolean;
  /** Staff only: scroll id for this set. */
  scroll: string;
  files: Record<string, File | null>;
};

const fieldLabel: Record<string, string> = {
  helmet: "Helmet icon",
  helmet_texture: "Helmet texture",
  helmet_model: "Helmet model",
  chestplate: "Chestplate icon",
  leggings: "Leggings icon",
  boots: "Boots icon",
  layer_1: "Layer 1",
  layer_2: "Layer 2",
  texture: "Texture",
  model: "Model",
  carry_model: "Carry model",
  reload_model: "Reload model",
  aim_model: "Aim model",
  pull_0: "Pull 0",
  pull_1: "Pull 1",
  pull_2: "Pull 2",
  charged: "Charged",
  pull_0_model: "Pull 0 model",
  pull_1_model: "Pull 1 model",
  pull_2_model: "Pull 2 model",
  charged_model: "Charged model",
  unsigned: "Unsigned cover",
  signed: "Signed cover",
};

function slotLabel(kind: SkinKind, field: string): string {
  if (field === "texture" && (kind === "bow" || kind === "large_bow" || kind === "crossbow")) {
    return "Standby";
  }
  if (field === "model" && isRanged3dKind(kind)) {
    return "Standby model";
  }
  return fieldLabel[field] || field;
}

function slotHint(kind: SkinKind, field: string): string {
  if (isModelField(field)) return "Java Block/Item JSON";
  const size = expectedSizeForField(kind, field);
  if (!size) return isRanged3dKind(kind) ? "PNG, any size · shared by every model" : "PNG, any size";
  return `${size.w}×${size.h} PNG`;
}

function acceptForField(field: string): string {
  return isModelField(field) ? "application/json,.json" : "image/png,.png";
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)] pt-6 first:border-t-0 first:pt-0">
      <h3 className="m-0 flex items-center gap-2.5 text-base font-semibold text-[var(--tfmc-cream)]">
        <span
          aria-hidden
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--tfmc-accent)_22%,var(--tfmc-forest))] text-xs text-[var(--tfmc-accent)]"
        >
          {n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function newTier(type: string): TierEntry {
  return { type, alias: "", helmet3d: false, scroll: "", files: {} };
}

export default function UploadForm({
  sessionToken,
  staff = false,
  nameColourStops,
  max3dPairBytes,
  skinKinds,
  allowArmor3dHelmet = false,
  colourLockedMessage,
  onSubmitted,
}: Props) {
  const resolvedKinds = skinKinds != null ? skinKinds : staff ? null : DEV_SESSION_SKIN_KINDS;
  const [target, setTarget] = useState<SkinTarget | null>(null);
  const [kind, setKind] = useState<SkinKind | null>(null);
  const canUseArmor3dHelmet = staff || allowArmor3dHelmet;
  const [tiers, setTiers] = useState<TierEntry[]>([]);
  /** Which added set (by type) the armor mannequin preview shows. */
  const [previewArmorTier, setPreviewArmorTier] = useState<string>("");
  const [itemName, setItemName] = useState("");
  const [applyName, setApplyName] = useState(true);
  const [colours, setColours] = useState<string[]>(["#ffffff"]);
  const [styles, setStyles] = useState<NameStyle[]>([]);
  const [gripY, setGripY] = useState(GRIP_Y_DEFAULT);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<SkinsCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [scroll, setScroll] = useState("");
  const [bookPreviewUrls, setBookPreviewUrls] = useState<{
    unsigned: string | null;
    signed: string | null;
  }>({ unsigned: null, signed: null });

  useEffect(() => {
    if (canUseArmor3dHelmet) return;
    setTiers((prev) => {
      if (!prev.some((t) => t.helmet3d)) return prev;
      return prev.map((t) => {
        if (!t.helmet3d) return t;
        const files = { ...t.files };
        delete files.helmet_model;
        delete files.helmet_texture;
        delete files[mcmetaField("helmet_texture")];
        return { ...t, helmet3d: false, files };
      });
    });
  }, [canUseArmor3dHelmet]);

  useEffect(() => {
    const unsigned = files.unsigned ? URL.createObjectURL(files.unsigned) : null;
    const signed = files.signed ? URL.createObjectURL(files.signed) : null;
    setBookPreviewUrls({ unsigned, signed });
    return () => {
      if (unsigned) URL.revokeObjectURL(unsigned);
      if (signed) URL.revokeObjectURL(signed);
    };
  }, [files.unsigned, files.signed]);

  useEffect(() => {
    let cancelled = false;
    setCatalogError(null);
    void getCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setCatalog(null);
        setCatalogError(
          err instanceof SkinsApiError ? err.message : err instanceof Error ? err.message : "Could not load catalog",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const catalogDefaults = catalog?.entitlements?.defaults;
  const entitlements = catalog?.entitlements?.groups?.length ? catalog.entitlements : DEV_CATALOG_ENTITLEMENTS;
  const resolvedColourStops =
    nameColourStops !== undefined ? nameColourStops : (catalogDefaults?.name_colour_stops ?? 0);
  const resolvedPairBytes =
    max3dPairBytes !== undefined && max3dPairBytes > 0
      ? max3dPairBytes
      : catalogDefaults?.max_3d_pair_bytes && catalogDefaults.max_3d_pair_bytes > 0
        ? catalogDefaults.max_3d_pair_bytes
        : process.env.NEXT_PUBLIC_CHARACTER_UI_DEV === "1"
          ? DEV_CATALOG_ENTITLEMENTS.defaults.max_3d_pair_bytes
          : 0;
  const pairHint = pairBudgetHint(resolvedPairBytes);

  /** Rank that unlocks a kind, or undefined when the player can already use it. */
  const lockedByKind = (k: SkinKind): string | undefined =>
    kindAllowed(k, resolvedKinds) ? undefined : (rankForKind(entitlements, k) ?? "Locked");
  const lockedByKinds = (kinds: readonly SkinKind[]): string | undefined =>
    kinds.length === 0 || kinds.some((k) => kindAllowed(k, resolvedKinds)) ? undefined : lockedByKind(kinds[0]!);

  const isArmor = kind === "armor_set";
  const isSingleSet = target?.type === "single";
  const metal = target?.type === "metal" ? target.metal : "";
  const lineLabel =
    target?.type === "metal"
      ? baseSetLabel(target.metal)
      : target?.type === "single"
        ? (ARMOR_SINGLE_SETS.find((s) => s.id === target.set)?.label ?? target.set)
        : "";
  const baseSet = target?.type === "item" ? target.baseSet : "";
  const fileFields = kind ? fileFieldsForKind(kind) : [];
  const staffCategories = catalog && kind ? filterStaffCategories(catalog.categories, kind) : [];
  const staffScrolls = catalog?.scrolls ?? [];

  const tierId = (entry: TierEntry) => (isSingleSet ? entry.type : armorTier(entry.type, metal));
  const tierLabel = (entry: TierEntry) => armorTierLabel(tierId(entry));

  const previewTierEntry = tiers.find((e) => e.type === previewArmorTier) ?? tiers[0] ?? null;

  useEffect(() => {
    if (!isArmor || tiers.length === 0) {
      setPreviewArmorTier("");
      return;
    }
    if (!tiers.some((e) => e.type === previewArmorTier)) {
      setPreviewArmorTier(tiers[0]!.type);
    }
  }, [isArmor, tiers, previewArmorTier]);

  function resetUploads() {
    setFiles({});
    setError(null);
    setCategory("");
    setScroll("");
  }

  function selectTarget(next: SkinTarget) {
    if (sameTarget(next, target)) return;
    setTarget(next);
    setKind(firstAllowedKind(next, resolvedKinds));
    setTiers(next.type === "single" ? [newTier(next.set)] : []);
    resetUploads();
  }

  function selectKind(next: SkinKind) {
    if (next === kind) return;
    setKind(next);
    resetUploads();
  }

  function setFile(field: string, file: File | null) {
    setFiles((prev) => ({ ...prev, [field]: file }));
  }

  function toggleType(type: string) {
    setError(null);
    setTiers((prev) => {
      if (prev.some((entry) => entry.type === type)) return prev.filter((entry) => entry.type !== type);
      if (prev.length >= MAX_SETS) return prev;
      // Keep sets in Light → Mage order.
      return [...prev, newTier(type)].sort((a, b) => ARMOR_TYPES.indexOf(a.type) - ARMOR_TYPES.indexOf(b.type));
    });
  }

  function updateTier(type: string, change: (entry: TierEntry) => TierEntry) {
    setTiers((prev) => prev.map((entry) => (entry.type === type ? change(entry) : entry)));
  }

  function setTierHelmet3d(type: string, helmet3d: boolean) {
    updateTier(type, (entry) => {
      const files = { ...entry.files };
      if (helmet3d) {
        delete files.helmet;
        delete files[mcmetaField("helmet")];
      } else {
        delete files.helmet_model;
        delete files.helmet_texture;
        delete files[mcmetaField("helmet_texture")];
      }
      return { ...entry, helmet3d, files };
    });
  }

  function setTierFile(type: string, field: string, file: File | null) {
    updateTier(type, (entry) => ({
      ...entry,
      files: { ...entry.files, [field]: file },
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!target || !kind) {
      setError(target ? "Choose a style" : "Choose what you're skinning");
      return;
    }
    if (!kindAllowed(kind, resolvedKinds)) {
      setError(`That style unlocks at ${lockedByKind(kind)}.`);
      return;
    }

    const name = itemName.trim();
    if (!name) {
      setError("Enter an item name.");
      return;
    }
    const nameErr = displayNameError(name, {
      minLen: 1,
      maxLen: 24,
      field: "item name",
    });
    if (nameErr) {
      setError(nameErr);
      return;
    }

    if (isArmor) {
      for (const entry of tiers) {
        const alias = entry.alias.trim();
        if (!alias) continue;
        const aliasErr = displayNameError(alias, {
          minLen: 1,
          maxLen: 32,
          field: `set name for ${tierLabel(entry)}`,
        });
        if (aliasErr) {
          setError(aliasErr);
          return;
        }
      }
    } else if (!baseSet || !kindsForBaseSet(baseSet).includes(kind)) {
      setError("Choose an item type");
      return;
    }

    if (isArmor && tiers.length < 1) {
      setError("Pick at least 1 armour set");
      return;
    }

    if (staff) {
      if (!category.trim()) {
        setError("Choose a shop category");
        return;
      }
      if (catalogError || !catalog) {
        setError(catalogError || "Catalog not loaded - wait or refresh");
        return;
      }
      if (staffCategories.length < 1) {
        setError("No matching shop categories in catalog for this kind");
        return;
      }
      if (isArmor) {
        const missing = tiers.filter((e) => !e.scroll.trim());
        if (missing.length) {
          setError(`Choose a scroll for each armour set (${missing.map(tierLabel).join(", ")})`);
          return;
        }
      } else if (!scroll.trim()) {
        setError("Choose a scroll");
        return;
      }
    }

    if (kind === "large_handheld") {
      if (!Number.isFinite(gripY) || gripY < GRIP_Y_MIN || gripY > GRIP_Y_MAX) {
        setError(`Grip must be between ${GRIP_Y_MIN} and ${GRIP_Y_MAX}`);
        return;
      }
    }

    const uploadFiles: Record<string, File> = {};

    /** Check one slot and add it (and its optional animation) to the upload. */
    async function addSlot(
      key: string,
      field: string,
      file: File | null | undefined,
      mcmeta: File | null | undefined,
      label: string,
    ) {
      if (!file) throw new Error(`Missing ${label}`);
      if (isModelField(field)) {
        await assertVanillaJavaBlockModelFile(file);
      } else {
        const animation = mcmetaAllowed(field) ? mcmeta : null;
        await assertTextureFile(file, expectedSizeForField(kind!, field), animation, label);
        if (animation) uploadFiles[mcmetaField(key)] = animation;
      }
      uploadFiles[key] = file;
    }

    try {
      if (isArmor) {
        for (const entry of tiers) {
          const helmetFields = entry.helmet3d ? (["helmet_model", "helmet_texture"] as const) : (["helmet"] as const);
          for (const field of [...helmetFields, ...ARMOR_BODY_FIELDS]) {
            await addSlot(
              `${tierId(entry)}_${field}`,
              field,
              entry.files[field],
              entry.files[mcmetaField(field)],
              `${tierLabel(entry)} ${fieldLabel[field] || field}`,
            );
          }
        }
        const h3d = tiers.filter((t) => t.helmet3d).map(tierId);
        assert3dPairBudgets(kind, uploadFiles, resolvedPairBytes, h3d);
      } else {
        for (const field of fileFields) {
          await addSlot(field, field, files[field], files[mcmetaField(field)], slotLabel(kind, field));
        }
        assert3dPairBudgets(kind, uploadFiles, resolvedPairBytes);
        assertRanged3dBudget(kind, uploadFiles);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "File validation failed");
      return;
    }

    if (colours.length > 0) {
      const normalized = colours.map((c) => normalizePreviewHex(c)).filter((c): c is string => Boolean(c));
      if (normalized.length !== colours.length) {
        setError("Each colour must be #RRGGBB or a legacy § code");
        return;
      }
    }

    setLoading(true);
    try {
      const check = await checkSubmissionConflict({
        sessionToken,
        display_name: name,
      });
      if (!check.ok) {
        const reasons = new Set(check.conflicts.flatMap((c) => c.reasons || []));
        if (reasons.has("display_name")) {
          setError(`You already have an active skin named "${name}". Choose a different item name.`);
        } else {
          setError("You already have an active skin that conflicts with this one. Choose a different item name.");
        }
        setLoading(false);
        return;
      }

      const result = await createSubmission({
        sessionToken,
        kind,
        display_name: name,
        base_set: isArmor ? null : baseSet,
        tiers: isArmor ? tiers.map(tierId) : undefined,
        tier_aliases: isArmor
          ? Object.fromEntries(tiers.map((entry) => [tierId(entry), entry.alias.trim() || tierLabel(entry)]))
          : undefined,
        helmet_3d_tiers: isArmor ? tiers.filter((e) => e.helmet3d).map(tierId) : undefined,
        grip_preset: kind === "large_handheld" ? gripY.toFixed(1) : null,
        add_name: applyName,
        name_colours: colours.length ? colours : undefined,
        name_styles: styles.length ? styles : undefined,
        category: staff ? category.trim() : undefined,
        scroll: staff && !isArmor ? scroll.trim() : undefined,
        tier_scrolls:
          staff && isArmor ? Object.fromEntries(tiers.map((entry) => [tierId(entry), entry.scroll.trim()])) : undefined,
        files: uploadFiles,
      });
      setLastSubmissionId(result.id);
      onSubmitted(result.id);
    } catch (err) {
      const message = err instanceof SkinsApiError ? err.message : err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "rounded-sm border border-[color-mix(in_srgb,var(--tfmc-cream)_25%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_40%,transparent)] px-3 py-2.5 text-[var(--tfmc-cream)] outline-none placeholder:text-[color-mix(in_srgb,var(--tfmc-mist)_60%,transparent)] focus:border-[var(--tfmc-accent)] disabled:opacity-60";

  function toggleStyle(style: NameStyle) {
    setStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]));
  }

  /** Upload card for one field; textures get an optional animation slot. */
  function slot(
    field: string,
    label: string,
    picked: Record<string, File | null>,
    pick: (field: string, file: File | null) => void,
  ) {
    return (
      <FileSlot
        key={field}
        label={label}
        hint={slotHint(kind!, field)}
        accept={acceptForField(field)}
        file={picked[field]}
        disabled={loading}
        onPick={(file) => pick(field, file)}
        animation={
          mcmetaAllowed(field)
            ? {
                file: picked[mcmetaField(field)],
                onPick: (file) => pick(mcmetaField(field), file),
                onClear: () => pick(mcmetaField(field), null),
              }
            : undefined
        }
      />
    );
  }

  const ranged3d = kind ? isRanged3dKind(kind) : false;
  const rangedTotal = ranged3d ? ranged3dTotalBytes(files) : 0;
  const styleKinds = target?.type === "item" ? kindsForTarget(target) : [];
  const detailsStep = target?.type === "item" ? 3 : 2;

  return (
    <div className="relative">
      {loading ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-sm bg-[color-mix(in_srgb,var(--tfmc-forest)_92%,transparent)] px-6 py-16"
          role="status"
          aria-live="polite"
        >
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--tfmc-cream)_25%,transparent)] border-t-[var(--tfmc-accent)]"
            aria-hidden
          />
          <p className="text-lg text-[var(--tfmc-cream)]">Submitting…</p>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="mt-8 flex w-full flex-col gap-6">
        <Step n={1} title="What are you skinning?">
          <SkinTargetPicker value={target} onChange={selectTarget} disabled={loading} lockedBy={lockedByKinds} />
        </Step>

        {target?.type === "item" ? (
          <Step n={2} title={`Style for ${baseSetLabel(target.baseSet)}`}>
            <KindPicker
              kinds={styleKinds}
              value={kind}
              onChange={selectKind}
              disabled={loading}
              lockedBy={lockedByKind}
            />
          </Step>
        ) : null}

        {kind ? (
          <Step n={detailsStep} title="Details">
            {staff ? (
              <fieldset className="flex flex-col gap-4 border-0 p-0">
                <legend className="text-sm font-medium text-[var(--tfmc-stone)]">Shop landing</legend>
                {catalogError ? (
                  <p className="text-sm text-[#e8a0a0]" role="alert">
                    {catalogError}
                  </p>
                ) : !catalog ? (
                  <LoadingSkeleton variant="form" label="Loading catalog…" />
                ) : (
                  <>
                    <label className="flex flex-col gap-2 text-left">
                      <span className="text-sm font-medium text-[var(--tfmc-stone)]">Category</span>
                      <select
                        value={category}
                        disabled={loading || staffCategories.length < 1}
                        onChange={(e) => setCategory(e.target.value)}
                        className={inputClass}
                        required
                      >
                        <option value="">Select category…</option>
                        {staffCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.id}
                          </option>
                        ))}
                      </select>
                      {staffCategories.length < 1 ? (
                        <span className="text-xs text-[#e8a0a0]">
                          No categories for this kind (catalog may be empty or only ps_*).
                        </span>
                      ) : null}
                    </label>
                    {!isArmor ? (
                      <label className="flex flex-col gap-2 text-left">
                        <span className="text-sm font-medium text-[var(--tfmc-stone)]">Scroll</span>
                        <select
                          value={scroll}
                          disabled={loading || staffScrolls.length < 1}
                          onChange={(e) => setScroll(e.target.value)}
                          className={inputClass}
                          required
                        >
                          <option value="">Select scroll…</option>
                          {staffScrolls.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label || s.id}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <p className="text-xs text-[var(--tfmc-mist)]">Choose a scroll on each armour set below.</p>
                    )}
                  </>
                )}
              </fieldset>
            ) : null}

            <label className="flex flex-col gap-2 text-left">
              <span className="text-sm font-medium text-[var(--tfmc-stone)]">Item name</span>
              <span className="text-xs text-[var(--tfmc-mist)]">
                {isArmor
                  ? `Base name before the set label (e.g. Norain becomes Norain ${
                      isSingleSet ? lineLabel : "Light Iron"
                    }). Spaces and capitals are fine.`
                  : "Shown in the armour shop."}{" "}
                Allowed: {DISPLAY_NAME_HINT}.
              </span>
              <input
                type="text"
                value={itemName}
                disabled={loading}
                onChange={(e) => setItemName(e.target.value)}
                className={inputClass}
                maxLength={24}
                placeholder="Blue Knight"
              />
              {itemName.trim() &&
              displayNameError(itemName, {
                minLen: 1,
                maxLen: 24,
                field: "item name",
              }) ? (
                <span className="text-xs text-[#e8a0a0]">
                  {displayNameError(itemName, {
                    minLen: 1,
                    maxLen: 24,
                    field: "item name",
                  })}
                </span>
              ) : null}
            </label>

            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--tfmc-cream)]">
              <FancyCheckbox checked={applyName} disabled={loading} onChange={setApplyName} />
              <span>
                Rename the item to this name
                <span className="mt-0.5 block text-xs text-[var(--tfmc-mist)]">
                  When off, the item keeps its own name.
                </span>
              </span>
            </label>

            <fieldset className="flex flex-col gap-4 border-0 p-0">
              <legend className="sr-only">Name colours and styles</legend>

              <NameColourPicker
                colours={colours}
                onChange={setColours}
                previewText={itemName.trim() || "Preview"}
                maxStops={resolvedColourStops}
                disabled={loading}
                previewStyles={styles}
                onError={setError}
                lockedMessage={colourLockedMessage || "Name colours require a donator rank"}
              />

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[var(--tfmc-stone)]">Styles</span>
                <div className="flex flex-wrap gap-3">
                  {NAME_STYLES.map((s) => (
                    <label
                      key={s}
                      className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--tfmc-cream)]"
                    >
                      <FancyCheckbox
                        checked={styles.includes(s)}
                        disabled={loading}
                        onChange={() => toggleStyle(s)}
                        className="mt-0"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>

            {kind === "large_handheld" ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-[var(--tfmc-stone)]">Grip height</legend>
                <label className="flex items-center gap-3 text-sm text-[var(--tfmc-cream)]">
                  <span className="shrink-0 text-xs text-[var(--tfmc-mist)]">Low</span>
                  <input
                    type="range"
                    min={GRIP_Y_MIN}
                    max={GRIP_Y_MAX}
                    step={0.1}
                    value={gripY}
                    disabled={loading}
                    onChange={(e) => setGripY(Number(e.target.value))}
                    className="min-w-0 flex-1 accent-[var(--tfmc-accent)]"
                    aria-label="Grip height"
                  />
                  <span className="shrink-0 text-xs text-[var(--tfmc-mist)]">High</span>
                  <span className="w-10 shrink-0 tabular-nums text-xs text-[var(--tfmc-cream)]">
                    {gripY.toFixed(1)}
                  </span>
                </label>
              </fieldset>
            ) : null}
          </Step>
        ) : null}

        {kind ? (
          <Step n={detailsStep + 1} title={isArmor ? `${lineLabel} armour` : "Files"}>
            <p className="m-0 text-xs text-[var(--tfmc-mist)]">
              Any texture except armour layers can be animated: add its Minecraft <code>.mcmeta</code> and stack the
              frames in the PNG
              {isLargeTextureKind(kind) ? " (each frame 32×32)" : ""}.
            </p>
            {pairHint && (isModel3dKind(kind) || isGunKind(kind) || isArmor) ? (
              <p className="m-0 text-sm text-[var(--tfmc-mist)]">{pairHint}</p>
            ) : null}
            {ranged3d ? (
              <p
                className={`m-0 text-sm ${rangedTotal > RANGED_3D_TOTAL_BYTES ? "text-[#e8a0a0]" : "text-[var(--tfmc-mist)]"}`}
                aria-live="polite"
              >
                All files together: {formatBytes(rangedTotal)} of {formatBytes(RANGED_3D_TOTAL_BYTES)}
              </p>
            ) : null}

            {isArmor ? (
              <fieldset className="flex flex-col gap-4 border-0 p-0">
                {isSingleSet ? (
                  <p className="m-0 text-xs text-[var(--tfmc-mist)]">
                    One set: a helmet, chestplate, leggings, boots and both layers.
                  </p>
                ) : (
                  <>
                    <legend className="sr-only">Armour sets</legend>
                    <p className="m-0 text-xs text-[var(--tfmc-mist)]">
                      Pick up to {MAX_SETS} sets, all in {lineLabel}. Light, medium and heavy can each have their own
                      look, or skin just one. Each set needs a helmet, chestplate, leggings, boots and both layers.
                    </p>
                    <div role="group" aria-label="Set types" className="flex flex-wrap gap-2">
                      {ARMOR_TYPES.map((type) => {
                        const on = tiers.some((entry) => entry.type === type);
                        return (
                          <button
                            key={type}
                            type="button"
                            aria-pressed={on}
                            disabled={loading}
                            onClick={() => toggleType(type)}
                            className={`rounded-sm border px-3 py-1.5 text-sm transition ${
                              on
                                ? "border-[var(--tfmc-accent)] bg-[color-mix(in_srgb,var(--tfmc-accent)_20%,var(--tfmc-forest))] text-[var(--tfmc-cream)]"
                                : "border-[color-mix(in_srgb,var(--tfmc-cream)_20%,transparent)] text-[var(--tfmc-mist)] hover:border-[var(--tfmc-accent)] hover:text-[var(--tfmc-cream)]"
                            }`}
                          >
                            {on ? "✓ " : "+ "}
                            {armorTierLabel(armorTier(type, metal))}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {tiers.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {tiers.map((entry) => {
                      const helmetFields = entry.helmet3d
                        ? (["helmet_model", "helmet_texture"] as const)
                        : (["helmet"] as const);
                      const tierFields = [...helmetFields, ...ARMOR_BODY_FIELDS];
                      return (
                        <div
                          key={entry.type}
                          className="flex flex-col gap-3 rounded-sm border border-[color-mix(in_srgb,var(--tfmc-cream)_15%,transparent)] p-4"
                        >
                          <span className="text-sm font-semibold text-[var(--tfmc-cream)]">{tierLabel(entry)}</span>
                          <label className="flex flex-col gap-2 text-left">
                            <span className="text-sm font-medium text-[var(--tfmc-stone)]">Set name (optional)</span>
                            <input
                              type="text"
                              value={entry.alias}
                              disabled={loading}
                              maxLength={32}
                              placeholder={tierLabel(entry)}
                              onChange={(e) =>
                                updateTier(entry.type, (t) => ({
                                  ...t,
                                  alias: e.target.value,
                                }))
                              }
                              className={inputClass}
                            />
                            <span className="text-xs text-[var(--tfmc-mist)]">
                              In-game: {(itemName.trim() || "Name") + " " + (entry.alias.trim() || tierLabel(entry))}{" "}
                              Chestplate
                            </span>
                            {entry.alias.trim() &&
                            displayNameError(entry.alias, {
                              minLen: 1,
                              maxLen: 32,
                              field: "set name",
                            }) ? (
                              <span className="text-xs text-[#e8a0a0]">
                                {displayNameError(entry.alias, {
                                  minLen: 1,
                                  maxLen: 32,
                                  field: "set name",
                                })}
                              </span>
                            ) : null}
                          </label>
                          {staff ? (
                            <label className="flex flex-col gap-2 text-left">
                              <span className="text-sm font-medium text-[var(--tfmc-stone)]">Scroll</span>
                              <select
                                value={entry.scroll}
                                disabled={loading || staffScrolls.length < 1}
                                onChange={(e) =>
                                  updateTier(entry.type, (t) => ({
                                    ...t,
                                    scroll: e.target.value,
                                  }))
                                }
                                className={inputClass}
                                required
                              >
                                <option value="">Select scroll…</option>
                                {staffScrolls.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.label || s.id}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                          {canUseArmor3dHelmet ? (
                            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--tfmc-cream)]">
                              <FancyCheckbox
                                checked={entry.helmet3d}
                                disabled={loading}
                                onChange={(checked) => setTierHelmet3d(entry.type, checked)}
                                className="mt-0"
                              />
                              3D Helmet
                            </label>
                          ) : null}
                          <div className="grid gap-3 sm:grid-cols-2">
                            {tierFields.map((field) =>
                              slot(field, fieldLabel[field] || field, entry.files, (f, file) =>
                                setTierFile(entry.type, f, file),
                              ),
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {previewTierEntry ? (
                      <div className="flex flex-col gap-2 rounded-sm border border-[color-mix(in_srgb,var(--tfmc-cream)_15%,transparent)] p-4">
                        {tiers.length > 1 ? (
                          <label className="flex flex-col gap-1 text-left sm:max-w-xs">
                            <span className="text-sm font-medium text-[var(--tfmc-stone)]">Preview set</span>
                            <select
                              value={previewTierEntry.type}
                              disabled={loading}
                              onChange={(e) => setPreviewArmorTier(e.target.value)}
                              className={inputClass}
                            >
                              {tiers.map((e) => (
                                <option key={e.type} value={e.type}>
                                  {tierLabel(e)}
                                  {e.alias.trim() && e.alias.trim() !== tierLabel(e) ? ` (${e.alias.trim()})` : ""}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        <ArmorPreview
                          layer1File={previewTierEntry.files.layer_1 ?? null}
                          layer2File={previewTierEntry.files.layer_2 ?? null}
                          helmet3d={previewTierEntry.helmet3d}
                          helmetModelFile={previewTierEntry.files.helmet_model ?? null}
                          helmetTextureFile={previewTierEntry.files.helmet_texture ?? null}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--tfmc-mist)]">No sets picked yet.</p>
                )}
              </fieldset>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {fileFields.map((field) => slot(field, slotLabel(kind, field), files, setFile))}
                </div>
                {isBookKind(kind) ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-4">
                      {(
                        [
                          ["unsigned", "Unsigned", bookPreviewUrls.unsigned],
                          ["signed", "Signed", bookPreviewUrls.signed],
                        ] as const
                      ).map(([key, label, url]) => (
                        <div key={key} className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-[var(--tfmc-stone)]">{label}</span>
                          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-sm border border-[color-mix(in_srgb,var(--tfmc-cream)_20%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_70%,black)]">
                            {url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={url}
                                alt={`${label} cover preview`}
                                className="h-full w-full object-contain object-top [image-rendering:pixelated]"
                              />
                            ) : (
                              <span className="px-2 text-center text-[10px] text-[var(--tfmc-mist)]">No file</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      {(["unsigned", "signed"] as const).map((cover) =>
                        files[cover] ? (
                          <div key={cover}>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--tfmc-stone)]">
                              {cover === "unsigned" ? "Unsigned" : "Signed"} 3D
                            </p>
                            <ModelPreview
                              kind="book"
                              textureFile={files[cover]}
                              flatMcmeta={{
                                texture: files[mcmetaField(cover)] ?? null,
                              }}
                            />
                          </div>
                        ) : null,
                      )}
                    </div>
                  </div>
                ) : null}
                {isModel3dKind(kind) || isGunKind(kind) || isFlatPreviewKind(kind) || ranged3d ? (
                  <ModelPreview
                    modelFile={isModel3dKind(kind) ? (files.model ?? null) : null}
                    textureFile={files.texture ?? null}
                    textureMcmetaFile={files[mcmetaField("texture")] ?? null}
                    gunModels={
                      isGunKind(kind)
                        ? {
                            carry: files.carry_model ?? null,
                            reload: files.reload_model ?? null,
                            aim: files.aim_model ?? null,
                          }
                        : undefined
                    }
                    frameModels={
                      ranged3d
                        ? {
                            texture: files.model ?? null,
                            pull_0: files.pull_0_model ?? null,
                            pull_1: files.pull_1_model ?? null,
                            pull_2: files.pull_2_model ?? null,
                            charged: files.charged_model ?? null,
                          }
                        : undefined
                    }
                    flatTextureFile={isFlatPreviewKind(kind) ? (files.texture ?? null) : null}
                    flatFrames={
                      isFlatPreviewKind(kind)
                        ? {
                            texture: files.texture ?? null,
                            pull_0: files.pull_0 ?? null,
                            pull_1: files.pull_1 ?? null,
                            pull_2: files.pull_2 ?? null,
                            charged: files.charged ?? null,
                          }
                        : undefined
                    }
                    flatMcmeta={
                      isFlatPreviewKind(kind)
                        ? {
                            texture: files[mcmetaField("texture")] ?? null,
                            pull_0: files[mcmetaField("pull_0")] ?? null,
                            pull_1: files[mcmetaField("pull_1")] ?? null,
                            pull_2: files[mcmetaField("pull_2")] ?? null,
                            charged: files[mcmetaField("charged")] ?? null,
                          }
                        : undefined
                    }
                    gripY={kind === "large_handheld" ? gripY : null}
                    kind={kind}
                  />
                ) : null}
              </div>
            )}
          </Step>
        ) : target && !kind ? (
          <p className="text-sm text-[var(--tfmc-mist)]">
            {lockedByKinds(kindsForTarget(target))
              ? `Skins for this unlock at ${lockedByKinds(kindsForTarget(target))}.`
              : "Choose a style to continue."}
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-[#e8a0a0]" role="alert">
            {error}
          </p>
        ) : null}

        {kind ? (
          <>
            <p className="text-sm text-[var(--tfmc-mist)]">
              {staff
                ? "Staff uploads auto-approve and land in the curated shop pack (no Discord review)."
                : "You'll get a Discord DM within 5 minutes confirming it's in review."}
            </p>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-sm bg-[var(--tfmc-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--tfmc-forest-deep)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Uploading…" : "Submit"}
            </button>
          </>
        ) : null}
      </form>
    </div>
  );
}
