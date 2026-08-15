import { useState } from "react";

/**
 * "מצב שבת" — one big button that turns the app into a family-outing
 * recommendation engine: it asks a single question (what do you feel like
 * today?) plus the essentials (ages, drive time, budget) and builds the
 * natural-language prompt for the AI search.
 */

const VIBES = [
  { id: "water", label: "מים", emoji: "🏊", terms: "פארק מים, בריכה או חוף" },
  { id: "indoor", label: "ממוזג", emoji: "❄️", terms: "מקום ממוזג בפנים" },
  { id: "nature", label: "טבע", emoji: "🌳", terms: "טבע, פארק או מסלול קל" },
  { id: "create", label: "יצירה", emoji: "🎨", terms: "סדנת יצירה או מוזיאון ילדים אינטראקטיבי" },
  { id: "animals", label: "חיות", emoji: "🐘", terms: "גן חיות, ספארי או פינת חי" },
  { id: "action", label: "אקשן", emoji: "🏎️", terms: "אקשן – טרמפולינות, קארטינג, פארק אתגרים" },
] as const;

const BUDGETS = [
  { id: "free", label: "חינם", text: "בחינם לגמרי" },
  { id: "150", label: "עד 150 ₪", text: "עד 150 ₪ למשפחה" },
  { id: "300", label: "עד 300 ₪", text: "עד 300 ₪ למשפחה" },
  { id: "any", label: "לא משנה", text: "" },
] as const;

const DRIVES = [15, 30, 45, 60] as const;

export function ShabbatMode({
  originLabel,
  loading,
  onSearch,
}: {
  originLabel: string | null;
  loading: boolean;
  onSearch: (prompt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [vibe, setVibe] = useState<string>("");
  const [ages, setAges] = useState<string>("");
  const [drive, setDrive] = useState<number>(30);
  const [budget, setBudget] = useState<string>("any");

  const run = () => {
    const vibeItem = VIBES.find((v) => v.id === vibe);
    const budgetItem = BUDGETS.find((b) => b.id === budget);
    const parts = [
      "אנחנו מחפשים בילוי משפחתי לשבת",
      ages.trim() ? `לילדים בגילאי ${ages.trim()}` : "",
      originLabel ? `אנחנו מ${originLabel}` : "",
      `עד ${drive} דקות נסיעה`,
      budgetItem?.text ? budgetItem.text : "",
      vibeItem ? `בא לנו ${vibeItem.terms}` : "",
      "חשוב שיהיה פתוח בשבת ומתאים למשפחה עם ילדים",
    ].filter(Boolean);
    onSearch(parts.join(", ") + ".");
  };

  return (
    <section className="glass-panel rounded-3xl p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="glass-btn-primary w-full rounded-3xl px-6 py-5 text-lg font-extrabold shadow-lg shadow-primary/30 transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        🕍 מחפש בילוי לשבת
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        נבחר לכם לפי פתיחה בשבת, גיל הילדים, מיזוג, מרחק ותקציב – ונמליץ על בחירה אחת מובילה
      </p>

      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="text-sm font-bold">מה בא לכם היום?</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVibe((prev) => (prev === v.id ? "" : v.id))}
                  aria-pressed={vibe === v.id}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold transition-transform hover:scale-[1.03] active:scale-95 ${
                    vibe === v.id ? "glass-btn-primary ring-2 ring-primary/60" : "glass-btn"
                  }`}
                >
                  <span className="text-lg">{v.emoji}</span> {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="font-semibold">גילאי הילדים</span>
              <input
                value={ages}
                onChange={(e) => setAges(e.target.value)}
                placeholder="למשל 4 ו־7"
                aria-label="גילאי הילדים"
                className="glass-field mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
              />
            </label>
            <div className="text-sm">
              <span className="font-semibold">זמן נסיעה</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {DRIVES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDrive(d)}
                    aria-pressed={drive === d}
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${
                      drive === d ? "glass-btn-primary" : "glass-btn"
                    }`}
                  >
                    {d} דק'
                  </button>
                ))}
              </div>
            </div>
            <div className="text-sm">
              <span className="font-semibold">תקציב</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBudget(b.id)}
                    aria-pressed={budget === b.id}
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${
                      budget === b.id ? "glass-btn-primary" : "glass-btn"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="glass-btn-primary w-full rounded-2xl px-6 py-4 text-base font-extrabold disabled:opacity-70"
          >
            {loading ? "בונים לכם המלצה..." : "✨ תמצאו לי מה לעשות בשבת"}
          </button>
        </div>
      )}
    </section>
  );
}
