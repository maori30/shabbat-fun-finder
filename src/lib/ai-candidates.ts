/**
 * How the smart search turns a parsed request into a list of places:
 * which Google searches to run, which results to keep, and in what order.
 * Pure (the only runtime import is the dependency-free geo helper) so it can
 * be unit-tested with `node --test`.
 */
import type { PlaceResult } from "./places.functions";
import { distanceKm } from "./geo.ts";

export type CandidateCriteria = {
  ages: number[];
  freeOnly: boolean;
  indoorPreference: "ממוזג" | "פתוח" | "לא משנה";
  shabbatOnly: boolean;
  keywords: string[];
  /** Max family budget in ₪, if the parent set one. */
  budget?: number | null;
};

// Types that are usually free (or free to enter).
export const FREE_HINT_TYPES = new Set([
  "park",
  "national_park",
  "state_park",
  "playground",
  "dog_park",
  "library",
  "community_center",
  "botanical_garden",
  "shopping_mall",
  "beach",
  "tourist_attraction",
  "observation_deck",
  "cultural_landmark",
  "historical_place",
  "plaza",
  "hiking_area",
  "marina",
  "market",
  "athletic_field",
  "skateboard_park",
  "sports_complex",
  "cultural_center",
  "art_gallery",
  "visitor_center",
  "monument",
  "farm",
  "garden",
  "picnic_ground",
  "scenic_lookout",
]);

export const FREE_NAME_HINT =
  /פארק|גן ?שעשועים|גן ציבורי|גינה|טיילת|חוף|כיכר|ספריי?ה|מרכז קהילתי|מתנ"?ס|שוק|תצפית|יער|נחל|מפל|מגרש|סקייט|park|playground|beach|promenade|library|square|market|trail/i;

export const FREE_EXTRA_QUERIES = ["גן שעשועים", "פארק ציבורי", "טיילת", "ספרייה עירונית"];

/** Good Google Maps searches for an indoor (air-conditioned) outing with kids. */
export const INDOOR_EXTRA_QUERIES = ["משחקייה לילדים", "מוזיאון ילדים", "פארק טרמפולינות"];

/**
 * Words that describe a *quality* rather than a kind of place. Searching
 * Google for "מקום ממוזג" returns air-conditioner shops, so these are dropped
 * from keywords (the preference itself is applied as a filter instead).
 */
const NON_PLACE_KEYWORD =
  /^(מקום|משהו|פעילות|אטרקציה|אטרקציות|בילוי)?\s*(ממוזג(ת|ים|ות)?|בפנים|מקורה|בחוץ|פתוח|לילדים|לשבת|בשבת|זול|חינם|בחינם|משפחתי|קרוב)(\s+(לילדים|בשבת|לשבת))?$/;

export function cleanKeywords(keywords: string[]): string[] {
  return keywords
    .map((k) => k.trim())
    .filter((k) => k.length >= 2 && !NON_PLACE_KEYWORD.test(k))
    .slice(0, 3);
}

/**
 * Which searches to run. The broad type-based sweep ("") always runs —
 * it's what finds play centers, museums, zoos etc. Keywords are extras.
 */
export function planQueries(c: CandidateCriteria): string[] {
  const queries = ["", ...cleanKeywords(c.keywords)];
  if (c.freeOnly) queries.push(...FREE_EXTRA_QUERIES.slice(0, 2));
  else if (c.indoorPreference === "ממוזג") queries.push(...INDOOR_EXTRA_QUERIES.slice(0, 2));
  return Array.from(new Set(queries)).slice(0, 4);
}

function envMatches(p: PlaceResult, pref: CandidateCriteria["indoorPreference"]) {
  if (pref === "לא משנה") return true;
  return p.environment === pref || p.environment === "משולב";
}

const isFreeish = (p: PlaceResult) =>
  p.priceLevel === "FREE" ||
  p.types.some((t) => FREE_HINT_TYPES.has(t)) ||
  FREE_NAME_HINT.test(p.name);

/** Unknown price passes; only places Google marks as expensive are dropped. */
const fitsBudget = (p: PlaceResult, budget: number) =>
  budget >= 300
    ? p.priceLevel !== "VERY_EXPENSIVE"
    : p.priceLevel !== "EXPENSIVE" && p.priceLevel !== "VERY_EXPENSIVE";

/**
 * Keep places inside the radius, then narrow by Shabbat / ages / indoor /
 * free — each step only applies if enough places survive it (otherwise a
 * strict filter would leave the parent with nothing). Sorted best-first.
 */
export function selectCandidates(
  found: PlaceResult[],
  c: CandidateCriteria,
  origin: { lat: number; lng: number },
  radiusKm: number,
  minKeep = 4,
  /** Places found by the parent's own keywords/vibe — ranked higher. */
  boostIds: ReadonlySet<string> = new Set(),
): PlaceResult[] {
  const soft = (list: PlaceResult[], pred: (p: PlaceResult) => boolean) => {
    const kept = list.filter(pred);
    return kept.length >= minKeep ? kept : list;
  };

  let list = found.filter((p) => distanceKm(origin, p) <= radiusKm);
  if (c.shabbatOnly) list = soft(list, (p) => p.openShabbat !== false);
  if (c.ages.length > 0) {
    const minAge = Math.min(...c.ages);
    const maxAge = Math.max(...c.ages);
    list = soft(list, (p) => !p.ageRange || (p.ageRange.min <= maxAge && p.ageRange.max >= minAge));
  }
  if (c.indoorPreference !== "לא משנה") list = soft(list, (p) => envMatches(p, c.indoorPreference));
  if (c.freeOnly) list = soft(list, isFreeish);
  else if (c.budget) list = soft(list, (p) => fitsBudget(p, c.budget!));

  const score = (p: PlaceResult) => {
    let s = 0;
    if (p.openShabbat === true || p.saturdayHours) s += 3;
    if (c.indoorPreference !== "לא משנה" && p.environment === c.indoorPreference) s += 3;
    else if (c.indoorPreference !== "לא משנה" && p.environment === "משולב") s += 1.5;
    if (
      p.ageRange &&
      c.ages.length > 0 &&
      c.ages.every((a) => a >= p.ageRange!.min && a <= p.ageRange!.max)
    )
      s += 1.5;
    if (p.rating) s += (p.rating - 3.5) * Math.log10(1 + (p.userRatingCount ?? 0));
    if (boostIds.has(p.id)) s += 2;
    if (c.freeOnly && isFreeish(p)) s += 1;
    if (p.isSoftDemoted) s -= 3;
    s -= distanceKm(origin, p) / 10; // ~1 point per 10 km
    return s;
  };
  return [...list].sort((a, b) => score(b) - score(a));
}

/** AI picks first (in AI order), then the remaining candidates. */
export function mergePicks(pickIds: string[], candidates: PlaceResult[], max = 40): PlaceResult[] {
  const byId = new Map(candidates.map((p) => [p.id, p]));
  const out: PlaceResult[] = [];
  for (const id of pickIds) {
    const p = byId.get(id);
    if (p && !out.includes(p)) out.push(p);
  }
  for (const p of candidates) {
    if (out.length >= max) break;
    if (!out.includes(p)) out.push(p);
  }
  return out;
}
