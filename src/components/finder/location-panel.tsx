import type { Origin, RecentCity } from "@/lib/finder-utils";
import { MAX_RADIUS_KM } from "@/lib/finder-utils";
import { Spinner } from "./spinner";

/** Step 3: GPS / city / free-text location, radius, and keyword search. */
export function LocationPanel({
  runOpenNowNearby,
  openNowLoading,
  geoBlocked,
  origin,
  locateMe,
  nearCity,
  pickCity,
  cityNames,
  lookupCity,
  cityInput,
  setCityInput,
  cityLookupLoading,
  radius,
  setRadius,
  clearNearby,
  geoStatus,
  recentCitySearches,
  selectRecentCity,
  removeRecentCity,
  query,
  setQuery,
  searchLoading,
  runGoogleSearch,
  activityMode,
  setActivityMode,
  searchError,
}: {
  runOpenNowNearby: () => void;
  openNowLoading: boolean;
  geoBlocked: boolean;
  origin: Origin | null;
  locateMe: () => void;
  nearCity: string;
  pickCity: (city: string) => void;
  cityNames: string[];
  lookupCity: () => void;
  cityInput: string;
  setCityInput: (v: string) => void;
  cityLookupLoading: boolean;
  radius: number;
  setRadius: (v: number) => void;
  clearNearby: () => void;
  geoStatus: string;
  recentCitySearches: RecentCity[];
  selectRecentCity: (item: RecentCity) => void;
  removeRecentCity: (cityName: string) => void;
  query: string;
  setQuery: (v: string) => void;
  searchLoading: boolean;
  runGoogleSearch: () => void;
  activityMode: boolean;
  setActivityMode: (v: boolean) => void;
  searchError: string;
}) {
  return (
    <section className="glass-panel rounded-2xl p-4">
      <h2 className="text-lg font-bold">📍 או חפשו לבד לפי מיקום</h2>
      <div className="mt-3 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <button
          onClick={runOpenNowNearby}
          disabled={openNowLoading || (geoBlocked && !origin)}
          className="glass-btn-primary rounded-2xl px-4 py-2 text-sm font-bold disabled:opacity-70"
          title={geoBlocked && !origin ? "בחרו עיר קרובה כדי להפעיל" : undefined}
        >
          {openNowLoading
            ? "מאתר בסביבה..."
            : geoBlocked && origin
              ? `⚡ מה פתוח עכשיו סביב ${origin.label}`
              : "⚡ מה פתוח עכשיו בסביבתי"}
        </button>
        {!geoBlocked && (
          <button onClick={() => locateMe()} className="glass-btn rounded-2xl px-3 py-2 text-sm">
            📍 השתמשו במיקום שלי
          </button>
        )}
        <span className="text-sm text-muted-foreground">או</span>
        <select
          value={nearCity}
          onChange={(e) => pickCity(e.target.value)}
          className="glass-select rounded-2xl px-3 py-2 text-sm"
          aria-label="בחירת עיר קרובה"
        >
          <option value="">בחרו עיר...</option>
          {cityNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void lookupCity();
          }}
        >
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="או הקלידו כל יישוב"
            aria-label="הקלדת שם יישוב"
            maxLength={80}
            className="glass-field w-full min-w-0 rounded-2xl px-3 py-2 text-sm md:w-44"
          />
          <button
            type="submit"
            disabled={cityLookupLoading || !cityInput.trim()}
            className="glass-btn rounded-2xl px-3 py-2 text-sm disabled:opacity-60"
          >
            {cityLookupLoading ? "..." : "קבע"}
          </button>
        </form>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="radius-range" className="whitespace-nowrap text-sm">
          רדיוס: {radius} ק"מ
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
        {origin && (
          <button onClick={clearNearby} className="glass-btn rounded-2xl px-3 py-1.5 text-sm">
            נקה מיקום
          </button>
        )}
      </div>
      {origin && (
        <div className="mt-1 text-xs text-muted-foreground">
          מחפשים עד {Math.min(radius, MAX_RADIUS_KM)} ק"מ מ־{origin.label}
        </div>
      )}
      {geoStatus && (
        <div
          role="status"
          className={`mt-2 text-sm ${
            /^(מאתר|מחפשים סביב)/.test(geoStatus)
              ? "text-muted-foreground"
              : "text-rose-700 dark:text-rose-300"
          }`}
        >
          {geoStatus}
        </div>
      )}

      {recentCitySearches.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">🕘 אחרונים:</span>
          {recentCitySearches.map((item) => (
            <div
              key={item.cityName}
              className={`glass-chip inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
                origin?.label === item.result.label ? "ring-2 ring-primary/60" : ""
              }`}
            >
              <button onClick={() => selectRecentCity(item)} className="hover:underline">
                {item.cityName}
              </button>
              <button
                onClick={() => removeRecentCity(item.cityName)}
                aria-label={`הסר ${item.cityName} מהיסטוריית החיפושים`}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && origin && !searchLoading) void runGoogleSearch();
          }}
          placeholder="מה מחפשים? (לא חובה) – למשל: משחקייה, בריכה"
          aria-label="חיפוש לפי שם או סוג מקום"
          maxLength={100}
          className="glass-field w-full min-w-0 rounded-xl px-3 py-2.5 text-sm sm:flex-1"
        />
        <button
          onClick={runGoogleSearch}
          disabled={searchLoading || !origin}
          title={!origin ? "בחרו קודם מיקום" : undefined}
          className="glass-btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-bold shadow-lg shadow-primary/30 transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
        >
          {searchLoading ? (
            <>
              <Spinner /> מחפש...
            </>
          ) : (
            <>🔎 חפש אטרקציות</>
          )}
        </button>
      </div>
      <label className="glass-chip mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={activityMode}
          onChange={(e) => setActivityMode(e.target.checked)}
          className="accent-emerald-600"
        />
        <span>🎡 אטרקציות בלבד (בלי מסעדות ובתי קפה)</span>
      </label>
      {searchError && (
        <div role="status" className="mt-2 text-sm text-rose-700 dark:text-rose-300">
          {searchError}
        </div>
      )}
    </section>
  );
}
