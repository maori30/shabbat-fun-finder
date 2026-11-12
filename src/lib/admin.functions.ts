import { createServerFn } from "@tanstack/react-start";
import { allowRequest } from "@/lib/rate-limit";
import {
  htmlToText,
  isSafePublicUrl,
  normalizeExtracted,
  type ExtractedAttraction,
} from "@/lib/page-extract";

/**
 * Moderation of parent suggestions (table `external_attractions`).
 *
 * Protected by the ADMIN_PASSWORD secret (set it in Lovable → Cloud →
 * Secrets). Writes go through the service-role client on the server, so
 * there's no public write access to approvals.
 */

export type PendingSuggestion = {
  id: string;
  name: string;
  city: string | null;
  description: string | null;
  open_shabbat: boolean | null;
  environment: string | null;
  min_age: number | null;
  max_age: number | null;
  lat: number | null;
  lng: number | null;
  stroller_accessible: boolean;
  changing_table: boolean;
  easy_parking: boolean;
  is_approved: boolean;
  created_at: string;
};

type AdminResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Constant-time string comparison (avoids leaking the password via timing). */
function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

async function checkPassword(password: string): Promise<string | null> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) {
    return "ממשק הניהול לא הוגדר – צריך להוסיף סוד בשם ADMIN_PASSWORD (לפחות 8 תווים)";
  }
  // Brute-force guard: 10 attempts per 10 minutes per IP.
  if (!(await allowRequest("admin", 10, 10 * 60_000))) {
    return "יותר מדי ניסיונות – נסו שוב בעוד כמה דקות";
  }
  return safeEqual(password, expected) ? null : "סיסמה שגויה";
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const COLUMNS =
  "id, name, city, description, open_shabbat, environment, min_age, max_age, lat, lng, stroller_accessible, changing_table, easy_parking, is_approved, created_at";

export const listSuggestions = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; status: "pending" | "approved" }) => ({
    password: String(d.password ?? "").slice(0, 200),
    status: d.status === "approved" ? ("approved" as const) : ("pending" as const),
  }))
  .handler(async ({ data }): Promise<AdminResult<PendingSuggestion[]>> => {
    const denied = await checkPassword(data.password);
    if (denied) return { ok: false, error: denied };
    try {
      const db = await adminClient();
      const { data: rows, error } = await db
        .from("external_attractions")
        .select(COLUMNS)
        .eq("is_approved", data.status === "approved")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return { ok: true, data: (rows ?? []) as PendingSuggestion[] };
    } catch (e) {
      console.error("listSuggestions failed", e);
      return { ok: false, error: "טעינת ההצעות נכשלה" };
    }
  });

export const reviewSuggestion = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      password: string;
      id: string;
      action: "approve" | "reject" | "unapprove";
      lat?: number | null;
      lng?: number | null;
      open_shabbat?: boolean | null;
    }) => ({
      password: String(d.password ?? "").slice(0, 200),
      id: String(d.id ?? "").slice(0, 64),
      action: d.action === "approve" || d.action === "unapprove" ? d.action : ("reject" as const),
      lat: typeof d.lat === "number" && Number.isFinite(d.lat) ? d.lat : null,
      lng: typeof d.lng === "number" && Number.isFinite(d.lng) ? d.lng : null,
      open_shabbat: d.open_shabbat === true ? true : d.open_shabbat === false ? false : undefined,
    }),
  )
  .handler(async ({ data }): Promise<AdminResult<null>> => {
    const denied = await checkPassword(data.password);
    if (denied) return { ok: false, error: denied };
    if (!/^[0-9a-f-]{36}$/i.test(data.id)) return { ok: false, error: "מזהה לא תקין" };
    try {
      const db = await adminClient();
      if (data.action === "reject") {
        const { error } = await db.from("external_attractions").delete().eq("id", data.id);
        if (error) throw error;
        return { ok: true, data: null };
      }
      const patch: { is_approved: boolean; lat?: number; lng?: number; open_shabbat?: boolean } = {
        is_approved: data.action === "approve",
      };
      if (data.action === "approve") {
        // Without coordinates an approved place can never match a search.
        if (data.lat === null || data.lng === null) {
          return { ok: false, error: "חסר מיקום – הדביקו קואורדינטות לפני אישור" };
        }
        // Israel bounding box sanity check.
        if (data.lat < 29 || data.lat > 33.5 || data.lng < 34 || data.lng > 36) {
          return { ok: false, error: "המיקום מחוץ לישראל – בדקו את הקואורדינטות" };
        }
        patch.lat = data.lat;
        patch.lng = data.lng;
        if (data.open_shabbat !== undefined) patch.open_shabbat = data.open_shabbat;
      }
      const { error } = await db.from("external_attractions").update(patch).eq("id", data.id);
      if (error) throw error;
      return { ok: true, data: null };
    } catch (e) {
      console.error("reviewSuggestion failed", e);
      return { ok: false, error: "השמירה נכשלה" };
    }
  });

