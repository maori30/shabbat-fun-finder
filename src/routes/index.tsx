import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "כיף לילדים - אטרקציות בשבת" },
      { name: "description", content: "מצאו אטרקציות לילדים הפתוחות בשבת, עם סינון לפי גיל, מיזוג, מיקום וקרבה אליכם." },
      { property: "og:title", content: "כיף לילדים - אטרקציות בשבת" },
      { property: "og:description", content: "מצאו אטרקציות לילדים הפתוחות בשבת, עם סינון לפי גיל, מיזוג, מיקום וקרבה אליכם." },
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
  lat: number;
  lng: number;
};

const ATTRACTIONS: Attraction[] = [
  { id: 1, name: "מוזיאון המדע ירושלים", city: "ירושלים", region: "ירושלים", category: "מוזיאון", openShabbat: true, environment: "ממוזג", minAge: 4, maxAge: 14, description: "תערוכות אינטראקטיביות ומדעיות לכל המשפחה.", emoji: "🔬", lat: 31.7767, lng: 35.1975 },
  { id: 2, name: "לונה פארק סופרלנד", city: "ראשון לציון", region: "מרכז", category: "פארק שעשועים", openShabbat: false, environment: "פתוח", minAge: 3, maxAge: 16, description: "מתקנים לכל הגילאים, קרוסלות ורכבות הרים.", emoji: "🎢", lat: 31.9730, lng: 34.7925 },
  { id: 3, name: "ספארי רמת גן", city: "רמת גן", region: "מרכז", category: "גן חיות", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 14, description: "טיול ברכב בין חיות בר וגן חיות מטופח.", emoji: "🦁", lat: 32.0787, lng: 34.8137 },
  { id: 4, name: "מיני ישראל", city: "לטרון", region: "מרכז", category: "פארק", openShabbat: true, environment: "פתוח", minAge: 3, maxAge: 12, description: "דגמים זעירים של אתרים מפורסמים בישראל.", emoji: "🏛️", lat: 31.8386, lng: 34.9861 },
  { id: 5, name: "אקווריום ישראל", city: "ירושלים", region: "ירושלים", category: "אקווריום", openShabbat: false, environment: "ממוזג", minAge: 2, maxAge: 12, description: "מסע מרתק בעולם התת-ימי.", emoji: "🐠", lat: 31.7455, lng: 35.1878 },
  { id: 6, name: "מוזיאון הילדים חולון", city: "חולון", region: "מרכז", category: "מוזיאון", openShabbat: false, environment: "ממוזג", minAge: 2, maxAge: 12, description: "חוויות והדמיות לילדים בכל הגילאים.", emoji: "🎨", lat: 32.0158, lng: 34.7874 },
  { id: 7, name: "פארק המים ימית 2000", city: "חולון", region: "מרכז", category: "פארק מים", openShabbat: true, environment: "פתוח", minAge: 3, maxAge: 16, description: "מגלשות מים, בריכות ופעילויות רטובות.", emoji: "🏊", lat: 32.0089, lng: 34.7745 },
  { id: 8, name: "גן גורו לנד", city: "אזור השרון", region: "מרכז", category: "גן חיות", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 10, description: "מפגש קרוב עם קנגורו וחיות מחמד.", emoji: "🦘", lat: 32.3167, lng: 34.8500 },
  { id: 9, name: "פארק טרמפולינות Jump", city: "תל אביב", region: "מרכז", category: "פעילות", openShabbat: true, environment: "ממוזג", minAge: 4, maxAge: 16, description: "אולם טרמפולינות ענק עם מסלולי אתגר.", emoji: "🤸", lat: 32.0853, lng: 34.7818 },
  { id: 10, name: "מצפה הכוכבים גבעתיים", city: "גבעתיים", region: "מרכז", category: "מדע", openShabbat: true, environment: "משולב", minAge: 6, maxAge: 16, description: "צפייה בכוכבים והרצאות אסטרונומיה.", emoji: "🔭", lat: 32.0719, lng: 34.8103 },
  { id: 11, name: "חוות התאומים", city: "מודיעין", region: "מרכז", category: "חווה", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 10, description: "האכלת חיות משק ופעילויות בטבע.", emoji: "🐐", lat: 31.8969, lng: 35.0104 },
  { id: 12, name: "מוזיאון החרמון", city: "נווה אטי\"ב", region: "צפון", category: "טבע", openShabbat: true, environment: "משולב", minAge: 5, maxAge: 16, description: "חוויה שלגית וטבעית בפסגת הצפון.", emoji: "🏔️", lat: 33.2833, lng: 35.7833 },
  { id: 13, name: "פארק הקופים בן שמן", city: "בן שמן", region: "מרכז", category: "גן חיות", openShabbat: true, environment: "פתוח", minAge: 2, maxAge: 14, description: "מפגש קרוב עם קופים במרחבים פתוחים.", emoji: "🐒", lat: 31.9556, lng: 34.9247 },
  { id: 14, name: "מוזיאון הטבע ירושלים", city: "ירושלים", region: "ירושלים", category: "מוזיאון", openShabbat: false, environment: "ממוזג", minAge: 3, maxAge: 12, description: "תצוגות בעלי חיים וטבע ישראלי.", emoji: "🦉", lat: 31.7683, lng: 35.2137 },
  { id: 15, name: "פארק הכרמל", city: "חיפה", region: "צפון", category: "טבע", openShabbat: true, environment: "פתוח", minAge: 3, maxAge: 16, description: "טיולים, פיקניקים ומסלולים משפחתיים.", emoji: "🌲", lat: 32.7333, lng: 35.0333 },
  { id: 16, name: "קניון עדן קידס", city: "באר שבע", region: "דרום", category: "פעילות", openShabbat: true, environment: "ממוזג", minAge: 1, maxAge: 8, description: "מתחם משחקים מקורה לילדים קטנים.", emoji: "🎠", lat: 31.2518, lng: 34.7913 },
  { id: 17, name: "פארק תמנע", city: "אילת", region: "דרום", category: "טבע", openShabbat: true, environment: "פתוח", minAge: 4, maxAge: 16, description: "אתגרים גיאולוגיים ופעילויות מדבר.", emoji: "🏜️", lat: 29.7500, lng: 34.9500 },
  { id: 18, name: "מצפה הצוללת אילת", city: "אילת", region: "דרום", category: "אקווריום", openShabbat: true, environment: "משולב", minAge: 2, maxAge: 14, description: "צפייה בשונית האלמוגים מתחת למים.", emoji: "🐡", lat: 29.5033, lng: 34.9200 },
];

