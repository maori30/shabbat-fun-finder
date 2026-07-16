import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "כיף לילדים - אטרקציות בשבת" },
      { name: "description", content: "מצאו אטרקציות לילדים הפתוחות בשבת, עם סינון לפי גיל, מיזוג ומיקום." },
      { property: "og:title", content: "כיף לילדים - אטרקציות בשבת" },
      { property: "og:description", content: "מצאו אטרקציות לילדים הפתוחות בשבת, עם סינון לפי גיל, מיזוג ומיקום." },
    ],
  }),
  component: Index,
});

type Attraction = {
  id: number;
  name: string;
  city: string;
  region: "צפון" | "מרכז" | "דרום" | "ירושלים";
  category: string;
  openShabbat: boolean;
  environment: "ממוזג" | "פתוח" | "משולב";
  minAge: number;
  maxAge: number;
  description: string;
  emoji: string;
};

const ATTRACTIONS: Attraction[] = [
  { id: 1, name: "מוזיאון המדע ירושלים", city: "ירושלים", region: "ירושלים", category: "מוזיאון", openShabbat: true, environment: "ממוזג", minAge: 4, maxAge: 14, description: "תערוכות אינטראקטיביות ומדעיות לכל המשפחה.", emoji: "🔬" },
  { id: 2, name: "לונה פארק סופרלנד", city: "ראשון לציון", region: "מרכז", category: "פארק שעשועים", openShabbat: false, environment: "פתוח", minAge: 3, maxAge: 16, description: "מתקנים לכל הגילאים, קרוסלות ורכבות הרים.", emoji: "🎢" },
  { id: 3, name: "ספארי רמת גן", city: "רמת גן", region: "מרכז", category: "גן חיות", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 14, description: "טיול ברכב בין חיות בר וגן חיות מטופח.", emoji: "🦁" },
  { id: 4, name: "מיני ישראל", city: "לטרון", region: "מרכז", category: "פארק", openShabbat: true, environment: "פתוח", minAge: 3, maxAge: 12, description: "דגמים זעירים של אתרים מפורסמים בישראל.", emoji: "🏛️" },
  { id: 5, name: "אקווריום ישראל", city: "ירושלים", region: "ירושלים", category: "אקווריום", openShabbat: false, environment: "ממוזג", minAge: 2, maxAge: 12, description: "מסע מרתק בעולם התת-ימי.", emoji: "🐠" },
  { id: 6, name: "מוזיאון הילדים חולון", city: "חולון", region: "מרכז", category: "מוזיאון", openShabbat: false, environment: "ממוזג", minAke: 2, maxAge: 12, description: "חוויות והדמיות לילדים בכל הגילאים.", emoji: "🎨" } as unknown as Attraction,
  { id: 7, name: "פארק המים ימית 2000", city: "חולון", region: "מרכז", category: "פארק מים", openShabbat: true, environment: "פתוח", minAge: 3, maxAge: 16, description: "מגלשות מים, בריכות ופעילויות רטובות.", emoji: "🏊" },
  { id: 8, name: "גן גורו לנד", city: "אזור השרון", region: "מרכז", category: "גן חיות", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 10, description: "מפגש קרוב עם קנגורו וחיות מחמד.", emoji: "🦘" },
  { id: 9, name: "פארק טרמפולינות Jump", city: "תל אביב", region: "מרכז", category: "פעילות", openShabbat: true, environment: "ממוזג", minAge: 4, maxAge: 16, description: "אולם טרמפולינות ענק עם מסלולי אתגר.", emoji: "🤸" },
  { id: 10, name: "מצפה הכוכבים גבעתיים", city: "גבעתיים", region: "מרכז", category: "מדע", openShabbat: true, environment: "משולב", minAge: 6, maxAge: 16, description: "צפייה בכוכבים והרצאות אסטרונומיה.", emoji: "🔭" },
  { id: 11, name: "חוות התאומים", city: "מודיעין", region: "מרכז", category: "חווה", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 10, description: "האכלת חיות משק ופעילויות בטבע.", emoji: "🐐" },
  { id: 12, name: "מוזיאון החרמון", city: "נווה אטי\"ב", region: "צפון", category: "טבע", openShabbat: true, environment: "משולב", minAge: 5, maxAge: 16, description: "חוויה שלגית וטבעית בפסגת הצפון.", emoji: "🏔️" },
  { id: 13, name: "פארק הקופים בן שמן", city: "בן שמן", region: "מרכז", category: "גן חיות", openShabbat: true, environment: "פתוח", minAge: 2, maxAge: 14, description: "מפגש קרוב עם קופים במרחבים פתוחים.", emoji: "🐒" },
  { id: 14, name: "מוזיאון הטבע ירושלים", city: "ירושלים", region: "ירושלים", category: "מוזיאון", openShabbat: false, environment: "ממוזג", minAge: 3, maxAge: 12, description: "תצוגות בעלי חיים וטבע ישראלי.", emoji: "🦉" },
  { id: 15, name: "פארק הכרמל", city: "חיפה", region: "צפון", category: "טבע", openShabbat: true, environment: "פתוח", minAge: 3, maxAge: 16, description: "טיולים, פיקניקים ומסלולים משפחתיים.", emoji: "🌲" },
  { id: 16, name: "קניון עדן קידס", city: "באר שבע", region: "דרום", category: "פעילות", openShabbat: true, environment: "ממוזג", minAge: 1, maxAge: 8, description: "מתחם משחקים מקורה לילדים קטנים.", emoji: "🎠" },
  { id: 17, name: "פארק תמנע", city: "אילת", region: "דרום", category: "טבע", openShabbat: true, environment: "פתוח", minAge: 4, maxAge: 16, description: "אתגרים גיאולוגיים ופעילויות מדבר.", emoji: "🏜️" },
  { id: 18, name: "מצפה הצוללת אילת", city: "אילת", region: "דרום", category: "אקווריום", openShabbat: true, environment: "משולב", minAge: 2, maxAge: 14, description: "צפייה בשונית האלמוגים מתחת למים.", emoji: "🐡" },
];

