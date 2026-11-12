import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CITY_COORDS,
  cityFromSlug,
  citySlug,
  distanceKm,
  resolveCityName,
} from "../src/lib/geo.ts";

test("distanceKm: Tel Aviv → Jerusalem is ~54 km", () => {
  const d = distanceKm(CITY_COORDS["תל אביב"]!, CITY_COORDS["ירושלים"]!);
  assert.ok(d > 50 && d < 58, `got ${d}`);
  assert.equal(distanceKm({ lat: 32, lng: 34 }, { lat: 32, lng: 34 }), 0);
});

test("city list has no duplicate spellings and uses current names", () => {
  assert.equal(CITY_COORDS["קרית גת"], undefined);
  assert.equal(CITY_COORDS["מודיעין"], undefined);
  assert.equal(CITY_COORDS["נצרת עילית"], undefined);
  assert.ok(CITY_COORDS["נוף הגליל"]);
});

test("aliases resolve old spellings", () => {
  assert.equal(resolveCityName("קרית גת"), "קריית גת");
  assert.equal(resolveCityName("נצרת עילית"), "נוף הגליל");
  assert.equal(resolveCityName(" חיפה "), "חיפה");
  assert.equal(resolveCityName("לא קיים"), null);
});

test("city slugs round-trip, including URL-encoded form", () => {
  for (const city of Object.keys(CITY_COORDS)) {
    assert.equal(cityFromSlug(citySlug(city)), city);
    assert.equal(cityFromSlug(encodeURIComponent(citySlug(city))), city);
  }
  assert.equal(cityFromSlug("%E0%A4%A"), null);
});
