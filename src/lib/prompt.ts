/**
 * Turns the main card's quick choices (vibe, ages, drive time, budget, free
 * text) into one natural-language request for the AI search.
 * No runtime imports, so it can be unit-tested with `node --test`.
 */

export const VIBES = [
  { id: "water", label: "מים", emoji: "🏊", terms: "פארק מים, בריכה או חוף" },
  { id: "indoor", label: "ממוזג", emoji: "❄️", terms: "מקום ממוזג בפנים" },
  { id: "nature", label: "טבע", emoji: "🌳", terms: "טבע, פארק או מסלול קל" },
  { id: "create", label: "יצירה", emoji: "🎨", terms: "סדנת יצירה או מוזיאון ילדים אינטראקטיבי" },
  { id: "animals", label: "חיות", emoji: "🐘", terms: "גן חיות, ספארי או פינת חי" },
  { id: "action", label: "אקשן", emoji: "🏎️", terms: "אקשן – טרמפולינות, קארטינג, פארק אתגרים" },
] as const;

export const BUDGETS = [
  { id: "any", label: "לא משנה", text: "" },
  { id: "free", label: "חינם", text: "בחינם לגמרי" },
  { id: "150", label: "עד 150 ₪", text: "עד 150 ₪ למשפחה" },
  { id: "300", label: "עד 300 ₪", text: "עד 300 ₪ למשפחה" },
] as const;

export const DRIVES = [15, 30, 45, 60] as const;

export type PlanChoices = {
  vibe: string;
  ages: string;
  drive: number;
  budget: string;
  freeText: string;
  originLabel: string | null;
};

export const DEFAULT_PLAN: Omit<PlanChoices, "originLabel"> = {
  vibe: "",
  ages: "",
  drive: 30,
  budget: "any",
  freeText: "",
};

export function buildPrompt(c: PlanChoices, mode: "search" | "itinerary" = "search"): string {
  const vibe = VIBES.find((v) => v.id === c.vibe);
  const budget = BUDGETS.find((b) => b.id === c.budget);
  const parts = [
    mode === "itinerary"
      ? "תבנו לנו מסלול שלם לשבת עם הילדים (בוקר, צהריים, אחר הצהריים)"
      : "אנחנו מחפשים בילוי משפחתי לשבת",
    c.ages.trim() ? `לילדים בגילאי ${c.ages.trim()}` : "",
    c.originLabel ? `יוצאים מ${c.originLabel}` : "",
    `עד ${c.drive} דקות נסיעה`,
    budget?.text ?? "",
    vibe ? `בא לנו ${vibe.terms}` : "",
    "חשוב שיהיה פתוח בשבת ומתאים למשפחה עם ילדים",
  ].filter(Boolean);
  const sentence = parts.join(", ") + ".";
  const extra = c.freeText.trim();
  return (extra ? `${sentence} פרטים נוספים מההורים: ${extra}` : sentence).slice(0, 600);
}
