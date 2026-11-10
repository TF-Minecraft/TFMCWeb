"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { formatCount, SIDE_LABEL } from "@/lib/wars/format";
import { casualtyChartGeometry, casualtySeries } from "@/lib/wars/math";
import type { WarBattle, WarSide } from "@/lib/wars/types";

import { Swatch, sideVar } from "./WarUi";

const MARGIN = { top: 12, right: 12, bottom: 22, left: 40 };

/** Drawn at the container's own pixel width, so labels stay 11px on a phone and a wide screen alike. */
function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(280, Math.round(entry.contentRect.width)));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
const SIDES: WarSide[] = ["attacker", "defender"];

/**
 * Deaths so far per side, battle by battle (step lines), and regiments lost in
 * each battle (paired bars). Geometry comes from `lib/wars/math.ts`; this only
 * places it. The battle ledger above is the table view of the same numbers.
 */
export default function WarCasualtyChart({ battles, names }: { battles: WarBattle[]; names: Record<WarSide, string> }) {
  const series = useMemo(() => casualtySeries(battles), [battles]);
  const { ref, width } = useWidth(640);
  const BOX = useMemo(
    () => ({ ...MARGIN, width, height: Math.round(Math.min(300, Math.max(220, width * 0.4))) }),
    [width],
  );
  const geometry = useMemo(() => casualtyChartGeometry(series, BOX), [series, BOX]);
  const [hover, setHover] = useState<number | null>(null);
  if (!series.labels.length) return null;
  const slot = (BOX.width - BOX.left - BOX.right) / series.labels.length;
  const hovered = hover;

  return (
    <figure>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--tfmc-stone)]">
        {SIDES.map((side) => (
          <span key={side} className="inline-flex items-center gap-2">
            <Swatch color={sideVar(side)} className="h-[3px] w-5" />
            {names[side]} ({SIDE_LABEL[side].toLowerCase()})
          </span>
        ))}
      </div>
      <div ref={ref} className="relative mt-3">
        <svg
          viewBox={`0 0 ${BOX.width} ${BOX.height}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label="Deaths so far per side after each battle, and regiments lost in each battle"
          onMouseLeave={() => setHover(null)}
        >
          {geometry.yTicks.map((tick) => (
            <g key={`y${tick.value}`}>
              <line
                x1={BOX.left}
                x2={BOX.width - BOX.right}
                y1={tick.y}
                y2={tick.y}
                stroke="color-mix(in srgb, var(--tfmc-cream) 10%, transparent)"
              />
              <text x={BOX.left - 6} y={tick.y + 4} textAnchor="end" className="fill-[var(--tfmc-mist)] text-[11px]">
                {formatCount(tick.value)}
              </text>
            </g>
          ))}
          <text x={BOX.left} y={BOX.top - 2} className="fill-[var(--tfmc-mist)] text-[11px]">
            Deaths so far
          </text>
          {hovered !== null ? (
            <rect
              x={BOX.left + slot * hovered}
              y={BOX.top}
              width={slot}
              height={geometry.barBottom - BOX.top}
              fill="color-mix(in srgb, var(--tfmc-cream) 6%, transparent)"
            />
          ) : null}
          {SIDES.map((side) => (
            <path
              key={side}
              d={geometry.steps[side]}
              fill="none"
              stroke={sideVar(side)}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          ))}
          {SIDES.map((side) =>
            geometry.points[side].map((point, i) => (
              <circle
                key={`${side}${i}`}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={sideVar(side)}
                stroke="var(--tfmc-forest-deep)"
                strokeWidth={2}
              />
            )),
          )}
          <line
            x1={BOX.left}
            x2={BOX.width - BOX.right}
            y1={geometry.barBottom}
            y2={geometry.barBottom}
            stroke="color-mix(in srgb, var(--tfmc-cream) 18%, transparent)"
          />
          <text x={BOX.left} y={geometry.barTop - 2} className="fill-[var(--tfmc-mist)] text-[11px]">
            Regiments lost
          </text>
          {geometry.barTicks
            .filter((tick) => tick.value > 0)
            .map((tick) => (
              <text
                key={`b${tick.value}`}
                x={BOX.left - 6}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-[var(--tfmc-mist)] text-[11px]"
              >
                {tick.value}
              </text>
            ))}
          {geometry.bars.map((bar) => (
            <rect
              key={`${bar.side}${bar.x}`}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={Math.max(0, bar.height)}
              rx={Math.min(2, bar.width / 2)}
              fill={sideVar(bar.side)}
            />
          ))}
          {geometry.xLabels.map((label) => (
            <text
              key={`x${label.x}`}
              x={label.x}
              y={BOX.height - 6}
              textAnchor="middle"
              className="fill-[var(--tfmc-mist)] text-[11px]"
            >
              {label.label}
            </text>
          ))}
          {series.labels.map((label, i) => (
            <rect
              key={`hit${i}`}
              x={BOX.left + slot * i}
              y={BOX.top}
              width={slot}
              height={BOX.height - BOX.top}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
            >
              <title>
                {`${label === "R" ? "Raid" : `Battle ${label}`}: ${names.attacker} lost ${series.perBattle.attacker[i]}, ${names.defender} lost ${series.perBattle.defender[i]}`}
              </title>
            </rect>
          ))}
        </svg>
        {hovered !== null ? (
          <div className="pointer-events-none absolute right-0 top-0 rounded-[6px] border border-[color-mix(in_srgb,var(--tfmc-cream)_15%,transparent)] bg-[var(--tfmc-forest-deep)] px-3 py-2 text-xs text-[var(--tfmc-stone)] shadow-lg">
            <p className="font-semibold text-[var(--tfmc-cream)]">
              {series.labels[hovered] === "R" ? "Raid" : `Battle ${series.labels[hovered]}`}
            </p>
            {SIDES.map((side) => (
              <p key={side} className="flex items-center gap-1.5">
                <Swatch color={sideVar(side)} className="h-2 w-2" />
                {names[side]}: {series.perBattle[side][hovered]} fell ({series.cumulative[side][hovered]} so far)
                {series.regiments[side][hovered] != null ? `, ${series.regiments[side][hovered]} regiments` : ""}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <figcaption className="mt-2 text-xs text-[var(--tfmc-mist)]">
        Battles in order along the bottom. R marks a raid, which records no regiment losses.
      </figcaption>
    </figure>
  );
}
