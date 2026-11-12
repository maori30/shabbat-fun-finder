import { createServerFn } from "@tanstack/react-start";
import { allowRequest } from "@/lib/rate-limit";
import { areaLabel, roundCoord, type InsightKind } from "@/lib/insights";

export type InsightInput = {
  kind: InsightKind;
  areaLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
  vibe?: string | null;
  indoor?: string | null;
  freeOnly?: boolean | null;
  resultCount: number;
};

const KINDS = new Set(["ai", "itinerary", "manual", "open_now"]);
const VIBE_IDS = new Set(["water", "indoor", "nature", "create", "animals", "action"]);

/**
 * Save one anonymous search record. Never throws — if the table doesn't
 * exist yet (migration not run) the search still works normally.
 */
export async function recordInsight(i: InsightInput): Promise<void> {
  try {
    if (!KINDS.has(i.kind)) return;
    const lat = typeof i.lat === "number" && Number.isFinite(i.lat) ? roundCoord(i.lat) : null;
    const lng = typeof i.lng === "number" && Number.isFinite(i.lng) ? roundCoord(i.lng) : null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("search_insights" as never).insert({
      kind: i.kind,
      area: areaLabel(i.areaLabel),
      lat,
      lng,
      vibe: i.vibe && VIBE_IDS.has(i.vibe) ? i.vibe : null,
      indoor: i.indoor === "ממוזג" || i.indoor === "פתוח" ? i.indoor : null,
      free_only: i.freeOnly === true ? true : null,
      result_count: Math.max(0, Math.min(1000, Math.round(i.resultCount || 0))),
    } as never);
    if (error) console.warn("search_insights insert skipped:", error.message);
  } catch (e) {
    console.warn("search_insights unavailable", e);
  }
}

/** For searches that run in the browser (manual / "open now"). */
export const logSearch = createServerFn({ method: "POST" })
  .inputValidator((d: InsightInput) => d)
  .handler(async ({ data }): Promise<void> => {
    if (data.kind !== "manual" && data.kind !== "open_now") return;
    if (!(await allowRequest("insight", 30, 60_000))) return;
    await recordInsight(data);
  });
