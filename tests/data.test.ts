import { test } from "node:test";
import assert from "node:assert/strict";
import { ATTRACTIONS } from "../src/data/attractions.ts";

test("built-in attractions are well-formed", () => {
  const ids = new Set<number>();
  const names = new Set<string>();
  for (const a of ATTRACTIONS) {
    assert.ok(!ids.has(a.id), `duplicate id ${a.id}`);
    assert.ok(!names.has(a.name), `duplicate name ${a.name}`);
    ids.add(a.id);
    names.add(a.name);
    assert.ok(
      a.lat > 29.4 && a.lat < 33.4 && a.lng > 34.2 && a.lng < 35.9,
      `${a.name} outside Israel`,
    );
    assert.ok(a.minAge >= 0 && a.maxAge <= 18 && a.minAge <= a.maxAge, `${a.name} ages`);
    assert.ok([true, false, null].includes(a.openShabbat), `${a.name} openShabbat`);
    assert.ok(["ממוזג", "פתוח", "משולב"].includes(a.environment), `${a.name} environment`);
    assert.ok(["צפון", "מרכז", "דרום", "ירושלים"].includes(a.region), `${a.name} region`);
    assert.ok(a.name.trim().length >= 2 && a.description.trim().length >= 10, `${a.name} text`);
  }
  assert.ok(ATTRACTIONS.length >= 150);
});
