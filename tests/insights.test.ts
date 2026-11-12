import { test } from "node:test";
import assert from "node:assert/strict";
import { areaLabel, roundCoord, summarizeInsights, type InsightRow } from "../src/lib/insights.ts";

test("location is coarsened and personal labels are dropped", () => {
  assert.equal(roundCoord(32.0878), 32.1);
  assert.equal(roundCoord(34.8878), 34.9);
  assert.equal(roundCoord(31.66), 31.65);
  assert.equal(areaLabel("אשקלון"), "אשקלון");
  assert.equal(areaLabel("המיקום שלי"), null);
  assert.equal(areaLabel("רחוב הרצל 123"), null);
  assert.equal(areaLabel(""), null);
});

const row = (over: Partial<InsightRow>): InsightRow => ({
  created_at: "2026-11-12T10:00:00Z",
  kind: "ai",
  area: null,
  lat: null,
  lng: null,
  vibe: null,
  indoor: null,
  free_only: null,
  result_count: 20,
  ...over,
});

test("areas with many low-result searches come first, with what people wanted", () => {
  const rows = [
    row({ area: "תל אביב", result_count: 30 }),
    row({ area: "תל אביב", result_count: 25 }),
    row({ area: "אשקלון", result_count: 2, vibe: "indoor" }),
    row({ area: "אשקלון", result_count: 1, vibe: "indoor" }),
    row({ area: "אשקלון", result_count: 3, free_only: true }),
    row({ lat: 31.25, lng: 34.8, result_count: 4 }),
  ];
  const s = summarizeInsights(rows);
  assert.equal(s[0]!.area, "אשקלון");
  assert.equal(s[0]!.lowSearches, 3);
  assert.equal(s[0]!.avgResults, 2);
  assert.deepEqual(s[0]!.topWants, ["ממוזג", "חינם"]);
  assert.equal(s[1]!.area, "סביב 31.25, 34.8");
  assert.equal(s.at(-1)!.area, "תל אביב");
  assert.equal(s.at(-1)!.lowSearches, 0);
});
