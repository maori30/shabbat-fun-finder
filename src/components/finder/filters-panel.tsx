import type { EnvFilter } from "@/lib/filters";

/** Collapsible filters; they apply live to whatever list is on screen. */
export function FiltersPanel({
  shabbatOnly,
  setShabbatOnly,
  age,
  setAge,
  env,
  setEnv,
  activeFilterCount,
}: {
  shabbatOnly: boolean;
  setShabbatOnly: (v: boolean) => void;
  age: number | "";
  setAge: (v: number | "") => void;
  env: EnvFilter;
  setEnv: (v: EnvFilter) => void;
  activeFilterCount: number;
}) {
  return (
    <details className="glass-panel group rounded-2xl p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold">
        ⚙️ סינון התוצאות {activeFilterCount > 0 ? `(${activeFilterCount} פעילים)` : ""}
      </summary>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shabbatOnly}
            onChange={(e) => setShabbatOnly(e.target.checked)}
            className="h-5 w-5 accent-primary"
          />
          בלי מקומות שסגורים בשבת
        </label>
        <select
          value={age === "" ? "" : String(age)}
          onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
          className="glass-select rounded-xl px-3 py-2 text-sm"
          aria-label="גיל הילד"
        >
          <option value="">כל הגילאים</option>
          {Array.from({ length: 19 }, (_, i) => i).map((n) => (
            <option key={n} value={n}>
              גיל {n}
            </option>
          ))}
        </select>
        <select
          value={env}
          onChange={(e) => setEnv(e.target.value as EnvFilter)}
          className="glass-select rounded-xl px-3 py-2 text-sm"
          aria-label="סינון לפי סביבה"
        >
          <option value="all">בפנים או בחוץ</option>
          <option value="ממוזג">❄️ ממוזג / בפנים</option>
          <option value="פתוח">🌳 בחוץ</option>
          <option value="משולב">🔀 משולב</option>
        </select>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        מקומות שאין עליהם מידע (למשל שעות שבת לא ידועות) לא מוסתרים – הם מסומנים "לא אומת" בכרטיס.
      </p>
    </details>
  );
}