// Known city centers for "search near city" without geolocation
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "ירושלים": { lat: 31.7683, lng: 35.2137 },
  "תל אביב": { lat: 32.0853, lng: 34.7818 },
  "חיפה": { lat: 32.7940, lng: 34.9896 },
  "ראשון לציון": { lat: 31.9730, lng: 34.7925 },
  "רמת גן": { lat: 32.0684, lng: 34.8248 },
  "חולון": { lat: 32.0158, lng: 34.7874 },
  "גבעתיים": { lat: 32.0719, lng: 34.8103 },
  "פתח תקווה": { lat: 32.0878, lng: 34.8878 },
  "נתניה": { lat: 32.3215, lng: 34.8532 },
  "הרצליה": { lat: 32.1663, lng: 34.8438 },
  "רעננה": { lat: 32.1847, lng: 34.8708 },
  "כפר סבא": { lat: 32.1750, lng: 34.9070 },
  "מודיעין": { lat: 31.8969, lng: 35.0104 },
  "אשדוד": { lat: 31.8014, lng: 34.6435 },
  "אשקלון": { lat: 31.6688, lng: 34.5715 },
  "באר שבע": { lat: 31.2518, lng: 34.7913 },
  "אילת": { lat: 29.5581, lng: 34.9482 },
  "טבריה": { lat: 32.7922, lng: 35.5312 },
  "נצרת": { lat: 32.7021, lng: 35.2978 },
  "עפולה": { lat: 32.6078, lng: 35.2897 },
};

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function Index() {
  const [query, setQuery] = useState("");
  const [shabbatOnly, setShabbatOnly] = useState(true);
  const [age, setAge] = useState<number | "">("");
  const [env, setEnv] = useState<"all" | "ממוזג" | "פתוח" | "משולב">("all");
  const [region, setRegion] = useState<"all" | Attraction["region"]>("all");

  const [nearCity, setNearCity] = useState<string>("");
  const [radius, setRadius] = useState<number>(30);
  const [origin, setOrigin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFavOnly, setShowFavOnly] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kids_favorites");
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("kids_favorites", JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  const toggleFav = (id: number) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const cityNames = useMemo(() => Object.keys(CITY_COORDS), []);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("הדפדפן לא תומך במיקום");
      return;
    }
    setGeoStatus("מאתר מיקום...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "המיקום שלי" });
        setNearCity("");
        setGeoStatus("");
      },
      () => setGeoStatus("לא הצלחנו לאתר את המיקום"),
      { timeout: 8000 }
    );
  };

  const pickCity = (city: string) => {
    setNearCity(city);
    if (city && CITY_COORDS[city]) {
      setOrigin({ ...CITY_COORDS[city], label: city });
    } else {
      setOrigin(null);
    }
  };

  const clearNearby = () => {
    setOrigin(null);
    setNearCity("");
    setGeoStatus("");
  };

  const results = useMemo(() => {
    const list = ATTRACTIONS.filter((a) => {
      if (showFavOnly && !favorites.includes(a.id)) return false;
      if (shabbatOnly && !a.openShabbat) return false;
      if (env !== "all" && a.environment !== env) return false;
      if (region !== "all" && a.region !== region) return false;
      if (age !== "" && (age < a.minAge || age > a.maxAge)) return false;
      if (query.trim()) {
        const q = query.trim();
        if (!(a.name.includes(q) || a.city.includes(q) || a.category.includes(q))) return false;
      }
      return true;
    }).map((a) => ({
      ...a,
      distance: origin ? distanceKm(origin, { lat: a.lat, lng: a.lng }) : null,
    }));

    if (origin) {
      return list
        .filter((a) => a.distance !== null && a.distance <= radius)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }
    return list;
  }, [query, shabbatOnly, age, env, region, origin, radius, showFavOnly, favorites]);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">כיף לילדים 🎈</h1>
          <p className="mt-2 text-base md:text-lg opacity-90">
            מוצאים אטרקציות לילדים – כולל אלה שפתוחות בשבת, ממוזגות או בחוץ, ולפי גיל וקרבה אליכם
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

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={shabbatOnly}
                onChange={(e) => setShabbatOnly(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              הצג רק אטרקציות פתוחות בשבת
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showFavOnly}
                onChange={(e) => setShowFavOnly(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              ❤️ רק מועדפים ({favorites.length})
            </label>
          </div>

          <div className="mt-4 rounded-xl border bg-background/60 p-3">
            <div className="text-sm font-semibold mb-2">🔎 חיפוש לפי קרבה אליי</div>
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <button
                onClick={useMyLocation}
                className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                📍 השתמש במיקום שלי
              </button>
              <span className="text-sm text-muted-foreground">או</span>
              <select
                value={nearCity}
                onChange={(e) => pickCity(e.target.value)}
                className="rounded-xl border bg-background px-3 py-2 text-sm"
              >
                <option value="">בחרו עיר קרובה...</option>
                {cityNames.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-sm whitespace-nowrap">רדיוס: {radius} ק"מ</label>
                <input
                  type="range"
                  min={5}
                  max={500}
                  step={5}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              {origin && (
                <button
                  onClick={clearNearby}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-secondary"
                >
                  נקה
                </button>
              )}
            </div>
            {origin && (
              <div className="mt-2 text-xs text-muted-foreground">
                מציג אטרקציות עד {radius} ק"מ מ־{origin.label}
              </div>
            )}
            {geoStatus && (
              <div className="mt-2 text-xs text-rose-700">{geoStatus}</div>
            )}
          </div>
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
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => toggleFav(a.id)}
                    aria-label="הוסף למועדפים"
                    className="text-2xl leading-none hover:scale-110 transition-transform"
                  >
                    {favorites.includes(a.id) ? "❤️" : "🤍"}
                  </button>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      a.openShabbat
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {a.openShabbat ? "פתוח בשבת" : "סגור בשבת"}
                  </span>
                </div>
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
                {a.distance !== null && (
                  <span className="rounded-full bg-primary/10 text-primary px-2.5 py-1 font-semibold">
                    📏 {a.distance.toFixed(1)} ק"מ
                  </span>
                )}
              </div>
            </article>
          ))}
        </section>

        {results.length === 0 && (
          <div className="mt-8 rounded-2xl border bg-card p-8 text-center text-muted-foreground">
            לא נמצאו אטרקציות מתאימות. נסו לשנות את הסינון או להגדיל את הרדיוס.
          </div>
        )}

        <footer className="mt-10 pb-6 text-center text-xs text-muted-foreground">
          המידע הוא לצורך התרשמות בלבד. מומלץ לוודא שעות פתיחה מול האתר הרשמי.
        </footer>
      </main>
    </div>
  );
}
