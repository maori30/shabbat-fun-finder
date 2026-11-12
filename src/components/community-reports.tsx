import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Community feedback for a place: parents report whether it was actually
 * open on Shabbat and how crowded it was. Reports are public (no login).
 */

export type PlaceReport = {
  id: string;
  place_id: string;
  place_name: string;
  status: "open" | "closed" | "unknown";
  crowd: "empty" | "ok" | "crowded" | null;
  note: string | null;
  created_at: string;
};

export type ReportCounts = { open: number; closed: number; lastOpenAt: string | null };

/**
 * One query for a whole result list instead of one per card.
 * Returns counts keyed by place id (places without reports are omitted).
 */
export async function fetchReportCounts(placeIds: string[]): Promise<Record<string, ReportCounts>> {
  const ids = Array.from(new Set(placeIds)).slice(0, 100);
  if (ids.length === 0) return {};
  const since = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("place_reports")
    .select("place_id, status, created_at")
    .in("place_id", ids)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error || !data) return {};
  const out: Record<string, ReportCounts> = {};
  for (const r of data as { place_id: string; status: string; created_at: string }[]) {
    const c = (out[r.place_id] ??= { open: 0, closed: 0, lastOpenAt: null });
    if (r.status === "open") {
      c.open += 1;
      if (!c.lastOpenAt) c.lastOpenAt = r.created_at;
    } else if (r.status === "closed") c.closed += 1;
  }
  return out;
}

export function daysAgoLabel(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000));
  if (days <= 0) return "היום";
  if (days === 1) return "אתמול";
  if (days < 7) return `לפני ${days} ימים`;
  if (days < 14) return "לפני שבוע";
  if (days < 60) return `לפני ${Math.round(days / 7)} שבועות`;
  return `לפני ${Math.round(days / 30)} חודשים`;
}

// Throttle: one report per place per device every 12 hours.
const REPORT_THROTTLE_MS = 12 * 3600 * 1000;
const throttleKey = (placeId: string) => `kids_reported_${placeId}`;
function recentlyReported(placeId: string) {
  try {
    const at = Number(localStorage.getItem(throttleKey(placeId)) ?? 0);
    return Date.now() - at < REPORT_THROTTLE_MS;
  } catch {
    return false;
  }
}

const CROWD_LABEL: Record<string, string> = {
  empty: "🟢 ריק ונוח",
  ok: "🟡 סביר",
  crowded: "🔴 עומס גדול",
};

