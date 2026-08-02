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

const CROWD_LABEL: Record<string, string> = {
  empty: "🟢 ריק ונוח",
  ok: "🟡 סביר",
  crowded: "🔴 עומס גדול",
};

export function CommunityReports({
  placeId,
  placeName,
}: {
  placeId: string;
  placeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<PlaceReport[] | null>(null);
  const [status, setStatus] = useState<"open" | "closed" | "">("");
  const [crowd, setCrowd] = useState<"empty" | "ok" | "crowded" | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [counts, setCounts] = useState<{ open: number; closed: number } | null>(null);

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
      });
    }
  };

  // Load the summary counts once per card so the badge is visible without opening.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("place_reports")
        .select("status")
        .eq("place_id", placeId)
        .limit(200);
      if (!alive || !data) return;
      setCounts({
        open: data.filter((r) => r.status === "open").length,
        closed: data.filter((r) => r.status === "closed").length,
      });
    })();
    return () => {
      alive = false;
    };
  }, [placeId]);

  const submit = async () => {
    if (!status) {
      setMsg("בחרו אם היה פתוח או סגור");
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
              <span className="glass-badge-success">👍 {counts.open} דיווחו פתוח בשבת</span>
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
