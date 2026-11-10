/**
 * The sample war the backend builds (`backend/scripts/seed_war_history.py
 * --write-fixture`), typed. Tests and the page test render from it, so the
 * pages can be checked without SimpleFactions.
 */

import sample from "./sampleWar.json";
import type { BattleReport, WarListResponse, WarPageModel } from "./types";

export const sampleWarList = sample.list as unknown as WarListResponse;
export const sampleActiveWar = sample.active as unknown as WarPageModel;
export const sampleEndedWar = sample.ended as unknown as WarPageModel;
export const sampleBackfilledWar = sample.backfill as unknown as WarPageModel;
export const sampleBattleReport = sample.battle as unknown as BattleReport;
