import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { geocodeCity } from "@/lib/places.functions";
import { resolveCityName, CITY_COORDS } from "@/lib/geo";
import { allowRequest } from "@/lib/rate-limit";

export type SuggestionInput = {
  name: string;
  city: string;
  description?: string;
  openShabbat: boolean | null;
  environment: "ממוזג" | "פתוח" | "משולב" | null;
  minAge: number | null;
  maxAge: number | null;
  stroller_accessible: boolean;
  changing_table: boolean;
  easy_parking: boolean;
  /** Honeypot — real users never fill it. */
  website?: string;
};

const clampAge = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(18, Math.round(v))) : null;

/**
 * Saves a parent's suggestion (pending admin approval). Runs on the server so
 * we can geocode the city — without coordinates an approved suggestion could
 * never be matched to a search radius — and so we can throttle spam.
 */
export const suggestAttraction = createServerFn({ method: "POST" })
  .inputValidator((d: SuggestionInput) => ({
    name: String(d.name ?? "")
      .trim()
      .slice(0, 120),
    city: String(d.city ?? "")
      .trim()
      .slice(0, 80),
    description:
      String(d.description ?? "")
        .trim()
        .slice(0, 1000) || null,
    openShabbat: d.openShabbat === true ? true : d.openShabbat === false ? false : null,
    environment:
      d.environment === "ממוזג" || d.environment === "פתוח" || d.environment === "משולב"
        ? d.environment
        : null,
    minAge: clampAge(d.minAge),
    maxAge: clampAge(d.maxAge),
    stroller_accessible: d.stroller_accessible === true,
    changing_table: d.changing_table === true,
    easy_parking: d.easy_parking === true,
    honeypot: String(d.website ?? ""),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (data.honeypot) return { ok: true }; // silently drop bots
    if (data.name.length < 2) return { ok: false, error: "שם המקום קצר מדי" };
    if (data.city.length < 2) return { ok: false, error: "חסרה עיר או יישוב" };
    if (!(await allowRequest("suggest", 5, 10 * 60_000))) {
      return { ok: false, error: "שלחתם כמה הצעות ברצף – נסו שוב בעוד כמה דקות" };
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY =
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) return { ok: false, error: "השירות אינו זמין כרגע" };

    // Prefer the precise place, then the city center.
    let coords: { lat: number; lng: number } | null = null;
    try {
      coords = await geocodeCity({ data: { cityName: `${data.name}, ${data.city}` } });
    } catch {
      /* fall through */
    }
    if (!coords) {
      const known = resolveCityName(data.city);
      if (known) coords = CITY_COORDS[known] ?? null;
    }
    if (!coords) {
      try {
        coords = await geocodeCity({ data: { cityName: data.city } });
      } catch {
        /* keep null — admin can fill it in */
      }
    }

    let minAge = data.minAge;
    let maxAge = data.maxAge;
    if (minAge !== null && maxAge !== null && minAge > maxAge) [minAge, maxAge] = [maxAge, minAge];

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { error } = await supabase.from("external_attractions").insert({
      name: data.name,
      city: data.city,
      description: data.description,
      open_shabbat: data.openShabbat,
      environment: data.environment,
      min_age: minAge,
      max_age: maxAge,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      stroller_accessible: data.stroller_accessible,
      changing_table: data.changing_table,
      easy_parking: data.easy_parking,
      is_approved: false,
    });
    if (error) {
      console.error("suggestAttraction insert failed", error);
      return { ok: false, error: "הייתה בעיה בשליחת ההצעה, נסו שוב." };
    }
    return { ok: true };
  });
