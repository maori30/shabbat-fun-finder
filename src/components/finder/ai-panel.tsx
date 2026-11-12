import { Spinner } from "./spinner";

/** Step 2 of the page: free-text smart search + "build my Shabbat". */
export function AiPanel({
  aiPrompt,
  onPromptChange,
  aiLoading,
  itineraryLoading,
  aiSummary,
  aiError,
  onSearch,
  onItinerary,
  onClear,
}: {
  aiPrompt: string;
  onPromptChange: (value: string) => void;
  aiLoading: boolean;
  itineraryLoading: boolean;
  aiSummary: string;
  aiError: string;
  onSearch: () => void;
  onItinerary: () => void;
  onClear: () => void;
}) {
  return (
    <section className="glass-panel rounded-2xl p-4">
      <h2 className="text-lg font-bold">✨ ספרו לנו מה אתם מחפשים</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        משפט אחד מספיק – גילאי הילדים, מאיפה יוצאים, כמה זמן נסיעה ותקציב.
      </p>
      <textarea
        value={aiPrompt}
        onChange={(e) => onPromptChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !aiLoading) {
            e.preventDefault();
            onSearch();
          }
        }}
        rows={3}
        maxLength={600}
        aria-label="תיאור הפעילות שאתם מחפשים"
        placeholder="לדוגמה: יש לנו שני ילדים בני 4 ו־7, אנחנו מראש העין, רוצים משהו עד 30 דקות נסיעה ובחינם"
        className="glass-field mt-3 w-full rounded-xl px-4 py-3 text-base"
      />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <button
            onClick={onSearch}
            disabled={aiLoading}
            className="glass-btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-bold disabled:opacity-70"
          >
            {aiLoading && !itineraryLoading ? (
              <>
                <Spinner /> מחפשים בשבילכם...
              </>
            ) : (
              "✨ מצא לי פעילות מתאימה"
            )}
          </button>
          <span className="px-1 text-center text-xs text-muted-foreground">
            רשימת מקומות מדורגת עם הסבר
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={onItinerary}
            disabled={aiLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-3 text-base font-bold text-white shadow-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-70"
          >
            {itineraryLoading ? (
              <>
                <Spinner /> בונה מסלול...
              </>
            ) : (
              "🎲 תבנה לי את השבת"
            )}
          </button>
          <span className="px-1 text-center text-xs text-muted-foreground">
            מסלול בוקר → צהריים → אחה״צ, לפי מזג האוויר
          </span>
        </div>
      </div>
      {(aiPrompt || aiSummary || aiError) && (
        <div className="mt-2 text-center">
          <button
            onClick={onClear}
            className="glass-btn inline-flex items-center gap-1 rounded-2xl px-4 py-1.5 text-xs"
          >
            ✕ נקה חיפוש
          </button>
        </div>
      )}
      {aiSummary && <div className="glass-panel mt-3 rounded-2xl p-3 text-sm">🤖 {aiSummary}</div>}
      {aiError && (
        <div role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">
          {aiError}
        </div>
      )}
    </section>
  );
}
