import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { importFromUrl, saveImported, type ImportDraft } from "@/lib/admin.functions";
import { parseCoords } from "@/lib/coords";
import { extractUrls } from "@/lib/page-extract";

type Item =
  | { key: string; url: string; status: "loading" }
  | { key: string; url: string; status: "error"; error: string }
  | { key: string; url: string; status: "ready"; draft: ImportDraft }
  | { key: string; url: string; status: "saved"; name: string };

/**
 * Admin tool: paste one or more attraction websites → the server reads each
 * one and the AI fills an attraction card (name, city, Shabbat hours, ages,
 * price…). Review, fix anything, then publish — it then appears in every
 * nearby search.
 */
export function ImportFromUrl({ password }: { password: string }) {
  const importFn = useServerFn(importFromUrl);
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const urls = extractUrls(text);

  const update = (key: string, next: Item) =>
    setItems((list) => list.map((it) => (it.key === key ? next : it)));

  const readAll = async () => {
    const batch: Item[] = urls.map((url, n) => ({
      key: `${Date.now()}-${n}`,
      url,
      status: "loading",
    }));
    setItems((list) => [...batch, ...list.filter((it) => it.status !== "saved")]);
    setText("");
    setRunning(true);
    // One at a time: gentle on the sites and on the AI rate limit.
    for (const it of batch) {
      try {
        const res = await importFn({ data: { password, url: it.url } });
        update(
          it.key,
          res.ok
            ? { key: it.key, url: it.url, status: "ready", draft: res.data }
            : { key: it.key, url: it.url, status: "error", error: res.error },
        );
      } catch {
        update(it.key, { key: it.key, url: it.url, status: "error", error: "הקריאה נכשלה" });
      }
    }
    setRunning(false);
  };

  const pending = items.filter((it) => it.status === "loading").length;

  return (
    <section className="glass-panel space-y-3 rounded-2xl p-4">
      <h2 className="text-lg font-bold">🔗 הוספת מקומות מקישורים לאתרים שלהם</h2>
      <p className="text-sm text-muted-foreground">
        מדביקים קישור אחד או כמה (עד 25, כל אחד בשורה) – המערכת קוראת כל אתר וממלאת כרטיס, כולל שעות
        שבת אם כתובות בו. בודקים, מתקנים ומפרסמים.
      </p>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void readAll();
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"https://...\nhttps://..."}
          aria-label="קישורים לאתרי אטרקציות"
          rows={3}
          dir="ltr"
          className="glass-field w-full rounded-xl px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={running || !password || urls.length === 0}
          className="glass-btn-primary rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60"
        >
          {running
            ? `קורא אתרים... (נשארו ${pending})`
            : urls.length > 1
              ? `קרא ${urls.length} אתרים`
              : "קרא את האתר"}
        </button>
      </form>
      {!password && <p className="text-xs text-muted-foreground">הקלידו קודם סיסמת ניהול למעלה.</p>}

      <div className="space-y-3">
        {items.map((it) => {
          if (it.status === "loading")
            return (
              <div key={it.key} className="glass-chip rounded-xl px-3 py-2 text-xs" dir="ltr">
                ⏳ {it.url}
              </div>
            );
          if (it.status === "error")
            return (
              <div key={it.key} role="status" className="glass-chip rounded-xl px-3 py-2 text-xs">
                <div dir="ltr" className="truncate text-muted-foreground">
                  {it.url}
                </div>
                <div className="text-rose-700 dark:text-rose-300">❌ {it.error}</div>
              </div>
            );
          if (it.status === "saved")
            return (
              <div
                key={it.key}
                role="status"
                className="glass-chip rounded-xl px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
              >
                ✅ "{it.name}" נשמר ויופיע בחיפושים באזור.
              </div>
            );
          return (
            <DraftEditor
              key={it.key}
              password={password}
              initial={it.draft}
              onCancel={() => setItems((list) => list.filter((x) => x.key !== it.key))}
              onSaved={(name) =>
                update(it.key, { key: it.key, url: it.url, status: "saved", name })
              }
            />
          );
        })}
      </div>
    </section>
  );
}

function DraftEditor({
  password,
  initial,
  onCancel,
  onSaved,
}: {
  password: string;
  initial: ImportDraft;
  onCancel: () => void;
  onSaved: (name: string) => void;
}) {
  const saveFn = useServerFn(saveImported);
  const [draft, setDraft] = useState<ImportDraft>(initial);
  const [coordsText, setCoordsText] = useState(
    initial.lat !== null && initial.lng !== null ? `${initial.lat}, ${initial.lng}` : "",
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>(
    initial.is_attraction ? "" : "⚠️ נראה שהדף הזה אינו אטרקציה לילדים – בדקו לפני שמירה.",
  );

  const save = async () => {
    const c = parseCoords(coordsText);
    if (!c) {
      setMsg('חסר מיקום – הדביקו "lat, lng" או קישור מגוגל מפות.');
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const res = await saveFn({ data: { password, draft: { ...draft, lat: c.lat, lng: c.lng } } });
      if (res.ok) onSaved(draft.name);
      else setMsg(res.error);
    } catch {
      setMsg("השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof ImportDraft>(key: K, value: ImportDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const field = "glass-field mt-1 w-full rounded-xl px-3 py-2 text-sm";
  const parsed = parseCoords(coordsText);

  return (
    <div className="glass-card space-y-3 rounded-2xl p-3">
      <div className="space-y-3 text-sm">
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
              value={draft.open_shabbat === true ? "yes" : draft.open_shabbat === false ? "no" : ""}
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
            onClick={onCancel}
            className="glass-btn rounded-xl px-4 py-2 text-sm"
          >
            ביטול
          </button>
        </div>
      </div>
      {msg && (
        <p role="status" className="text-sm text-rose-700 dark:text-rose-300">
          {msg}
        </p>
      )}
    </div>
  );
}