export function CommunityReports({
  placeId,
  placeName,
  initialCounts,
}: {
  placeId: string;
  placeName: string;
  /** Batched counts from the parent list; `undefined` = fetch for this card. */
  initialCounts?: ReportCounts | null;
}) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<PlaceReport[] | null>(null);
  const [status, setStatus] = useState<"open" | "closed" | "">("");
  const [crowd, setCrowd] = useState<"empty" | "ok" | "crowded" | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [counts, setCounts] = useState<ReportCounts | null>(initialCounts ?? null);

  useEffect(() => {
    if (initialCounts !== undefined) setCounts(initialCounts);
  }, [initialCounts]);

  const load = async () => {
    const { data, error } = await supabase
      .from("place_reports")
      .select("id, place_id, place_name, status, crowd, note, created_at")
      .eq("place_id", placeId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) {
      const list = data as PlaceReport[];
      setReports(list);
      setCounts({
        open: list.filter((r) => r.status === "open").length,
        closed: list.filter((r) => r.status === "closed").length,
        lastOpenAt: list.find((r) => r.status === "open")?.created_at ?? null,
      });
    }
  };

  // Fallback for cards rendered without batched counts.
  useEffect(() => {
    if (initialCounts !== undefined) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("place_reports")
        .select("status, created_at")
        .eq("place_id", placeId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!alive || !data) return;
      setCounts({
        open: data.filter((r: { status: string }) => r.status === "open").length,
        closed: data.filter((r: { status: string }) => r.status === "closed").length,
        lastOpenAt: data.find((r: { status: string }) => r.status === "open")?.created_at ?? null,
      });
    })();
    return () => {
      alive = false;
    };
  }, [placeId, initialCounts]);

  const submit = async () => {
    if (!status) {
      setMsg("בחרו אם היה פתוח או סגור");
      return;
    }
    if (recentlyReported(placeId)) {
      setMsg("כבר דיווחתם על המקום הזה היום – תודה!");
      return;
    }
    setSaving(true);
    setMsg("");
    const { error } = await supabase.from("place_reports").insert({
      place_id: placeId,
      place_name: placeName.slice(0, 200),
      status,
      crowd: crowd || null,
      note: note.trim().slice(0, 280) || null,
    });
    setSaving(false);
    if (error) {
      setMsg("שמירת הדיווח נכשלה, נסו שוב");
      return;
    }
    try {
      localStorage.setItem(throttleKey(placeId), String(Date.now()));
    } catch {
      /* private mode — skip throttle */
    }
    setMsg("תודה! הדיווח נשמר 🙏");
    setStatus("");
    setCrowd("");
    setNote("");
    await load();
  };

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next && reports === null) load();
          }}
          aria-expanded={open}
          className="glass-link"
        >
          🗣️ דיווחי הורים
        </button>
        {counts && (counts.open > 0 || counts.closed > 0) && (
          <>
            {counts.open > 0 && (
              <span className="glass-badge-success">
                👍 {counts.open} דיווחו פתוח בשבת
                {counts.lastOpenAt ? ` · אחרון ${daysAgoLabel(counts.lastOpenAt)}` : ""}
              </span>
            )}
            {counts.closed > 0 && (
              <span className="glass-badge-danger">👎 {counts.closed} דיווחו סגור</span>
            )}
          </>
        )}
      </div>

      {open && (
        <div className="glass-panel mt-2 rounded-2xl p-3 text-xs">
          <div className="font-semibold">היינו שם בשבת – מה היה?</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatus("open")}
              className={status === "open" ? "glass-badge-success" : "glass-badge-neutral"}
            >
              ✅ היה פתוח
            </button>
            <button
              type="button"
              onClick={() => setStatus("closed")}
              className={status === "closed" ? "glass-badge-danger" : "glass-badge-neutral"}
            >
              ⛔ היה סגור
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["empty", "ok", "crowded"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCrowd((prev) => (prev === c ? "" : c))}
                className={crowd === c ? "glass-badge-info" : "glass-badge-neutral"}
              >
                {CROWD_LABEL[c]}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 280))}
            rows={2}
            placeholder="הערה קצרה להורים אחרים (אופציונלי)"
            className="glass-field mt-2 w-full rounded-xl px-3 py-2"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="glass-btn-primary rounded-xl px-4 py-2 font-bold disabled:opacity-70"
            >
              {saving ? "שולח..." : "שליחת דיווח"}
            </button>
            {msg && <span className="text-foreground/80">{msg}</span>}
          </div>

          <div className="mt-3 space-y-2">
            {reports === null ? (
              <div className="text-muted-foreground">טוען דיווחים...</div>
            ) : reports.length === 0 ? (
              <div className="text-muted-foreground">אין עדיין דיווחים – היו הראשונים לדווח.</div>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="glass-chip rounded-xl px-3 py-2">
                  <span className={r.status === "open" ? "font-bold" : "font-bold"}>
                    {r.status === "open" ? "✅ היה פתוח" : "⛔ היה סגור"}
                  </span>
                  {r.crowd && <span> · {CROWD_LABEL[r.crowd]}</span>}
                  <span className="text-muted-foreground">
                    {" "}
                    · {new Date(r.created_at).toLocaleDateString("he-IL")}
                  </span>
                  {r.note && <div className="mt-1">{r.note}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
