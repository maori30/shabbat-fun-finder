import { createServerFn } from "@tanstack/react-start";
import { geocodeCity, searchPlaces, type PlaceResult } from "@/lib/places.functions";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "openai/gpt-5.6-sol";

export type AiCriteria = {
  city: string | null;
  maxDriveMinutes: number | null;
  ages: number[];
  freeOnly: boolean;
  budget: number | null;
  indoorPreference: "ממוזג" | "פתוח" | "לא משנה";
  shabbatOnly: boolean;
  keywords: string[];
};

export type AiSearchResult = {
  error?: string;
  summary: string;
  criteria: AiCriteria | null;
  origin: { lat: number; lng: number; label: string } | null;
  places: PlaceResult[];
  reasons: Record<string, string>;
  /** Short "✓" bullet checks per place id, e.g. ["מתאים לגילאים 4–7", "ממוזג"] */
  checks: Record<string, string[]>;
  /** Rough family cost estimate per place id, e.g. "כ־120 ₪ למשפחה" */
  priceEstimates: Record<string, string>;
};


async function callAi(messages: { role: string; content: string }[], apiKey?: string) {
  const lovableKey = process.env.LOVABLE_API_KEY || apiKey;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!lovableKey && !geminiKey) {
    throw new Error("חסר מפתח AI");
  }

  const endpoint = geminiKey 
    ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" 
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
    
  const model = geminiKey ? "gemini-3.8-flash" : "openai/gpt-5.6-sol";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (geminiKey) {
    headers["Authorization"] = "Bearer " + geminiKey;
  } else if (lovableKey) {
    headers["Lovable-API-Key"] = lovableKey;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: model,
      response_format: { type: "json_object" },
      messages,
    }),
  });
  
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI ${res.status}: ${body.slice(0, 200)}`);
  }
  
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    return match ? (JSON.parse(match[0]) as Record<string, unknown>) : {};
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Types that are usually free (or free to enter) — not just parks: beaches,
// promenades, libraries, community centers, markets, plazas, lookouts,
// historical/cultural sites and malls (window shopping + free play corners).
const FREE_HINT_TYPES = new Set([
  "park", "national_park", "state_park", "playground", "dog_park",
  "library", "community_center", "botanical_garden", "shopping_mall",
  "beach", "tourist_attraction", "observation_deck", "cultural_landmark",
  "historical_place", "plaza", "hiking_area", "marina", "market",
  "athletic_field", "skateboard_park", "sports_complex", "cultural_center",
  "art_gallery", "visitor_center", "monument", "church", "synagogue",
  "farm", "garden", "picnic_ground", "scenic_lookout",
]);

// Hebrew/English name hints for places that normally cost nothing to visit.
const FREE_NAME_HINT =
  /פארק|גן ?שעשועים|גן ציבורי|גינה|טיילת|חוף|כיכר|ספריי?ה|מרכז קהילתי|מתנ"?ס|שוק|תצפית|יער|נחל|מפל|מגרש|סקייט|מוזיאון פתוח|park|playground|beach|promenade|library|square|market|trail/i;

// Extra search terms used when the parent asked for something free.
const FREE_EXTRA_QUERIES = [
  "גן שעשועים",
  "פארק ציבורי",
  "טיילת",
  "ספרייה עירונית",
  "מתחם משחקים חינם לילדים",
];


export const aiSearch = createServerFn({ method: "POST" })
  .inputValidator((data: { prompt: string; fallbackOrigin?: { lat: number; lng: number; label: string } | null }) => ({
    prompt: (data.prompt ?? "").trim().slice(0, 600),
    fallbackOrigin: data.fallbackOrigin ?? null,
  }))
  .handler(async ({ data }): Promise<AiSearchResult> => {
    const empty: AiSearchResult = { summary: "", criteria: null, origin: null, places: [], reasons: {}, checks: {}, priceEstimates: {} };
    const lovableKey = typeof process !== 'undefined' ? process.env.LOVABLE_API_KEY : undefined;
  let geminiKey = typeof process !== 'undefined' ? (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) : undefined;
  
  if (!geminiKey && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    geminiKey = (import.meta as any).env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
  }
    if (!lovableKey && !geminiKey) return { ...empty, error: "חסר מפתח AI. יש להגדיר GEMINI_API_KEY בסודות (Secrets) של הפרויקט." };
    if (!data.prompt) return { ...empty, error: "כתבו מה אתם מחפשים" };

    // 1) Understand the request
    let criteria: AiCriteria;
    try {
      const parsed = await callAi(
        [
          {
            role: "system",
            content:
              'אתה מנתח בקשות של הורים בישראל למצוא פעילות לילדים. החזר JSON בלבד במבנה: {"city": string|null, "maxDriveMinutes": number|null, "ages": number[], "freeOnly": boolean, "budget": number|null, "indoorPreference": "ממוזג"|"פתוח"|"לא משנה", "shabbatOnly": boolean, "keywords": string[]}. budget = תקציב מקסימלי בשקלים למשפחה אם הוזכר. keywords = עד 3 מונחי חיפוש בעברית שמתאימים לבקשה. אם לא צוין דבר – השתמש ב-null/false/"לא משנה".',
          },
          { role: "user", content: data.prompt },
        ]);
      criteria = {
        city: typeof parsed.city === "string" ? parsed.city : null,
        maxDriveMinutes: typeof parsed.maxDriveMinutes === "number" ? parsed.maxDriveMinutes : null,
        ages: Array.isArray(parsed.ages) ? (parsed.ages as unknown[]).filter((a): a is number => typeof a === "number") : [],
        freeOnly: parsed.freeOnly === true,
        budget: typeof parsed.budget === "number" ? parsed.budget : null,
        indoorPreference:
          parsed.indoorPreference === "ממוזג" || parsed.indoorPreference === "פתוח" ? parsed.indoorPreference : "לא משנה",
        shabbatOnly: parsed.shabbatOnly === true,
        keywords: Array.isArray(parsed.keywords)
          ? (parsed.keywords as unknown[]).filter((k): k is string => typeof k === "string").slice(0, 3)
          : [],
      };
    } catch (e) {
      console.error(e);
      return { ...empty, error: "שגיאה: " + (e as Error).message };
    }

    // 2) Resolve origin
    let origin = data.fallbackOrigin;
    if (criteria.city) {
      const geo = await geocodeCity({ data: { cityName: criteria.city } });
      if (geo) origin = geo;
    }
    if (!origin) {
      return { ...empty, criteria, error: "לא זיהינו מאיפה יוצאים – כתבו עיר או אפשרו מיקום" };
    }

    // 3) Search real places (~50 km/h in-city average)
    const minutes = criteria.maxDriveMinutes ?? 40;
    const radiusKm = Math.max(5, Math.min(50, Math.round((minutes / 60) * 50)));
    const found: PlaceResult[] = [];
    const seen = new Set<string>();
    const baseQueries = criteria.keywords.length > 0 ? criteria.keywords : [""];
    // For a free request, also sweep free-by-nature venues (playgrounds,
    // promenades, beaches, libraries) and drop activity-mode's narrow type
    // list so we don't end up with parks only.
    const queries = criteria.freeOnly
      ? [...baseQueries.slice(0, 2), ...FREE_EXTRA_QUERIES]
      : baseQueries.slice(0, 2);
    for (const keyword of queries) {
      const res = await searchPlaces({
        data: {
          lat: origin.lat,
          lng: origin.lng,
          radius: radiusKm * 1000,
          keyword,
          activityMode: !criteria.freeOnly,
        },
      });
      for (const p of res.places) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          found.push(p);
        }
      }
    }

    let candidates = found.filter((p) => haversineKm(origin!.lat, origin!.lng, p.lat, p.lng) <= radiusKm);
    if (criteria.shabbatOnly) {
      const openSat = candidates.filter((p) => p.openShabbat === true || p.saturdayHours);
      if (openSat.length >= 3) candidates = openSat;
    }
    if (criteria.ages.length > 0) {
      const minAge = Math.min(...criteria.ages);
      const maxAge = Math.max(...criteria.ages);
      const fits = candidates.filter((p) => !p.ageRange || (p.ageRange.min <= maxAge && p.ageRange.max >= minAge));
      if (fits.length >= 3) candidates = fits;
    }
    if (criteria.freeOnly) {
      const freeish = candidates.filter(
        (p) => p.types.some((t) => FREE_HINT_TYPES.has(t)) || FREE_NAME_HINT.test(p.name),
      );
      if (freeish.length >= 1) candidates = freeish;
    }

    if (candidates.length === 0) {
      return { ...empty, criteria, origin, error: "לא נמצאו מקומות בטווח – נסו להרחיב את זמן הנסיעה" };
    }

    // 4) Rank + explain
    const shortlist = candidates.slice(0, 25).map((p) => ({
      id: p.id,
      name: p.name,
      type: p.primaryType ?? p.primaryTypeId,
      rating: p.rating,
      km: Math.round(haversineKm(origin!.lat, origin!.lng, p.lat, p.lng) * 10) / 10,
      openShabbat: p.openShabbat,
      environment: p.environment,
      ageRange: p.ageRange,
      description: p.description?.slice(0, 120) ?? null,
    }));

    try {
      const ranked = await callAi(
        [
          {
            role: "system",
            content:
              'אתה עוזר להורה להחליט מה לעשות עם הילדים – לא רק לרשום אפשרויות. בחר עד 6 מקומות מהרשימה, כשהראשון הוא הבחירה הטובה ביותר. החזר JSON בלבד: {"summary": string, "picks": [{"id": string, "reason": string, "checks": string[], "priceEstimate": string}]}. summary = משפט אחד בעברית שמסביר מה חיפשנו ומה מצאנו. reason = משפט קצר בעברית שמתחיל ב"למה בחרנו בזה:" ומסביר בדיוק למה זה מתאים להורה הזה. checks = 3–5 פריטים קצרצרים בעברית לסימון ✓, למשל "מתאים לגילאים 4–7", "פתוח בשבת", "ממוזג", "18 דקות נסיעה". priceEstimate = הערכת עלות בעברית כמו "כ־120 ₪ למשפחה" או "חינם", ואם אין מידע – "מחיר לא ידוע".',
          },
          {
            role: "user",
            content: `בקשה: ${data.prompt}\nיוצאים מ: ${origin.label}\nמקומות: ${JSON.stringify(shortlist)}`,
          },
        ]);
      const picks = Array.isArray(ranked.picks)
        ? (ranked.picks as { id?: string; reason?: string; checks?: unknown; priceEstimate?: unknown }[])
        : [];
      const reasons: Record<string, string> = {};
      const checks: Record<string, string[]> = {};
      const priceEstimates: Record<string, string> = {};
      const ordered: PlaceResult[] = [];
      for (const pick of picks) {
        const place = candidates.find((p) => p.id === pick.id);
        if (place && !ordered.includes(place)) {
          ordered.push(place);
          if (pick.reason) reasons[place.id] = pick.reason;
          if (Array.isArray(pick.checks)) {
            checks[place.id] = (pick.checks as unknown[])
              .filter((c): c is string => typeof c === "string")
              .slice(0, 5);
          }
          if (typeof pick.priceEstimate === "string") priceEstimates[place.id] = pick.priceEstimate;
        }
      }
      const places = ordered.length > 0 ? ordered : candidates.slice(0, 8);
      return {
        summary: typeof ranked.summary === "string" ? ranked.summary : "",
        criteria,
        origin,
        places,
        reasons,
        checks,
        priceEstimates,
      };
    } catch (e) {
      console.error(e);
      return { summary: "הייתה שגיאה בדירוג: " + (e instanceof Error ? e.message : String(e)), criteria, origin, places: candidates.slice(0, 8), reasons: {}, checks: {}, priceEstimates: {} };
    }
  });










