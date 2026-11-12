/**
 * Client-side filters applied to every result list (Google, local, AI).
 * Pure functions with type-only imports so they can be unit-tested with
 * `node --test` directly.
 */
import type { PlaceResult } from "./places.functions";

export type EnvFilter = "all" | "ממוזג" | "פתוח" | "משולב";

export type ResultFilters = {
  shabbatOnly: boolean;
  age: number | "";
  env: EnvFilter;
};

type Filterable = Pick<PlaceResult, "openShabbat" | "saturdayHours" | "ageRange" | "environment">;

/** true = known open on Shabbat, false = known closed, null = unknown. */
export function shabbatStatus(p: Filterable): boolean | null {
  if (p.openShabbat === true || p.saturdayHours) return true;
  if (p.openShabbat === false) return false;
  return null;
}

/**
 * Does a place pass the filters? Places with *unknown* data are kept (and
 * marked "לא אומת" on the card) — only places we know don't match are hidden,
 * otherwise most Google results would disappear.
 */
export function matchesFilters(p: Filterable, f: ResultFilters): boolean {
  if (f.shabbatOnly && shabbatStatus(p) === false) return false;
  if (f.age !== "" && p.ageRange && (f.age < p.ageRange.min || f.age > p.ageRange.max))
    return false;
  if (f.env !== "all" && p.environment && p.environment !== f.env) {
    // A mixed (indoor + outdoor) place satisfies both "ממוזג" and "פתוח".
    if (!(p.environment === "משולב" && f.env !== "משולב")) return false;
  }
  return true;
}

/**
 * Filter and, when "Shabbat only" is on, move verified-open places ahead of
 * unverified ones while keeping the incoming order (distance / AI rank)
 * inside each group.
 */
export function applyFilters<T extends Filterable>(list: T[], f: ResultFilters): T[] {
  const kept = list.filter((p) => matchesFilters(p, f));
  if (!f.shabbatOnly) return kept;
  const verified = kept.filter((p) => shabbatStatus(p) === true);
  const unknown = kept.filter((p) => shabbatStatus(p) !== true);
  return [...verified, ...unknown];
}
