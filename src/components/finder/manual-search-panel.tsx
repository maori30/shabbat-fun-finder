import type { Origin } from "@/lib/finder-utils";
import { MAX_RADIUS_KM } from "@/lib/finder-utils";
import { Spinner } from "./spinner";

/**
 * Secondary, collapsed: browse *everything* around the chosen location
 * (no AI ranking), with an optional keyword and radius.
 */
export function ManualSearchPanel({
  origin,
  query,
  setQuery,
  radius,
  setRadius,
  activityMode,
  setActivityMode,
  searchLoading,
  runGoogleSearch,
}: {
  origin: Origin | null;
  query: string;
  setQuery: (v: string) => void;
  radius: number;
  setRadius: (v: number) => void;
  activityMode: boolean;
  setActivityMode: (v: boolean) => void;
  searchLoading: boolean;
  runGoogleSearch: () => void;
}) {
  return (
    <details className="glass-panel rounded-2xl p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold">
        🔎 מעדיפים לחפש לבד? כל המקומות סביבכם לפי מרחק
      </summary>
      <div className="mt-3 space-y-3">
        {!origin && (
          <p className="text-sm text-muted-foreground">בחרו קודם מאיפה יוצאים (בכרטיס למעלה).</p>
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && origin && !searchLoading) runGoogleSearch();
          }}
          placeholder="מה מחפשים? (לא חובה) – למשל: משחקייה, בריכה"
          aria-label="חיפוש לפי שם או סוג מקום"
          maxLength={100}
          className="glass-field w-full rounded-xl px-3 py-2.5 text-sm"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="radius-range" className="whitespace-nowrap text-sm">
            עד {radius} ק"מ
          </label>
          <input
            id="radius-range"
            type="range"
            min={5}
            max={MAX_RADIUS_KM}
            step={5}
            value={Math.min(radius, MAX_RADIUS_KM)}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={activityMode}
            onChange={(e) => setActivityMode(e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          🎡 אטרקציות בלבד (בלי מסעדות ובתי קפה)
        </label>
        <button
          type="button"
          onClick={runGoogleSearch}
          disabled={searchLoading || !origin}
          className="glass-btn inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-bold disabled:opacity-60"
        >
          {searchLoading ? (
            <>
              <Spinner /> מחפש...
            </>
          ) : (
            <>🔎 הצג את כל המקומות{origin ? ` סביב ${origin.label}` : ""}</>
          )}
        </button>
      </div>
    </details>
  );
}
