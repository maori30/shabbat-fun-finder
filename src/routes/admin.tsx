import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listSuggestions, reviewSuggestion, type PendingSuggestion } from "@/lib/admin.functions";
import { parseCoords } from "@/lib/coords";
import { ImportFromUrl } from "@/components/admin/import-from-url";
import { InsightsPanel } from "@/components/admin/insights-panel";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "ניהול הצעות | כיף לילדים" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminPage,
});

const PASSWORD_KEY = "kids_admin_pw";

function AdminPage() {
  const listFn = useServerFn(listSuggestions);
  const reviewFn = useServerFn(reviewSuggestion);
  const [password, setPassword] = useState("");
  // Read after mount (not during render) to keep SSR and hydration in sync.
  useEffect(() => {
    try {
      setPassword(sessionStorage.getItem(PASSWORD_KEY) ?? "");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const [status, setStatus] = useState<"pending" | "approved">("pending");
  const [rows, setRows] = useState<PendingSuggestion[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [coords, setCoords] = useState<Record<string, string>>({});

  const load = async (which = status) => {
    setLoading(true);
    setError("");
    try {
      const res = await listFn({ data: { password, status: which } });
      if (!res.ok) {
        setError(res.error);
        setRows(null);
        return;
      }
      try {
        sessionStorage.setItem(PASSWORD_KEY, password);
      } catch {
        /* ignore */
      }
      setRows(res.data);
      setCoords(
        Object.fromEntries(
          res.data.map((r) => [r.id, r.lat !== null && r.lng !== null ? `${r.lat}, ${r.lng}` : ""]),
        ),
      );
    } catch {
      setError("הטעינה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const review = async (row: PendingSuggestion, action: "approve" | "reject" | "unapprove") => {
    if (action === "reject" && !confirm(`למחוק את "${row.name}"?`)) return;
    const parsed = parseCoords(coords[row.id] ?? "");
    if (action === "approve" && !parsed) {
      setError(`"${row.name}": חסר מיקום. הדביקו "lat, lng" או קישור מגוגל מפות.`);
      return;
    }
    setBusyId(row.id);
    setError("");
    try {
      const res = await reviewFn({
        data: { password, id: row.id, action, lat: parsed?.lat ?? null, lng: parsed?.lng ?? null },
      });
      if (!res.ok) setError(`"${row.name}": ${res.error}`);
      else setRows((prev) => prev?.filter((r) => r.id !== row.id) ?? null);
    } catch {
      setError("הפעולה נכשלה");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">ניהול הצעות הורים</h1>
          <Link to="/" className="text-sm underline">
            חזרה לאתר
          </Link>
        </div>

        <form
          className="glass-panel flex flex-wrap items-center gap-2 rounded-2xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמת ניהול"
            aria-label="סיסמת ניהול"
            autoComplete="current-password"
            className="glass-field min-w-0 flex-1 rounded-xl px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => {
              const next = e.target.value as "pending" | "approved";
              setStatus(next);
              if (rows) void load(next);
            }}
            className="glass-select rounded-xl px-3 py-2 text-sm"
            aria-label="סוג הצעות"
          >
            <option value="pending">ממתינות לאישור</option>
            <option value="approved">מאושרות</option>
          </select>
          <button
            type="submit"
            disabled={loading || !password}
            className="glass-btn-primary rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60"
          >
            {loading ? "טוען..." : "טען"}
          </button>
        </form>

        <InsightsPanel password={password} />

        <ImportFromUrl password={password} />

        {error && (
          <div role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {rows && rows.length === 0 && (
          <div className="glass-empty rounded-2xl p-6 text-center text-muted-foreground">
            אין הצעות {status === "pending" ? "שממתינות לאישור" : "מאושרות"}.
          </div>
        )}

        {rows?.map((r) => {
          const parsed = parseCoords(coords[r.id] ?? "");
          return (
            <article key={r.id} className="glass-card space-y-2 rounded-2xl p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold">{r.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("he-IL")}
                </span>
              </div>
              <div className="text-muted-foreground">
                📍 {r.city ?? "—"} · שבת:{" "}
                {r.open_shabbat === true ? "פתוח" : r.open_shabbat === false ? "סגור" : "לא ידוע"}
                {r.environment ? ` · ${r.environment}` : ""}
                {r.min_age !== null || r.max_age !== null
                  ? ` · גילאי ${r.min_age ?? "?"}–${r.max_age ?? "?"}`
                  : ""}
              </div>
              {r.description && <p>{r.description}</p>}
              <div className="flex flex-wrap gap-2 text-xs">
                {r.stroller_accessible && <span className="glass-badge">♿ עגלות</span>}
                {r.changing_table && <span className="glass-badge">🍼 החתלה</span>}
                {r.easy_parking && <span className="glass-badge">🅿️ חניה</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={coords[r.id] ?? ""}
                  onChange={(e) => setCoords((c) => ({ ...c, [r.id]: e.target.value }))}
                  placeholder='מיקום: "31.77, 35.21" או קישור מגוגל מפות'
                  aria-label={`מיקום עבור ${r.name}`}
                  className="glass-field min-w-0 flex-1 rounded-xl px-3 py-2 text-xs"
                />
                <a
                  className="glass-link text-xs"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={
                    parsed
                      ? `https://www.google.com/maps/search/?api=1&query=${parsed.lat},${parsed.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${r.city ?? ""}`)}`
                  }
                >
                  🗺️ {parsed ? "בדיקה במפה" : "חיפוש במפה"}
                </a>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {status === "pending" ? (
                  <button
                    onClick={() => review(r, "approve")}
                    disabled={busyId === r.id}
                    className="glass-btn-primary rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60"
                  >
                    ✅ אישור
                  </button>
                ) : (
                  <button
                    onClick={() => review(r, "unapprove")}
                    disabled={busyId === r.id}
                    className="glass-btn rounded-xl px-4 py-2 text-sm disabled:opacity-60"
                  >
                    ↩️ החזרה להמתנה
                  </button>
                )}
                <button
                  onClick={() => review(r, "reject")}
                  disabled={busyId === r.id}
                  className="glass-btn rounded-xl px-4 py-2 text-sm text-rose-700 disabled:opacity-60 dark:text-rose-300"
                >
                  🗑️ מחיקה
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
