import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { importFromUrl, saveImported, type ImportDraft } from "@/lib/admin.functions";
import { parseCoords } from "@/lib/coords";

/**
 * Admin tool: paste an attraction's website → the server reads it and the AI
 * fills an attraction card (name, city, Shabbat hours, ages, price…). Review,
 * fix anything, then publish — it then appears in every nearby search.
 */
export function ImportFromUrl({ password }: { password: string }) {
  const importFn = useServerFn(importFromUrl);
  const saveFn = useServerFn(saveImported);
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [coordsText, setCoordsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const read = async () => {
    setLoading(true);
    setMsg(null);
    setDraft(null);
    try {
      const res = await importFn({ data: { password, url } });
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      setDraft(res.data);
      setCoordsText(
        res.data.lat !== null && res.data.lng !== null ? `${res.data.lat}, ${res.data.lng}` : "",
      );
      if (!res.data.is_attraction) {
        setMsg({ ok: false, text: "⚠️ נראה שהדף הזה אינו אטרקציה לילדים – בדקו לפני שמירה." });
      }
    } catch {
      setMsg({ ok: false, text: "הקריאה נכשלה" });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    const c = parseCoords(coordsText);
    if (!c) {
      setMsg({ ok: false, text: 'חסר מיקום – הדביקו "lat, lng" או קישור מגוגל מפות.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await saveFn({ data: { password, draft: { ...draft, lat: c.lat, lng: c.lng } } });
      if (!res.ok) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: `✅ "${draft.name}" נשמר ויופיע בחיפושים באזור.` });
        setDraft(null);
        setUrl("");
        setCoordsText("");
      }
    } catch {
      setMsg({ ok: false, text: "השמירה נכשלה" });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof ImportDraft>(key: K, value: ImportDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  const field = "glass-field mt-1 w-full rounded-xl px-3 py-2 text-sm";
  const parsed = parseCoords(coordsText);

  return (
    <section className="glass-panel space-y-3 rounded-2xl p-4">
      <h2 className="text-lg font-bold">🔗 הוספת מקום מקישור לאתר שלו</h2>
      <p className="text-sm text-muted-foreground">
        מדביקים קישור לאתר של אטרקציה – המערכת קוראת את האתר וממלאת כרטיס (כולל שעות שבת אם כתובות
        בו). בודקים, מתקנים ומפרסמים.
      </p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void read();
        }}
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          aria-label="קישור לאתר האטרקציה"
          inputMode="url"
          dir="ltr"
          className="glass-field min-w-0 flex-1 rounded-xl px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !password || !url.trim()}
          className="glass-btn-primary rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60"
        >
          {loading ? "קורא את האתר..." : "קרא את האתר"}
        </button>
      </form>
      {!password && <p className="text-xs text-muted-foreground">הקלידו קודם סיסמת ניהול למעלה.</p>}
      {msg && (
        <p
          role="status"
          className={`text-sm ${msg.ok ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
        >
          {msg.text}
        </p>
      )}

      {draft && (
        <div className="space-y-3 border-t border-border pt-3 text-sm">
          <div className="text-xs text-muted-foreground">
            נקרא מ:{" "}
            <a
              href={draft.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              dir="ltr"
            >
              {draft.source_url}
            </a>{" "}
            · בדקו כל שדה – ה-AI יכול לטעות.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              שם המקום
              <input
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                className={field}
              />
            </label>
            <label>
              עיר / יישוב
              <input
                value={draft.city ?? ""}
                onChange={(e) => set("city", e.target.value || null)}
                className={field}
              />
            </label>
            <label>
              סוג המקום
              <input
                value={draft.category ?? ""}
                onChange={(e) => set("category", e.target.value || null)}
                placeholder="למשל: פינת חי"
                className={field}
              />
            </label>
            <label>
              פתוח בשבת?
              <select
                value={
                  draft.open_shabbat === true ? "yes" : draft.open_shabbat === false ? "no" : ""
                }
                onChange={(e) =>
                  set(
                    "open_shabbat",
                    e.target.value === "yes" ? true : e.target.value === "no" ? false : null,
                  )
                }
                className={`glass-select ${field}`}
              >
                <option value="">לא כתוב באתר</option>
                <option value="yes">כן</option>
                <option value="no">לא</option>
              </select>
            </label>
            <label>
              שעות בשבת
              <input
                value={draft.shabbat_hours ?? ""}
                onChange={(e) => set("shabbat_hours", e.target.value || null)}
                placeholder="למשל 10:00–17:00"
                dir="ltr"
                className={field}
              />
            </label>
            <label>
              בפנים / בחוץ
              <select
                value={draft.environment ?? ""}
                onChange={(e) =>
                  set("environment", (e.target.value || null) as ImportDraft["environment"])
                }
                className={`glass-select ${field}`}
              >
                <option value="">לא ידוע</option>
                <option value="ממוזג">ממוזג / בפנים</option>
                <option value="פתוח">בחוץ</option>
                <option value="משולב">משולב</option>
              </select>
            </label>
            <label>
              מגיל
              <input
                type="number"
                min={0}
                max={18}
                value={draft.min_age ?? ""}
                onChange={(e) =>
                  set("min_age", e.target.value === "" ? null : Number(e.target.value))
                }
                className={field}
              />
            </label>
            <label>
              עד גיל
              <input
                type="number"
                min={0}
                max={18}
                value={draft.max_age ?? ""}
                onChange={(e) =>
                  set("max_age", e.target.value === "" ? null : Number(e.target.value))
                }
                className={field}
              />
            </label>
            <label className="sm:col-span-2">
              מחיר
              <input
                value={draft.price ?? ""}
                onChange={(e) => set("price", e.target.value || null)}
                className={field}
              />
            </label>
            <label className="sm:col-span-2">
              תיאור קצר
              <textarea
                value={draft.description ?? ""}
                onChange={(e) => set("description", e.target.value || null)}
                rows={2}
                className={field}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1">
              מיקום {draft.lat !== null ? "(נמצא אוטומטית)" : "(לא נמצא – הדביקו)"}
              <input
                value={coordsText}
                onChange={(e) => setCoordsText(e.target.value)}
                placeholder='"31.77, 35.21" או קישור מגוגל מפות'
                dir="ltr"
                className={field}
              />
            </label>
            <a
              className="glass-link text-xs"
              target="_blank"
              rel="noopener noreferrer"
              href={
                parsed
                  ? `https://www.google.com/maps/search/?api=1&query=${parsed.lat},${parsed.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${draft.name} ${draft.city ?? ""}`)}`
              }
            >
              🗺️ {parsed ? "בדיקה במפה" : "חיפוש במפה"}
            </a>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="glass-btn-primary rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60"
            >
              {saving ? "שומר..." : "✅ שמור ופרסם"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="glass-btn rounded-xl px-4 py-2 text-sm"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
