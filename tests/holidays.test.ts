import { test } from "node:test";
import assert from "node:assert/strict";
import { holidayOn, upcomingSaturday, weekendNotice } from "../src/lib/holidays.ts";

const at = (ymd: string, hourUtc = 9) =>
  new Date(`${ymd}T${String(hourUtc).padStart(2, "0")}:00:00Z`);

test("holiday dates for 5787 (2026–27)", () => {
  assert.equal(holidayOn(at("2026-09-12"))?.name, "ראש השנה");
  assert.equal(holidayOn(at("2026-09-21"))?.kind, "yomkippur");
  assert.equal(holidayOn(at("2026-09-26"))?.name, "סוכות");
  assert.equal(holidayOn(at("2026-09-29"))?.kind, "cholhamoed");
  assert.equal(holidayOn(at("2026-10-03"))?.name, "שמחת תורה");
  assert.equal(holidayOn(at("2026-12-05"))?.kind, "chanukah"); // 25 Kislev
  assert.equal(holidayOn(at("2026-12-12"))?.kind, "chanukah"); // 8th day
  assert.equal(holidayOn(at("2026-12-13")), null); // after Hanukkah
  assert.equal(holidayOn(at("2027-03-23"))?.kind, "purim"); // 14 Adar II
  assert.equal(holidayOn(at("2027-04-22"))?.name, "פסח");
  assert.equal(holidayOn(at("2027-04-24"))?.kind, "cholhamoed");
  assert.equal(holidayOn(at("2027-06-11"))?.name, "שבועות");
  assert.equal(holidayOn(at("2026-11-14")), null); // regular Shabbat
});

test("upcoming Saturday in Israel time", () => {
  assert.equal(upcomingSaturday(at("2026-11-12")).toISOString().slice(0, 10), "2026-11-14"); // Thu
  assert.equal(upcomingSaturday(at("2026-11-14")).toISOString().slice(0, 10), "2026-11-14"); // Sat
  // Saturday 23:30 in Israel = 21:30 UTC — still that Saturday.
  assert.equal(upcomingSaturday(at("2026-11-14", 21)).toISOString().slice(0, 10), "2026-11-14");
  // Saturday 23:30 UTC is already Sunday in Israel → next Saturday.
  assert.equal(upcomingSaturday(at("2026-11-14", 23)).toISOString().slice(0, 10), "2026-11-21");
});

test("weekend notices", () => {
  assert.equal(weekendNotice(at("2026-11-12")), null);
  assert.match(weekendNotice(at("2026-09-10"))!.title, /ראש השנה/); // Sat is RH
  assert.equal(weekendNotice(at("2026-09-17")), null); // YK 2026 is a Monday
  assert.match(weekendNotice(at("2028-09-28"))!.title, /יום כיפור/); // YK on Sat 2028-09-30
  assert.match(weekendNotice(at("2026-09-24"))!.title, /סוכות/);
  assert.match(weekendNotice(at("2026-12-03"))!.title, /חנוכה/);
  assert.match(weekendNotice(at("2027-04-20"))!.title, /חול המועד פסח/);
  assert.match(weekendNotice(at("2027-06-08"))!.title, /ביום שישי שבועות/);
});
