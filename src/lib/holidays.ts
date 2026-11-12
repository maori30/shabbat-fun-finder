/**
 * Jewish holidays around the coming weekend (Israel schedule, one-day yom
 * tov), using the browser/Node built-in Hebrew calendar — no dependency.
 * On holidays Google's "regular" opening hours are unreliable, so the page
 * warns parents. Pure, so it can be unit-tested with `node --test`.
 */

const fmt = new Intl.DateTimeFormat("en-u-ca-hebrew", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Jerusalem",
});

export function hebrewDate(d: Date): { day: number; month: string } {
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  return { day: Number(parts.day), month: String(parts.month) };
}

export type HolidayKind = "yomtov" | "yomkippur" | "cholhamoed" | "erev" | "chanukah" | "purim";
export type Holiday = { name: string; kind: HolidayKind };

const DAY_MS = 24 * 3600 * 1000;

/** The holiday (if any) on a given civil date. */
export function holidayOn(d: Date): Holiday | null {
  const { day, month } = hebrewDate(d);
  switch (month) {
    case "Tishri":
      if (day === 1 || day === 2) return { name: "ראש השנה", kind: "yomtov" };
      if (day === 9) return { name: "ערב יום כיפור", kind: "erev" };
      if (day === 10) return { name: "יום כיפור", kind: "yomkippur" };
      if (day === 14) return { name: "ערב סוכות", kind: "erev" };
      if (day === 15) return { name: "סוכות", kind: "yomtov" };
      if (day >= 16 && day <= 21) return { name: "חול המועד סוכות", kind: "cholhamoed" };
      if (day === 22) return { name: "שמחת תורה", kind: "yomtov" };
      break;
    case "Adar":
    case "Adar II":
      if (day === 14 || day === 15) return { name: "פורים", kind: "purim" };
      break;
    case "Nisan":
      if (day === 14) return { name: "ערב פסח", kind: "erev" };
      if (day === 15) return { name: "פסח", kind: "yomtov" };
      if (day >= 16 && day <= 20) return { name: "חול המועד פסח", kind: "cholhamoed" };
      if (day === 21) return { name: "שביעי של פסח", kind: "yomtov" };
      break;
    case "Sivan":
      if (day === 5) return { name: "ערב שבועות", kind: "erev" };
      if (day === 6) return { name: "שבועות", kind: "yomtov" };
      break;
  }
  // Hanukkah: 8 days from 25 Kislev (Kislev has 29 or 30 days, so count back).
  for (let k = 0; k < 8; k++) {
    const h = hebrewDate(new Date(d.getTime() - k * DAY_MS));
    if (h.month === "Kislev" && h.day === 25) return { name: "חנוכה", kind: "chanukah" };
  }
  return null;
}

/** Noon (Israel) of the coming Saturday — today if today is Saturday. */
export function upcomingSaturday(now = new Date()): Date {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    weekday: "short",
  }).format(now);
  const idx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now);
  const todayNoon = new Date(`${ymd}T09:00:00Z`); // ~noon in Israel
  return new Date(todayNoon.getTime() + ((6 - idx + 7) % 7) * DAY_MS);
}

export type WeekendNotice = {
  emoji: string;
  title: string;
  text: string;
  tone: "warning" | "info";
};

/** A short banner for the coming weekend, or null on a regular Shabbat. */
export function weekendNotice(now = new Date()): WeekendNotice | null {
  const sat = upcomingSaturday(now);
  const fri = new Date(sat.getTime() - DAY_MS);
  const s = holidayOn(sat);
  const f = holidayOn(fri);

  if (s?.kind === "yomkippur") {
    return {
      emoji: "🕯️",
      title: "השבת הזו היא יום כיפור",
      text: "כמעט כל המקומות סגורים והכבישים ריקים מרכבים – יום מצוין לאופניים בשכונה.",
      tone: "warning",
    };
  }
  if (s?.kind === "yomtov") {
    return {
      emoji: "🎉",
      title: `השבת הזו היא גם ${s.name}`,
      text: "הרבה מקומות סגורים או פתוחים בשעות חג – כדאי לוודא שעות באתר המקום לפני שיוצאים.",
      tone: "warning",
    };
  }
  if (s?.kind === "cholhamoed") {
    return {
      emoji: "🎡",
      title: `שבת ${s.name}`,
      text: "רוב האטרקציות פתוחות, לפעמים בשעות מיוחדות ועם עומסים – כדאי להגיע מוקדם או להזמין מראש.",
      tone: "info",
    };
  }
  if (f && (f.kind === "yomtov" || f.kind === "yomkippur")) {
    return {
      emoji: "📅",
      title: `ביום שישי ${f.name}`,
      text: "סוף שבוע ארוך – ייתכנו שעות פתיחה שונות ועומסים, כדאי לוודא לפני שיוצאים.",
      tone: "info",
    };
  }
  if (s?.kind === "chanukah" || f?.kind === "chanukah") {
    return {
      emoji: "🕎",
      title: "שבת חנוכה",
      text: "חופשה מבתי הספר – צפוי עומס במקומות המקורים. הרבה מקומות מוסיפים הצגות ופעילויות חג.",
      tone: "info",
    };
  }
  if (s?.kind === "purim" || f?.kind === "purim") {
    return {
      emoji: "🎭",
      title: "סוף שבוע של פורים",
      text: "הרבה אירועים ותהלוכות לילדים – שווה לבדוק מה קורה בעירייה הקרובה.",
      tone: "info",
    };
  }
  return null;
}
