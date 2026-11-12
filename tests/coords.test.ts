import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCoords } from "../src/lib/coords.ts";

test("plain 'lat, lng'", () => {
  assert.deepEqual(parseCoords("31.7683, 35.2137"), { lat: 31.7683, lng: 35.2137 });
  assert.deepEqual(parseCoords(" 32.08,34.78 "), { lat: 32.08, lng: 34.78 });
});

test("Google Maps @lat,lng URL", () => {
  assert.deepEqual(parseCoords("https://www.google.com/maps/@32.0853,34.7818,15z"), {
    lat: 32.0853,
    lng: 34.7818,
  });
});

test("place URL prefers the exact !3d/!4d pin over the map center", () => {
  const url =
    "https://www.google.com/maps/place/Safari/@32.0700,34.8000,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d32.0787!4d34.8137";
  assert.deepEqual(parseCoords(url), { lat: 32.0787, lng: 34.8137 });
});

test("rejects text without coordinates or out-of-range values", () => {
  assert.equal(parseCoords(""), null);
  assert.equal(parseCoords("ספארי רמת גן"), null);
  assert.equal(parseCoords("95.1, 34.2"), null);
});
