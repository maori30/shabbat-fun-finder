import { createServerFn } from "@tanstack/react-start";
import { allowRequest } from "@/lib/rate-limit";

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
      const patch: Record<string, unknown> = { is_approved: data.action === "approve" };
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
