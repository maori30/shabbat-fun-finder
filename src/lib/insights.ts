/**
 * Anonymous search insights: which areas/requests return few results, so the
 * admin knows where to add places. Stores no IP, no free text, and rounds
 * the location to ~5 km. Pure helpers (unit-tested with `node --test`).
 */

export type InsightKind = "ai" | "itinerary" | "manual" | "open_now";

export type InsightRow = {
  created_at: string;
  kind: InsightKind;
  area: string | null;
  lat: number | null;
  lng: number | null;
  vibe: string | null;
  indoor: string | null;
  free_only: boolean | null;
  result_count: number;
};

/** ~5.5 km grid — coarse enough not to pinpoint anyone. */
export function roundCoord(v: number): number {
  return Math.round(v * 20) / 20;
}

/** Keep a city name; drop "המיקום שלי" or anything that isn't a short place name. */
export function areaLabel(label: string | null | undefined): string | null {
  const t = (label ?? "").trim();
  if (!t || t === "המיקום שלי" || t.length > 40 || /\d{3,}/.test(t)) return null;
  return t;
}

export const LOW_RESULTS = 5;

export type AreaSummary = {
  area: string;
  searches: number;
  lowSearches: number;
  avgResults: number;
  /** Most common thing people asked for there (vibe / indoor / free). */
  topWants: string[];
};

const WANT_LABEL: Record<string, string> = {
  water: "מים",
  indoor: "ממוזג",
  nature: "טבע",
  create: "יצירה",
  animals: "חיות",
  action: "אקשן",
};

/** Group recent searches by area, worst-served first. */
export function summarizeInsights(rows: InsightRow[]): AreaSummary[] {
  const by = new Map<string, InsightRow[]>();
  for (const r of rows) {
    const key =
      r.area ?? (r.lat !== null && r.lng !== null ? `סביב ${r.lat}, ${r.lng}` : "לא ידוע");
    by.set(key, [...(by.get(key) ?? []), r]);
  }
  const out: AreaSummary[] = [];
  for (const [area, list] of by) {
    const low = list.filter((r) => r.result_count < LOW_RESULTS);
    const wants = new Map<string, number>();
    for (const r of low.length > 0 ? low : list) {
      const w = r.vibe
        ? (WANT_LABEL[r.vibe] ?? r.vibe)
        : r.indoor === "ממוזג"
          ? "ממוזג"
          : r.free_only
            ? "חינם"
            : null;
      if (w) wants.set(w, (wants.get(w) ?? 0) + 1);
    }
    out.push({
      area,
      searches: list.length,
      lowSearches: low.length,
      avgResults:
        Math.round((list.reduce((s, r) => s + r.result_count, 0) / list.length) * 10) / 10,
      topWants: [...wants.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([w]) => w),
    });
  }
  return out.sort(
    (a, b) =>
      b.lowSearches - a.lowSearches || a.avgResults - b.avgResults || b.searches - a.searches,
  );
}
