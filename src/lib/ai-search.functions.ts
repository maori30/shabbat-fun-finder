import { createServerFn } from "@tanstack/react-start";
import { geocodeCity, searchPlaces, type PlaceResult } from "@/lib/places.functions";
import { distanceKm } from "@/lib/geo";
import { mergePicks, planQueries, selectCandidates } from "@/lib/ai-candidates";
import { allowRequest, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "openai/gpt-5.6-sol";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-3.8-flash";

export type AiCriteria = {
  city: string | null;
  maxDriveMinutes: number | null;
  /** When the parent states a distance ("עד 45 ק"מ") rather than a time. */
  maxDistanceKm: number | null;
  ages: number[];
  freeOnly: boolean;
  budget: number | null;
  indoorPreference: "ממוזג" | "פתוח" | "לא משנה";
  shabbatOnly: boolean;
  keywords: string[];
};

export type ItineraryStop = {
  slot: "בוקר" | "צהריים" | "אחר הצהריים";
  placeId: string;
  tip: string;
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
  /** Only in itinerary mode: an ordered morning → afternoon plan. */
  itinerary?: ItineraryStop[];
  /** Only in itinerary mode: where/what to eat between stops. */
  lunchTip?: string;
};

/** Shown to users instead of raw provider errors (which are only logged). */
const AI_BUSY_MESSAGE = "שירות ה-AI עמוס כרגע – נסו שוב בעוד רגע";

function envKey(...names: string[]): string | undefined {
  const proc = typeof process !== "undefined" ? process.env : {};
  const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  for (const n of names) {
    const v = proc[n] ?? meta[n];
    if (v) return v;
  }
  return undefined;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAiWithRetry(
  endpoint: string,
  model: string,
  headers: Record<string, string>,
  messages: { role: string; content: string }[],
  maxRetries = 2,
): Promise<Record<string, unknown>> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        const err = new Error(`AI ${res.status}: ${body.slice(0, 200)}`);
        // Retry on 503 (high demand) or 429 (rate limit)
        if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
          await delay(1000 * (attempt + 1));
          continue;
        }
        throw err;
      }

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content ?? "{}";
      try {
        return JSON.parse(content) as Record<string, unknown>;
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        return match ? (JSON.parse(match[0]) as Record<string, unknown>) : {};
      }
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        await delay(1000 * (attempt + 1));
      }
    }
  }
  throw lastError ?? new Error("AI request failed");
}