// fix id 6
ATTRACTIONS[5] = { id: 6, name: "מוזיאון הילדים חולון", city: "חולון", region: "מרכז", category: "מוזיאון", openShabbat: false, environment: "ממוזג", minAge: 2, maxAge: 12, description: "חוויות והדמיות לילדים בכל הגילאים.", emoji: "🎨" };

function Index() {
  const [query, setQuery] = useState("");
  const [shabbatOnly, setShabbatOnly] = useState(true);
  const [age, setAge] = useState<number | "">("");
  const [env, setEnv] = useState<"all" | "ממוזג" | "פתוח" | "משולב">("all");
  const [region, setRegion] = useState<"all" | Attraction["region"]>("all");

  const results = useMemo(() => {
    return ATTRACTIONS.filter((a) => {
      if (shabbatOnly && !a.openShabbat) return false;
      if (env !== "all" && a.environment !== env) return false;
      if (region !== "all" && a.region !== region) return false;
      if (age !== "" && (age < a.minAge || age > a.maxAge)) return false;
      if (query.trim()) {
        const q = query.trim();
        if (!(a.name.includes(q) || a.city.includes(q) || a.category.includes(q))) return false;
      }
      return true;
    });
  }, [query, shabbatOnly, age, env, region]);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">כיף לילדים 🎈</h1>
          <p className="mt-2 text-base md:text-lg opacity-90">
            מוצאים אטרקציות לילדים – כולל אלה שפתוחות בשבת, ממוזגות או בחוץ, ולפי גיל
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי שם, עיר או קטגוריה"
              className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={18}
                value={age}
                onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="גיל הילד"
                className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={env}
                onChange={(e) => setEnv(e.target.value as typeof env)}
                className="rounded-xl border bg-background px-3 py-3 text-base"
              >
                <option value="all">סביבה</option>
                <option value="ממוזג">ממוזג</option>
                <option value="פתוח">פתוח</option>
                <option value="משולב">משולב</option>
              </select>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as typeof region)}
                className="rounded-xl border bg-background px-3 py-3 text-base"
              >
                <option value="all">אזור</option>
                <option value="צפון">צפון</option>
                <option value="מרכז">מרכז</option>
                <option value="ירושלים">ירושלים</option>
                <option value="דרום">דרום</option>
              </select>
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={shabbatOnly}
              onChange={(e) => setShabbatOnly(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
            הצג רק אטרקציות פתוחות בשבת
          </label>
        </section>

        <div className="mt-4 text-sm text-muted-foreground">
          נמצאו {results.length} אטרקציות
        </div>

        <section className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((a) => (
            <article key={a.id} className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-3xl">{a.emoji}</div>
                  <h2 className="mt-1 text-lg font-bold">{a.name}</h2>
                  <div className="text-sm text-muted-foreground">
                    {a.city} · {a.category}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    a.openShabbat
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {a.openShabbat ? "פתוח בשבת" : "סגור בשבת"}
                </span>
              </div>
              <p className="mt-2 text-sm">{a.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  {a.environment === "ממוזג" ? "❄️ ממוזג" : a.environment === "פתוח" ? "☀️ פתוח" : "🔀 משולב"}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  👶 גילאי {a.minAge}–{a.maxAge}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  📍 {a.region}
                </span>
              </div>
            </article>
          ))}
        </section>

        {results.length === 0 && (
          <div className="mt-8 rounded-2xl border bg-card p-8 text-center text-muted-foreground">
            לא נמצאו אטרקציות מתאימות. נסו לשנות את הסינון.
          </div>
        )}

        <footer className="mt-10 pb-6 text-center text-xs text-muted-foreground">
          המידע הוא לצורך התרשמות בלבד. מומלץ לוודא שעות פתיחה מול האתר הרשמי.
        </footer>
      </main>
    </div>
  );
}
