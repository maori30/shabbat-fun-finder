import { createServerFn } from "@tanstack/react-start";
import { geocodeCity, searchPlaces, type PlaceResult } from "@/lib/places.functions";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "openai/gpt-5.6-sol";

export type AiCriteria = {
  city: string | null;
  maxDriveMinutes: number | null;
  ages: number[];
  freeOnly: boolean;
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
};

async function callAi(messages: { role: string; content: string }[], apiKey: string) {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: "none",
      messages,
      response_format: { type: "json_object" },
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
    const empty: AiSearchResult = { summary: "", criteria: null, origin: null, places: [], reasons: {} };
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ...empty, error: "חסר מפתח AI" };
    if (!data.prompt) return { ...empty, error: "כתבו מה אתם מחפשים" };

    // 1) Understand the request
    let criteria: AiCriteria;
    try {
      const parsed = await callAi(
        [
          {
            role: "system",
            content:
              'אתה מנתח בקשות של הורים בישראל למצוא פעילות לילדים. החזר JSON בלבד במבנה: {"city": string|null, "maxDriveMinutes": number|null, "ages": number[], "freeOnly": boolean, "indoorPreference": "ממוזג"|"פתוח"|"לא משנה", "shabbatOnly": boolean, "keywords": string[]}. keywords = עד 3 מונחי חיפוש בעברית שמתאימים לבקשה. אם לא צוין דבר – השתמש ב-null/false/"לא משנה".',
          },
          { role: "user", content: data.prompt },
        ],
        apiKey,
      );
      criteria = {
        city: typeof parsed.city === "string" ? parsed.city : null,
        maxDriveMinutes: typeof parsed.maxDriveMinutes === "number" ? parsed.maxDriveMinutes : null,
        ages: Array.isArray(parsed.ages) ? (parsed.ages as unknown[]).filter((a): a is number => typeof a === "number") : [],
        freeOnly: parsed.freeOnly === true,
        indoorPreference:
          parsed.indoorPreference === "ממוזג" || parsed.indoorPreference === "פתוח" ? parsed.indoorPreference : "לא משנה",
        shabbatOnly: parsed.shabbatOnly === true,
        keywords: Array.isArray(parsed.keywords)
          ? (parsed.keywords as unknown[]).filter((k): k is string => typeof k === "string").slice(0, 3)
          : [],
      };
    } catch (e) {
      console.error(e);
      return { ...empty, error: "לא הצלחנו להבין את הבקשה, נסו שוב" };
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
              'בחר עד 8 המקומות המתאימים ביותר לבקשת ההורה מתוך הרשימה. החזר JSON בלבד: {"summary": string, "picks": [{"id": string, "reason": string}]}. summary = משפט אחד בעברית שמסביר מה חיפשנו ומה מצאנו. reason = עד 15 מילים בעברית למה זה מתאים (גיל, מרחק, מיזוג, שבת, עלות).',
          },
          {
            role: "user",
            content: `בקשה: ${data.prompt}\nיוצאים מ: ${origin.label}\nמקומות: ${JSON.stringify(shortlist)}`,
          },
        ],
        apiKey,
      );
      const picks = Array.isArray(ranked.picks) ? (ranked.picks as { id?: string; reason?: string }[]) : [];
      const reasons: Record<string, string> = {};
      const ordered: PlaceResult[] = [];
      for (const pick of picks) {
        const place = candidates.find((p) => p.id === pick.id);
        if (place && !ordered.includes(place)) {
          ordered.push(place);
          if (pick.reason) reasons[place.id] = pick.reason;
        }
      }
      const places = ordered.length > 0 ? ordered : candidates.slice(0, 8);
      return {
        summary: typeof ranked.summary === "string" ? ranked.summary : "",
        criteria,
        origin,
        places,
        reasons,
      };
    } catch (e) {
      console.error(e);
      return { summary: "", criteria, origin, places: candidates.slice(0, 8), reasons: {} };
    }
  });
