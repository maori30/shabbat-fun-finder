import { test } from "node:test";
import assert from "node:assert/strict";
import { htmlToText, isSafePublicUrl, normalizeExtracted } from "../src/lib/page-extract.ts";

test("only public http(s) sites are allowed", () => {
  assert.ok(isSafePublicUrl("https://www.safari.co.il/"));
  assert.ok(isSafePublicUrl("http://example.co.il/hours"));
  for (const bad of [
    "ftp://example.com",
    "javascript:alert(1)",
    "http://localhost:3000",
    "http://127.0.0.1/",
    "http://10.0.0.5/admin",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/",
    "http://intranet/",
    "http://printer.local/",
    "https://user:pass@example.com/",
    "https://example.com:8443/",
    "not a url",
  ]) {
    assert.equal(isSafePublicUrl(bad), null, bad);
  }
});

test("html is reduced to title, description, JSON-LD and visible text", () => {
  const html = `<html><head><title>חוות הילדים &amp; פינת חי</title>
    <meta name="description" content="פתוח גם בשבת">
    <script type="application/ld+json">{"openingHours":"Sa 09:00-17:00"}</script>
    <script>var tracking = 1;</script><style>body{color:red}</style></head>
    <body><h1>ברוכים הבאים</h1><p>שעות פתיחה: שבת 9:00–17:00</p><p>כניסה 45&nbsp;₪</p></body></html>`;
  const t = htmlToText(html);
  assert.match(t, /כותרת: חוות הילדים & פינת חי/);
  assert.match(t, /תיאור: פתוח גם בשבת/);
  assert.match(t, /Sa 09:00-17:00/);
  assert.match(t, /שבת 9:00–17:00/);
  assert.match(t, /כניסה 45 ₪/);
  assert.doesNotMatch(t, /tracking|color:red/);
  assert.ok(htmlToText("x".repeat(50000), 500).length <= 500);
});

test("AI output is validated into a safe draft", () => {
  const d = normalizeExtracted({
    name: "  חוות הילדים  ",
    city: "כפר סבא",
    open_shabbat: true,
    shabbat_hours: "09:00-17:00",
    environment: "פתוח",
    min_age: 8,
    max_age: 2,
    price: "45 ₪",
  });
  assert.ok(d);
  assert.equal(d.name, "חוות הילדים");
  assert.equal(d.open_shabbat, true);
  assert.equal(d.min_age, 2);
  assert.equal(d.max_age, 8);
  assert.equal(normalizeExtracted({ name: "" }), null);
  assert.equal(normalizeExtracted({ name: "x", environment: "חלל" })?.environment ?? null, null);
  const unknown = normalizeExtracted({ name: "מקום", open_shabbat: "maybe", min_age: 99 });
  assert.equal(unknown?.open_shabbat, null);
  assert.equal(unknown?.min_age, null);
});
