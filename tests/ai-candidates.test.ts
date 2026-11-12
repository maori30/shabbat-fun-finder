import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanKeywords,
  mergePicks,
  planQueries,
  selectCandidates,
  type CandidateCriteria,
} from "../src/lib/ai-candidates.ts";
import type { PlaceResult } from "../src/lib/places.functions.ts";

const PETAH_TIKVA = { lat: 32.0878, lng: 34.8878 };

let n = 0;
function place(over: Partial<PlaceResult>): PlaceResult {
  n += 1;
  return {
    id: `p${n}`,
    name: `מקום ${n}`,
    address: "",
    lat: PETAH_TIKVA.lat + 0.01 * n,
    lng: PETAH_TIKVA.lng,
    rating: 4.3,
    userRatingCount: 200,
    mapsUri: "",
    websiteUri: null,
    primaryType: null,
    primaryTypeId: null,
    types: [],
    openNow: null,
    openShabbat: null,
    saturdayHours: null,
    todayHours: null,
    environment: null,
    ageRange: null,
    price: null,
    description: null,
    photoUri: null,
    emoji: "📍",
    ...over,
  };
}

// The request that returned ~1 result: indoor, ages 2 and 4, any budget.
const indoorToddlers: CandidateCriteria = {
  ages: [2, 4],
  freeOnly: false,
  indoorPreference: "ממוזג",
  shabbatOnly: true,
  keywords: ["מקום ממוזג", "פעילות לילדים"],
};

test("descriptive keywords are dropped; real place types are kept", () => {
  assert.deepEqual(cleanKeywords(["מקום ממוזג", "פעילות לילדים", "בשבת"]), []);
  assert.deepEqual(cleanKeywords(["משחקייה", "ממוזג"]), ["משחקייה"]);
  assert.deepEqual(cleanKeywords(["פארק טרמפולינות", "מוזיאון ילדים", "באולינג"]), [
    "פארק טרמפולינות",
    "מוזיאון ילדים",
  ]);
});

test("the broad type sweep always runs, plus indoor-specific searches", () => {
  const q = planQueries(indoorToddlers);
  assert.equal(q[0], "", "broad sweep must be first");
  assert.ok(q.includes("משחקייה לילדים"));
  assert.ok(!q.includes("מקום ממוזג"), "junk keyword must not be searched");
  assert.ok(q.length <= 4);
  // Free requests sweep free venues instead.
  const free = planQueries({ ...indoorToddlers, indoorPreference: "לא משנה", freeOnly: true });
  assert.equal(free[0], "");
  assert.ok(free.includes("גן שעשועים"));
});

test("indoor + toddler request keeps plenty of fitting places, indoor first", () => {
  const found = [
    place({
      name: "משחקייה א",
      environment: "ממוזג",
      ageRange: { min: 1, max: 10 },
      openShabbat: true,
    }),
    place({ name: "משחקייה ב", environment: "ממוזג", ageRange: { min: 1, max: 10 } }),
    place({ name: "קניון עם פינת משחק", environment: "ממוזג", ageRange: { min: 0, max: 16 } }),
    place({ name: "פארק מים", environment: "משולב", ageRange: { min: 3, max: 16 } }),
    place({ name: "גן ציבורי", environment: "פתוח", ageRange: { min: 0, max: 16 } }),
    place({ name: "באולינג", environment: "ממוזג", ageRange: { min: 6, max: 16 } }),
    place({ name: "סגור בשבת", environment: "ממוזג", openShabbat: false }),
    place({ name: "רחוק מדי", environment: "ממוזג", lat: 32.9 }),
  ];
  const out = selectCandidates(found, indoorToddlers, PETAH_TIKVA, 37);
  const names = out.map((p) => p.name);
  assert.ok(out.length >= 4, `expected several results, got ${out.length}`);
  assert.ok(!names.includes("גן ציבורי"), "outdoor place dropped for an indoor request");
  assert.ok(!names.includes("באולינג"), "bowling (6+) dropped for ages 2 and 4");
  assert.ok(!names.includes("סגור בשבת"));
  assert.ok(!names.includes("רחוק מדי"));
  assert.equal(names[0], "משחקייה א", "verified-open indoor place ranks first");
});

test("filters relax instead of returning nothing", () => {
  const found = [
    place({ environment: "פתוח" }),
    place({ environment: "פתוח" }),
    place({ environment: null }),
  ];
  const out = selectCandidates(found, indoorToddlers, PETAH_TIKVA, 37);
  assert.equal(out.length, 3);
});

test("AI picks come first, then the remaining candidates", () => {
  const cands = [place({}), place({}), place({}), place({})];
  const ids = cands.map((p) => p.id);
  const merged = mergePicks([ids[2]!, "unknown", ids[0]!], cands);
  assert.deepEqual(
    merged.map((p) => p.id),
    [ids[2], ids[0], ids[1], ids[3]],
  );
  assert.equal(mergePicks([], cands, 2).length, 2);
});