// ---------------------------------------------------------------------------
// Import an attraction from its website
// ---------------------------------------------------------------------------

export type ImportDraft = ExtractedAttraction & {
  source_url: string;
  lat: number | null;
  lng: number | null;
};

const MAX_HTML_BYTES = 1_500_000;

/** Fetch a public page, re-checking every redirect hop against the URL rules. */
async function fetchPublicPage(start: URL): Promise<{ url: URL; html: string }> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; KidsShabbatFinder/1.0)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "he,en;q=0.8",
        },
      });
    } finally {
      clearTimeout(timer);
    }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      const safe = next ? isSafePublicUrl(new URL(next, url).toString()) : null;
      if (!safe) throw new Error("הפניה לכתובת לא מורשית");
      url = safe;
      continue;
    }
    if (!res.ok) throw new Error(`האתר החזיר שגיאה ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(type)) throw new Error("הכתובת אינה דף אינטרנט");
    // Read at most MAX_HTML_BYTES.
    const reader = res.body?.getReader();
    if (!reader) return { url, html: await res.text() };
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.byteLength;
    }
    void reader.cancel().catch(() => {});
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      buf.set(c.subarray(0, Math.min(c.byteLength, total - off)), off);
      off += c.byteLength;
      if (off >= total) break;
    }
    return { url, html: new TextDecoder("utf-8").decode(buf) };
  }
  throw new Error("יותר מדי הפניות");
}

const EXTRACT_SYSTEM =
  'אתה מחלץ פרטים על אטרקציה לילדים מתוך תוכן של אתר אינטרנט ישראלי. החזר JSON בלבד: {"is_attraction": boolean, "name": string, "city": string|null, "address": string|null, "category": string|null, "description": string|null, "open_shabbat": boolean|null, "shabbat_hours": string|null, "environment": "ממוזג"|"פתוח"|"משולב"|null, "min_age": number|null, "max_age": number|null, "price": string|null}. כללים: השתמש רק במידע שמופיע בדף – אל תנחש. open_shabbat = true רק אם כתוב במפורש שפתוח בשבת או שיש שעות לשבת/יום ז\'/Saturday; false רק אם כתוב שסגור בשבת; אחרת null. shabbat_hours = שעות השבת כפי שכתובות (למשל "10:00–17:00"). description = 1–2 משפטים בעברית על מה יש שם לילדים. category = סוג המקום בעברית (למשל "פינת חי", "משחקייה", "סדנאות"). environment = ממוזג (בפנים), פתוח (בחוץ) או משולב. price = מחיר כפי שכתוב (למשל "45 ₪ לילד"). is_attraction = false אם הדף אינו מקום/פעילות לילדים או משפחות.';

/** Read a website and turn it into a draft attraction card (not saved yet). */
export const importFromUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; url: string }) => ({
    password: String(d.password ?? "").slice(0, 200),
    url: String(d.url ?? "").slice(0, 2000),
  }))
  .handler(async ({ data }): Promise<AdminResult<ImportDraft>> => {
    const denied = await checkPassword(data.password);
    if (denied) return { ok: false, error: denied };
    const start = isSafePublicUrl(data.url);
    if (!start) return { ok: false, error: "כתובת לא תקינה – הדביקו קישור מלא שמתחיל ב-https://" };
    if (!(await allowRequest("import", 20, 10 * 60_000))) {
      return { ok: false, error: "יותר מדי ייבואים ברצף – נסו שוב בעוד כמה דקות" };
    }

    let page: { url: URL; html: string };
    try {
      page = await fetchPublicPage(start);
    } catch (e) {
      console.error("importFromUrl fetch failed", e);
      const msg = e instanceof Error && /[\u0590-\u05FF]/.test(e.message) ? e.message : "";
      return { ok: false, error: msg || "לא הצלחנו לקרוא את האתר (אולי הוא חוסם גישה אוטומטית)" };
    }
    const text = htmlToText(page.html);
    if (text.length < 80) {
      return { ok: false, error: "בדף כמעט אין טקסט (ייתכן שהאתר נטען רק עם JavaScript)" };
    }

    let draft: ExtractedAttraction | null;
    try {
      const { callAi } = await import("@/lib/ai-client");
      const raw = await callAi([
        { role: "system", content: EXTRACT_SYSTEM },
        { role: "user", content: `כתובת: ${page.url.toString()}\n\n${text}` },
      ]);
      draft = normalizeExtracted(raw);
    } catch (e) {
      console.error("importFromUrl AI failed", e);
      return { ok: false, error: "שירות ה-AI עמוס כרגע – נסו שוב בעוד רגע" };
    }
    if (!draft) return { ok: false, error: "לא הצלחנו לזהות את שם המקום בדף" };

    let coords: { lat: number; lng: number } | null = null;
    try {
      const { geocodeCity } = await import("@/lib/places.functions");
      const where = [draft.name, draft.address ?? draft.city].filter(Boolean).join(", ");
      coords = await geocodeCity({ data: { cityName: where } });
      if (!coords && draft.city) coords = await geocodeCity({ data: { cityName: draft.city } });
    } catch {
      /* admin can paste coordinates */
    }

    return {
      ok: true,
      data: {
        ...draft,
        source_url: page.url.toString(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      },
    };
  });

/** Build the card description: summary + Shabbat hours + price. */
function cardDescription(d: Pick<ImportDraft, "description" | "shabbat_hours" | "price">) {
  return [
    d.description,
    // LRI…PDI keeps "09:00–16:00" from rendering reversed inside Hebrew text.
    d.shabbat_hours ? `🕐 שבת: \u2066${d.shabbat_hours}\u2069` : null,
    d.price ? `💰 ${d.price}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 1000);
}

