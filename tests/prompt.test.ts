import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHints, buildPrompt, DEFAULT_PLAN, parseAges, VIBES } from "../src/lib/prompt.ts";

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

test("ages are parsed from free-form text", () => {
  assert.deepEqual(parseAges("4 ו־7"), [4, 7]);
  assert.deepEqual(parseAges("בני 2,4"), [2, 4]);
  assert.deepEqual(parseAges("גיל 30 ו-5"), [5]);
  assert.deepEqual(parseAges(""), []);
});

test("every vibe produces real search terms; indoor/nature set the environment", () => {
  for (const v of VIBES) {
    const h = buildHints({ vibe: v.id, ages: "", drive: 30, budget: "any" });
    assert.ok(h.keywords.length >= 1, `${v.id} has keywords`);
  }
  assert.equal(
    buildHints({ vibe: "indoor", ages: "", drive: 30, budget: "any" }).indoorPreference,
    "ממוזג",
  );
  assert.equal(
    buildHints({ vibe: "nature", ages: "", drive: 30, budget: "any" }).indoorPreference,
    "פתוח",
  );
  assert.equal(buildHints({ vibe: "", ages: "", drive: 30, budget: "any" }).indoorPreference, null);
});

test("budget, drive time and ages become structured hints", () => {
  const h = buildHints({ vibe: "", ages: "4 ו 2", drive: 45, budget: "150" });
  assert.deepEqual(h.ages, [4, 2]);
  assert.equal(h.maxDriveMinutes, 45);
  assert.equal(h.budget, 150);
  assert.equal(h.freeOnly, false);
  assert.equal(buildHints({ vibe: "", ages: "", drive: 30, budget: "free" }).freeOnly, true);
});
