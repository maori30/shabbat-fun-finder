import { useState } from "react";
import { BUDGETS, DRIVES, VIBES } from "@/lib/prompt";
import type { Origin, RecentCity } from "@/lib/finder-utils";
import { Spinner } from "./spinner";

/**
 * The one main card: (1) where are you leaving from, (2) what do you feel
 * like, then one primary button. Everything else on the page is secondary.
 */
export function PlanPanel(props: {
  // location
  origin: Origin | null;
  nearCity: string;
  cityNames: string[];
  pickCity: (city: string) => void;
  locateMe: () => void;
  geoBlocked: boolean;
  geoStatus: string;
  cityInput: string;
  setCityInput: (v: string) => void;
  lookupCity: () => void;
  cityLookupLoading: boolean;
  recentCitySearches: RecentCity[];
  selectRecentCity: (item: RecentCity) => void;
  removeRecentCity: (cityName: string) => void;
  // choices
  vibe: string;
  setVibe: (v: string) => void;
  ages: string;
  setAges: (v: string) => void;
  drive: number;
  setDrive: (v: number) => void;
  budget: string;
  setBudget: (v: string) => void;
  freeText: string;
  setFreeText: (v: string) => void;
  // actions
  onFind: () => void;
  onBuild: () => void;
  onOpenNow: () => void;
  aiLoading: boolean;
  itineraryLoading: boolean;
  openNowLoading: boolean;
  error: string;
  locationMissing: boolean;
}) {
  const p = props;
  const [otherCity, setOtherCity] = useState(false);
  const detailsCount =
    (p.ages.trim() ? 1 : 0) +
    (p.drive !== 30 ? 1 : 0) +
    (p.budget !== "any" ? 1 : 0) +
    (p.freeText.trim() ? 1 : 0);
  const recent = p.recentCitySearches.filter((r) => r.result.label !== p.origin?.label).slice(0, 3);
  const busy = p.aiLoading || p.openNowLoading;

  return (
    <section
      id="plan"
      aria-labelledby="plan-title"
      className="glass-panel scroll-mt-4 space-y-5 rounded-3xl p-4 sm:p-5"
    >
      <div>
        <h2 id="plan-title" className="text-xl font-extrabold">
          מה עושים השבת? 🎈
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          שתי שאלות קצרות, ואנחנו נמצא לכם מקומות שפתוחים בשבת ומתאימים לילדים.
        </p>
      </div>

      {/* 1 — origin */}
      <div
        className={`rounded-2xl p-3 transition-shadow ${
          p.locationMissing ? "ring-2 ring-rose-500/70" : ""
        }`}
      >
        <div className="text-sm font-bold">
          <span className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            1
          </span>
          מאיפה יוצאים?
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={p.nearCity}
            onChange={(e) => p.pickCity(e.target.value)}
            className="glass-select min-w-0 flex-1 rounded-2xl px-3 py-2.5 text-sm sm:flex-none"
            aria-label="בחירת עיר"
          >
            <option value="">{p.origin && !p.nearCity ? p.origin.label : "בחרו עיר..."}</option>
            {p.cityNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {!p.geoBlocked && (
            <button
              type="button"
              onClick={p.locateMe}
              className="glass-btn rounded-2xl px-3 py-2.5 text-sm"
            >
              📍 המיקום שלי
            </button>
          )}
          <button
            type="button"
            onClick={() => setOtherCity((v) => !v)}
            aria-expanded={otherCity}
            className="text-xs text-muted-foreground underline"
          >
            יישוב אחר?
          </button>
        </div>
        {otherCity && (
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              p.lookupCity();
            }}
          >
            <input
              value={p.cityInput}
              onChange={(e) => p.setCityInput(e.target.value)}
              placeholder="הקלידו שם של כל יישוב בארץ"
              aria-label="הקלדת שם יישוב"
              maxLength={80}
              className="glass-field min-w-0 flex-1 rounded-2xl px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={p.cityLookupLoading || !p.cityInput.trim()}
              className="glass-btn rounded-2xl px-3 py-2 text-sm disabled:opacity-60"
            >
              {p.cityLookupLoading ? "..." : "קבע"}
            </button>
          </form>
        )}
        {recent.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">אחרונים:</span>
            {recent.map((item) => (
              <span
                key={item.cityName}
                className="glass-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
              >
                <button type="button" onClick={() => p.selectRecentCity(item)}>
                  {item.cityName}
                </button>
                <button
                  type="button"
                  onClick={() => p.removeRecentCity(item.cityName)}
                  aria-label={`הסר ${item.cityName} מהאחרונים`}
                  className="text-muted-foreground"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        {p.origin && (
          <div className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            ✓ יוצאים מ{p.origin.label}
          </div>
        )}
        {p.geoStatus && (
          <div
            role="status"
            className={`mt-2 text-xs ${
              /^(מאתר|מחפשים סביב)/.test(p.geoStatus)
                ? "text-muted-foreground"
                : "text-rose-700 dark:text-rose-300"
            }`}
          >
            {p.geoStatus}
          </div>
        )}
      </div>

      {/* 2 — vibe */}
      <div className="px-3">
        <div className="text-sm font-bold">
          <span className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            2
          </span>
          מה בא לכם? <span className="font-normal text-muted-foreground">(לא חובה)</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {VIBES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => p.setVibe(p.vibe === v.id ? "" : v.id)}
              aria-pressed={p.vibe === v.id}
              className={`rounded-2xl px-2 py-2.5 text-sm font-bold transition-transform active:scale-95 ${
                p.vibe === v.id ? "glass-btn-primary ring-2 ring-primary/60" : "glass-btn"
              }`}
            >
              <span className="block text-xl">{v.emoji}</span>
              {v.label}
            </button>
          ))}
        </div>

        <details className="mt-3 text-sm" open={detailsCount > 0 || undefined}>
          <summary className="cursor-pointer select-none text-muted-foreground">
            ➕ גילאים, זמן נסיעה, תקציב או כל בקשה אחרת
            {detailsCount > 0 ? ` (${detailsCount})` : ""}
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="font-semibold">גילאי הילדים</span>
              <input
                value={p.ages}
                onChange={(e) => p.setAges(e.target.value)}
                placeholder="למשל 4 ו־7"
                maxLength={40}
                className="glass-field mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <div>
              <span className="font-semibold">זמן נסיעה</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {DRIVES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => p.setDrive(d)}
                    aria-pressed={p.drive === d}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                      p.drive === d ? "glass-btn-primary" : "glass-btn"
                    }`}
                  >
                    {d} דק'
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="font-semibold">תקציב</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {BUDGETS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => p.setBudget(b.id)}
                    aria-pressed={p.budget === b.id}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                      p.budget === b.id ? "glass-btn-primary" : "glass-btn"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="mt-3 block">
            <span className="font-semibold">משהו נוסף?</span>
            <textarea
              value={p.freeText}
              onChange={(e) => p.setFreeText(e.target.value)}
              rows={2}
              maxLength={400}
              placeholder="למשל: התינוקת בעגלה, רוצים גם מקום לאכול"
              className="glass-field mt-1 w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>
        </details>
      </div>

      {/* actions */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={p.onFind}
          disabled={busy}
          className="glass-btn-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-extrabold shadow-lg shadow-primary/30 disabled:opacity-70"
        >
          {p.aiLoading && !p.itineraryLoading ? (
            <>
              <Spinner /> מחפשים בשבילכם...
            </>
          ) : (
            "✨ מצא לי מה לעשות"
          )}
        </button>
        <button
          type="button"
          onClick={p.onBuild}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-3 text-base font-bold text-white shadow-md hover:from-purple-600 hover:to-indigo-600 disabled:opacity-70"
        >
          {p.itineraryLoading ? (
            <>
              <Spinner /> בונים לכם מסלול...
            </>
          ) : (
            "🎲 תבנו לי את כל השבת"
          )}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          "מצא לי" – רשימת מקומות עם המלצה מובילה · "תבנו לי" – מסלול בוקר ← צהריים ← אחה״צ
        </p>
        <div className="text-center">
          <button
            type="button"
            onClick={p.onOpenNow}
            disabled={busy}
            className="text-sm font-semibold text-primary underline disabled:opacity-60"
          >
            {p.openNowLoading ? "מאתרים..." : "⚡ או: מה פתוח עכשיו קרוב אליי"}
          </button>
        </div>
        {p.error && (
          <div role="alert" className="text-center text-sm text-rose-700 dark:text-rose-300">
            {p.error}
          </div>
        )}
      </div>
    </section>
  );
}