async function callAi(messages: { role: string; content: string }[]) {
  const lovableKey = envKey("LOVABLE_API_KEY");
  const geminiKey = envKey("GEMINI_API_KEY", "VITE_GEMINI_API_KEY");

  if (!lovableKey && !geminiKey) {
    throw new Error("חסר מפתח AI");
  }

  // 1. Try Lovable API if key is present
  if (lovableKey) {
    try {
      return await callAiWithRetry(
        AI_URL,
        MODEL,
        {
          "Content-Type": "application/json",
          "Lovable-API-Key": lovableKey,
        },
        messages,
        1,
      );
    } catch (e) {
      console.warn("Lovable AI Gateway failed, checking Gemini fallback...", e);
      if (!geminiKey) throw e;
    }
  }

  // 2. Try Gemini API as fallback or primary
  if (geminiKey) {
    return await callAiWithRetry(
      GEMINI_URL,
      GEMINI_MODEL,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${geminiKey}`,
      },
      messages,
      2,
    );
  }

  throw new Error("לא ניתן להשלים את פניית ה-AI");
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  return distanceKm({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
}

export const aiSearch = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      prompt: string;
      fallbackOrigin?: { lat: number; lng: number; label: string } | null;
      mode?: "search" | "itinerary";
      weather?: string | null;
    }) => ({
      prompt: (data.prompt ?? "").trim().slice(0, 600),
      fallbackOrigin:
        data.fallbackOrigin &&
        Number.isFinite(data.fallbackOrigin.lat) &&
        Number.isFinite(data.fallbackOrigin.lng)
          ? {
              lat: data.fallbackOrigin.lat,
              lng: data.fallbackOrigin.lng,
              label: String(data.fallbackOrigin.label ?? "").slice(0, 80),
            }
          : null,
      mode: data.mode === "itinerary" ? ("itinerary" as const) : ("search" as const),
      weather: data.weather ? String(data.weather).slice(0, 120) : null,
    }),
  )
  .handler(async ({ data }): Promise<AiSearchResult> => {
    const empty: AiSearchResult = {
      summary: "",
      criteria: null,
      origin: null,
      places: [],
      reasons: {},
      checks: {},
      priceEstimates: {},
    };
    if (!envKey("LOVABLE_API_KEY") && !envKey("GEMINI_API_KEY", "VITE_GEMINI_API_KEY")) {
      return { ...empty, error: "חיפוש AI אינו זמין כרגע" };
    }
    if (!data.prompt) return { ...empty, error: "כתבו מה אתם מחפשים" };
    // Every AI search = 2 LLM calls + several paid Places searches.
    if (!(await allowRequest("ai", 8, 60_000))) return { ...empty, error: RATE_LIMIT_MESSAGE };

    // 1) Understand the request
    let criteria: AiCriteria;
    try {
      const parsed = await callAi([
        {
          role: "system",
          content:
            'אתה מנתח בקשות של הורים בישראל למצוא פעילות לילדים. החזר JSON בלבד במבנה: {"city": string|null, "maxDriveMinutes": number|null, "maxDistanceKm": number|null, "ages": number[], "freeOnly": boolean, "budget": number|null, "indoorPreference": "ממוזג"|"פתוח"|"לא משנה", "shabbatOnly": boolean, "keywords": string[]}. maxDriveMinutes = רק אם צוינו דקות/שעות נסיעה; maxDistanceKm = רק אם צוינו קילומטרים (ק"מ). budget = תקציב מקסימלי בשקלים למשפחה אם הוזכר. indoorPreference = "ממוזג" אם ביקשו ממוזג/בפנים/מקורה, "פתוח" אם ביקשו בחוץ/טבע. keywords = עד 2 סוגי מקומות ספציפיים בעברית כפי שמחפשים בגוגל מפות, למשל "משחקייה", "פארק טרמפולינות", "מוזיאון ילדים", "באולינג", "פארק מים", "פינת חי" – אף פעם לא תיאורים כמו "מקום ממוזג", "פעילות לילדים" או "בשבת"; אם לא ביקשו סוג מקום מסוים – החזר מערך ריק. אם לא צוין דבר – השתמש ב-null/false/"לא משנה".',
        },
        { role: "user", content: data.prompt },
      ]);
      criteria = {
        city: typeof parsed.city === "string" ? parsed.city : null,
        maxDriveMinutes: typeof parsed.maxDriveMinutes === "number" ? parsed.maxDriveMinutes : null,
        maxDistanceKm: typeof parsed.maxDistanceKm === "number" ? parsed.maxDistanceKm : null,
        ages: Array.isArray(parsed.ages)
          ? (parsed.ages as unknown[]).filter((a): a is number => typeof a === "number")
          : [],
        freeOnly: parsed.freeOnly === true,
        budget: typeof parsed.budget === "number" ? parsed.budget : null,
        indoorPreference:
          parsed.indoorPreference === "ממוזג" || parsed.indoorPreference === "פתוח"
            ? parsed.indoorPreference
            : "לא משנה",
        shabbatOnly: parsed.shabbatOnly === true,
        keywords: Array.isArray(parsed.keywords)
          ? (parsed.keywords as unknown[])
              .filter((k): k is string => typeof k === "string")
              .slice(0, 3)
          : [],
      };
    } catch (e) {
      console.error("AI criteria parsing failed", e);
      return { ...empty, error: AI_BUSY_MESSAGE };
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

    // 3) Search real places. Radius from km if given, else drive time
    // (~50 km/h average door to door).
    const radiusKm = Math.max(
      5,
      Math.min(
        50,
        Math.round(criteria.maxDistanceKm ?? ((criteria.maxDriveMinutes ?? 40) / 60) * 50),
      ),
    );
    const queries = planQueries(criteria);
    const responses = await Promise.all(
      queries.map((keyword) =>
        searchPlaces({
          data: {
            lat: origin.lat,
            lng: origin.lng,
            radius: radiusKm * 1000,
            keyword,
            // The broad sweep stays wide for "free" requests (parks, beaches…).
            activityMode: !criteria.freeOnly,
          },
        }),
      ),
    );
    if (responses.every((r) => r.places.length === 0) && responses.some((r) => r.error)) {
      return { ...empty, criteria, origin, error: responses.find((r) => r.error)?.error };
    }
    const found: PlaceResult[] = [];
    const seen = new Set<string>();
    for (const res of responses) {
      for (const p of res.places) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          found.push(p);
        }
      }
    }

    const candidates = selectCandidates(found, criteria, origin, radiusKm);

    if (candidates.length === 0) {
      return {
        ...empty,
        criteria,
        origin,
        error: "לא נמצאו מקומות בטווח – נסו להרחיב את זמן הנסיעה",
      };
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

    const itineraryMode = data.mode === "itinerary";
    const itinerarySystem =
      'אתה מתכנן שבת משפחתית עם ילדים בישראל. בנה מסלול הגיוני של 2–3 תחנות מהרשימה בלבד: בוקר, צהריים, אחר הצהריים – תחנות קרובות זו לזו, פעילות בחוץ בבוקר כשחם, מקום ממוזג או מקורה בצהריים, והתחשב במזג האוויר. החזר JSON בלבד: {"summary": string, "plan": [{"slot": "בוקר"|"צהריים"|"אחר הצהריים", "id": string, "tip": string}], "lunchTip": string, "picks": [{"id": string, "reason": string, "checks": string[], "priceEstimate": string}]}. summary = משפט אחד בעברית שמתאר את היום. tip = טיפ מעשי קצר לתחנה (מתי להגיע, מה להביא). lunchTip = הצעה קצרה איפה/מה לאכול בין התחנות (פיקניק, אזור מסעדות ליד אחת התחנות). picks = התחנות שבמסלול ועוד עד 3 חלופות, באותו מבנה: reason מתחיל ב"למה בחרנו בזה:", checks = 3–5 פריטים קצרים לסימון ✓, priceEstimate כמו "כ־120 ₪ למשפחה"/"חינם"/"מחיר לא ידוע".';

    try {
      const ranked = await callAi(
        itineraryMode
          ? [
              { role: "system", content: itinerarySystem },
              {
                role: "user",
                content: `בקשה: ${data.prompt}\nיוצאים מ: ${origin.label}\n${
                  data.weather ? `מזג אוויר צפוי בשבת: ${data.weather}\n` : ""
                }מקומות: ${JSON.stringify(shortlist)}`,
              },
            ]
          : [
              {
                role: "system",
                content:
                  'אתה עוזר להורה להחליט מה לעשות עם הילדים – לא רק לרשום אפשרויות. בחר עד 8 מקומות מהרשימה (העדף מקומות שבאמת מתאימים לבקשה – למשל ממוזג אם ביקשו ממוזג – ודלג על מקומות לא רלוונטיים), כשהראשון הוא הבחירה הטובה ביותר. החזר JSON בלבד: {"summary": string, "picks": [{"id": string, "reason": string, "checks": string[], "priceEstimate": string}]}. summary = משפט אחד בעברית שמסביר מה חיפשנו ומה מצאנו. reason = משפט קצר בעברית שמתחיל ב"למה בחרנו בזה:" ומסביר בדיוק למה זה מתאים להורה הזה. checks = 3–5 פריטים קצרצרים בעברית לסימון ✓, למשל "מתאים לגילאים 4–7", "פתוח בשבת", "ממוזג", "18 דקות נסיעה". priceEstimate = הערכת עלות בעברית כמו "כ־120 ₪ למשפחה" או "חינם", ואם אין מידע – "מחיר לא ידוע".',
              },
              {
                role: "user",
                content: `בקשה: ${data.prompt}\nיוצאים מ: ${origin.label}\nמקומות: ${JSON.stringify(shortlist)}`,
              },
            ],
      );
      const picks = Array.isArray(ranked.picks)
        ? (ranked.picks as {
            id?: string;
            reason?: string;
            checks?: unknown;
            priceEstimate?: unknown;
          }[])
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
      let itinerary: ItineraryStop[] | undefined;
      if (itineraryMode && Array.isArray(ranked.plan)) {
        const slots = new Set(["בוקר", "צהריים", "אחר הצהריים"]);
        itinerary = (ranked.plan as { slot?: unknown; id?: unknown; tip?: unknown }[])
          .filter(
            (st): st is { slot: ItineraryStop["slot"]; id: string; tip?: unknown } =>
              typeof st.slot === "string" &&
              slots.has(st.slot) &&
              typeof st.id === "string" &&
              candidates.some((p) => p.id === st.id),
          )
          .slice(0, 3)
          .map((st) => ({
            slot: st.slot,
            placeId: st.id,
            tip: typeof st.tip === "string" ? st.tip : "",
          }));
        // Make sure every stop is in the place list, in plan order first.
        for (const st of [...itinerary].reverse()) {
          const place = candidates.find((p) => p.id === st.placeId)!;
          const idx = ordered.indexOf(place);
          if (idx >= 0) ordered.splice(idx, 1);
          ordered.unshift(place);
        }
      }
      // AI picks first (with reasons), then the other matching places so the
      // parent still has plenty of options if the AI picked only a few.
      const places = mergePicks(
        ordered.map((p) => p.id),
        candidates,
      );
      return {
        summary: typeof ranked.summary === "string" ? ranked.summary : "",
        criteria,
        origin,
        places,
        reasons,
        checks,
        priceEstimates,
        itinerary,
        lunchTip:
          itineraryMode && typeof ranked.lunchTip === "string" ? ranked.lunchTip : undefined,
      };
    } catch (e) {
      // Ranking failed — still show the real places we found, unranked.
      console.error("AI ranking failed", e);
      return {
        summary: "הצגנו את המקומות הקרובים שמצאנו (הדירוג החכם לא היה זמין כרגע).",
        criteria,
        origin,
        places: candidates.slice(0, 24),
        reasons: {},
        checks: {},
        priceEstimates: {},
      };
    }
  });
