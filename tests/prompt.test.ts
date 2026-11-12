import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, DEFAULT_PLAN } from "../src/lib/prompt.ts";

test("minimal prompt still names Shabbat, drive time and origin", () => {
  const p = buildPrompt({ ...DEFAULT_PLAN, originLabel: "חיפה" });
  assert.match(p, /לשבת/);
  assert.match(p, /עד 30 דקות נסיעה/);
  assert.match(p, /יוצאים מחיפה/);
  assert.match(p, /פתוח בשבת/);
});

test("all choices are included", () => {
  const p = buildPrompt({
    vibe: "water",
    ages: "4 ו-7",
    drive: 45,
    budget: "free",
    freeText: "בלי מדרגות",
    originLabel: "המיקום שלי",
  });
  assert.match(p, /פארק מים/);
  assert.match(p, /לילדים בגילאי 4 ו-7/);
  assert.match(p, /עד 45 דקות/);
  assert.match(p, /בחינם/);
  assert.match(p, /פרטים נוספים מההורים: בלי מדרגות/);
});

test("itinerary mode asks for a full-day plan", () => {
  const p = buildPrompt({ ...DEFAULT_PLAN, originLabel: null }, "itinerary");
  assert.match(p, /מסלול שלם/);
  assert.doesNotMatch(p, /יוצאים מ/);
});

test("prompt is capped at the server limit", () => {
  const p = buildPrompt({ ...DEFAULT_PLAN, freeText: "א".repeat(2000), originLabel: null });
  assert.ok(p.length <= 600);
});
