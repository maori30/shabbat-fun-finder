import { test } from "node:test";
import assert from "node:assert/strict";
import { itineraryShareText, whatsappUrl } from "../src/lib/share.ts";
import type { PlaceResult } from "../src/lib/places.functions.ts";

const p = (id: string, name: string): PlaceResult =>
  ({ id, name, emoji: "🎈", lat: 32.1, lng: 34.9 }) as unknown as PlaceResult;

test("plan text lists every stop in order with Waze links and lunch", () => {
  const map = new Map([
    ["a", p("a", "ספארי")],
    ["b", p("b", "משחקייה")],
  ]);
  const text = itineraryShareText(
    [
      { slot: "בוקר", placeId: "a", tip: "להגיע ב-9" },
      { slot: "צהריים", placeId: "b", tip: "" },
      { slot: "אחר הצהריים", placeId: "missing", tip: "x" },
    ],
    map,
    "פיקניק בפארק",
    "https://example.app",
  );
  assert.match(text, /☀️ בוקר: 🎈 ספארי/);
  assert.match(text, /להגיע ב-9/);
  assert.match(text, /🌤️ צהריים: 🎈 משחקייה/);
  assert.doesNotMatch(text, /אחר הצהריים/);
  assert.match(text, /waze\.com\/ul\?ll=32\.1,34\.9/);
  assert.match(text, /🥪 פיקניק בפארק/);
  assert.ok(text.indexOf("ספארי") < text.indexOf("משחקייה"));
  assert.match(whatsappUrl(text), /^https:\/\/wa\.me\/\?text=/);
});