/** Save a reviewed draft as an approved attraction (shows up in searches). */
export const saveImported = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; draft: ImportDraft }) => ({
    password: String(d.password ?? "").slice(0, 200),
    draft: d.draft,
  }))
  .handler(async ({ data }): Promise<AdminResult<null>> => {
    const denied = await checkPassword(data.password);
    if (denied) return { ok: false, error: denied };
    const d = normalizeExtracted(data.draft as unknown as Record<string, unknown>);
    if (!d) return { ok: false, error: "חסר שם למקום" };
    const source = isSafePublicUrl(String(data.draft?.source_url ?? ""));
    const lat = Number(data.draft?.lat);
    const lng = Number(data.draft?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, error: "חסר מיקום – הדביקו קואורדינטות לפני שמירה" };
    }
    if (lat < 29 || lat > 33.5 || lng < 34 || lng > 36) {
      return { ok: false, error: "המיקום מחוץ לישראל – בדקו את הקואורדינטות" };
    }
    try {
      const db = await adminClient();
      const { error } = await db.from("external_attractions").insert({
        name: d.name,
        city: d.city,
        description: cardDescription(d),
        category: d.category,
        open_shabbat: d.open_shabbat,
        environment: d.environment,
        min_age: d.min_age,
        max_age: d.max_age,
        lat,
        lng,
        source_url: source?.toString() ?? null,
        is_approved: true,
      });
      if (error) throw error;
      return { ok: true, data: null };
    } catch (e) {
      console.error("saveImported failed", e);
      return { ok: false, error: "השמירה נכשלה" };
    }
  });

// ---------------------------------------------------------------------------
// Search insights — where are places missing?
// ---------------------------------------------------------------------------

export const getInsights = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; days: number }) => ({
    password: String(d.password ?? "").slice(0, 200),
    days: [7, 30, 90].includes(Number(d.days)) ? Number(d.days) : 30,
  }))
  .handler(
    async ({
      data,
    }): Promise<AdminResult<{ total: number; areas: import("@/lib/insights").AreaSummary[] }>> => {
      const denied = await checkPassword(data.password);
      if (denied) return { ok: false, error: denied };
      try {
        const { summarizeInsights } = await import("@/lib/insights");
        const db = await adminClient();
        const since = new Date(Date.now() - data.days * 24 * 3600 * 1000).toISOString();
        const { data: rows, error } = await db
          .from("search_insights" as never)
          .select("created_at, kind, area, lat, lng, vibe, indoor, free_only, result_count")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(5000);
        if (error) {
          if (/does not exist|schema cache/i.test(error.message)) {
            return {
              ok: false,
              error: "טבלת הנתונים עוד לא נוצרה – צריך להריץ את ה-SQL של search_insights",
            };
          }
          throw error;
        }
        const list = (rows ?? []) as unknown as import("@/lib/insights").InsightRow[];
        const parsed = list.map((r) => ({
          ...r,
          lat: r.lat === null ? null : Number(r.lat),
          lng: r.lng === null ? null : Number(r.lng),
        }));
        return { ok: true, data: { total: parsed.length, areas: summarizeInsights(parsed) } };
      } catch (e) {
        console.error("getInsights failed", e);
        return { ok: false, error: "טעינת הנתונים נכשלה" };
      }
    },
  );
