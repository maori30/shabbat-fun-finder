/**
 * Turns the main card's quick choices (vibe, ages, drive time, budget, free
 * text) into one natural-language request for the AI search.
 * No runtime imports, so it can be unit-tested with `node --test`.
 */

export const VIBES = [
  {
    id: "water",
    label: "מים",
    emoji: "🏊",
    terms: "פארק מים, בריכה או חוף",
    keywords: ["פארק מים", "בריכה לילדים"],
    env: null,
  },
  {
    id: "indoor",
    label: "ממוזג",
    emoji: "❄️",
    terms: "מקום ממוזג בפנים",
    keywords: ["משחקייה לילדים", "מוזיאון ילדים"],
    env: "ממוזג",
  },
  {
    id: "nature",
    label: "טבע",
    emoji: "🌳",
    terms: "טבע, פארק או מסלול קל",
    keywords: ["פארק", "שמורת טבע"],
    env: "פתוח",
  },
  {
    id: "create",
    label: "יצירה",
    emoji: "🎨",
    terms: "סדנת יצירה או מוזיאון ילדים אינטראקטיבי",
    keywords: ["סדנת יצירה לילדים", "מוזיאון ילדים"],
    env: "ממוזג",
  },
  {
    id: "animals",
    label: "חיות",
    emoji: "🐘",
    terms: "גן חיות, ספארי או פינת חי",
    keywords: ["פינת חי", "גן חיות"],
    env: null,
  },
  {
    id: "action",
    label: "אקשן",
    emoji: "🏎️",
    terms: "אקשן – טרמפולינות, קארטינג, פארק אתגרים",
    keywords: ["פארק טרמפולינות", "קארטינג"],
    env: null,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  emoji: string;
  terms: string;
  keywords: readonly string[];
  env: "ממוזג" | "פתוח" | null;
}[];

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

/**
 * Structured search hints sent alongside the prompt, so every choice on the
 * card filters the search directly instead of relying on the AI to parse it.
 */
export type SearchHints = {
  /** Vibe chip id (for anonymous insights). */
  vibe: string | null;
  keywords: string[];
  indoorPreference: "ממוזג" | "פתוח" | null;
  ages: number[];
  maxDriveMinutes: number;
  freeOnly: boolean;
  budget: number | null;
};

/** "4 ו־7", "2,4", "בני 3 ו 5" → [4, 7] … (0–18 only). */
export function parseAges(text: string): number[] {
  const nums = (text.match(/\d{1,2}/g) ?? []).map(Number).filter((n) => n >= 0 && n <= 18);
  return Array.from(new Set(nums)).slice(0, 6);
}

export function buildHints(c: Omit<PlanChoices, "originLabel" | "freeText">): SearchHints {
  const vibe = VIBES.find((v) => v.id === c.vibe);
  return {
    vibe: vibe?.id ?? null,
    keywords: vibe ? [...vibe.keywords] : [],
    indoorPreference: vibe?.env ?? null,
    ages: parseAges(c.ages),
    maxDriveMinutes: c.drive,
    freeOnly: c.budget === "free",
    budget: c.budget === "150" ? 150 : c.budget === "300" ? 300 : null,
  };
}
