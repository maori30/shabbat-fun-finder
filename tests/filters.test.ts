import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFilters, matchesFilters, shabbatStatus } from "../src/lib/filters.ts";

type P = Parameters<typeof matchesFilters>[0] & { id: string };

const place = (over: Partial<P> = {}): P => ({
  id: "x",
  openShabbat: null,
  saturdayHours: null,
  ageRange: null,
  environment: null,
  ...over,
});

const none = { shabbatOnly: false, age: "" as const, env: "all" as const };

test("shabbatStatus reads both the flag and Saturday hours", () => {
  assert.equal(shabbatStatus(place({ openShabbat: true })), true);
  assert.equal(shabbatStatus(place({ saturdayHours: "09:00-17:00" })), true);
  assert.equal(shabbatStatus(place({ openShabbat: false })), false);
  assert.equal(shabbatStatus(place()), null);
});

test("shabbatOnly hides known-closed places but keeps unknown ones", () => {
  const f = { ...none, shabbatOnly: true };
  assert.equal(matchesFilters(place({ openShabbat: false }), f), false);
  assert.equal(matchesFilters(place({ openShabbat: true }), f), true);
  assert.equal(matchesFilters(place(), f), true);
});

test("age filter uses the place's age range when known", () => {
  const f = { ...none, age: 3 };
  assert.equal(matchesFilters(place({ ageRange: { min: 6, max: 12 } }), f), false);
  assert.equal(matchesFilters(place({ ageRange: { min: 2, max: 8 } }), f), true);
  assert.equal(matchesFilters(place(), f), true);
});

test("environment filter: mixed places fit indoor and outdoor", () => {
  const indoor = { ...none, env: "ממוזג" as const };
  assert.equal(matchesFilters(place({ environment: "פתוח" }), indoor), false);
  assert.equal(matchesFilters(place({ environment: "ממוזג" }), indoor), true);
  assert.equal(matchesFilters(place({ environment: "משולב" }), indoor), true);
  const mixed = { ...none, env: "משולב" as const };
  assert.equal(matchesFilters(place({ environment: "ממוזג" }), mixed), false);
});

test("applyFilters puts verified-open first and keeps order inside groups", () => {
  const list = [
    place({ id: "a" }),
    place({ id: "b", openShabbat: true }),
    place({ id: "c", openShabbat: false }),
    place({ id: "d", saturdayHours: "10:00-18:00" }),
    place({ id: "e" }),
  ];
  const out = applyFilters(list, { ...none, shabbatOnly: true }).map((p) => p.id);
  assert.deepEqual(out, ["b", "d", "a", "e"]);
  assert.deepEqual(
    applyFilters(list, none).map((p) => p.id),
    ["a", "b", "c", "d", "e"],
  );
});
