import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { searchPlaces, type PlaceResult } from "@/lib/places.functions";
import { aiSearch } from "@/lib/ai-search.functions";
import { SuggestAttraction } from "../components/suggest-attraction";

import { ThemeToggle } from "@/components/glass/theme-toggle";
import { PlaceCard } from "@/components/place-card";
import { ShabbatMode } from "@/components/shabbat-mode";
import { getWeekendWeather } from "@/lib/weather.functions";



const SITE_URL = "https://shabbat-fun-finder.lovable.app";
const PREVIEW_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3f3e2798-46a9-4cf9-b705-135aa985ee2e/id-preview-8a30869f--dd57b2b5-8044-449c-a0ff-301604bcb1e2.lovable.app-1784199306437.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "כיף לילדים - אטרקציות ובילויים לילדים בשבת" },
      { name: "description", content: "מצאו אטרקציות ובילויים לילדים הפתוחים בשבת, עם סינון לפי גיל, מיזוג, מיקום וקרבה אליכם." },
      { property: "og:title", content: "כיף לילדים - אטרקציות ובילויים לילדים בשבת" },
      { property: "og:description", content: "מצאו אטרקציות ובילויים לילדים הפתוחים בשבת, עם סינון לפי גיל, מיזוג, מיקום וקרבה אליכם." },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: PREVIEW_IMAGE },
      { name: "twitter:image", content: PREVIEW_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${SITE_URL}/#organization`,
              name: "כיף לילדים",
              url: `${SITE_URL}/`,
            },
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              name: "כיף לילדים",
              url: `${SITE_URL}/`,
              inLanguage: "he-IL",
              publisher: { "@id": `${SITE_URL}/#organization` },
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: Index,
});


import { Attraction, ATTRACTIONS } from "../data/attractions";

// Known city centers for "search near city" without geolocation
const CATEGORIES = Array.from(new Set(ATTRACTIONS.map((a) => a.category))).sort();

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "ירושלים": { lat: 31.7683, lng: 35.2137 },
  "תל אביב": { lat: 32.0853, lng: 34.7818 },
  "חיפה": { lat: 32.794, lng: 34.9896 },
  "ראשון לציון": { lat: 31.973, lng: 34.7925 },
  "פתח תקווה": { lat: 32.0878, lng: 34.8878 },
  "אשדוד": { lat: 31.8014, lng: 34.6435 },
  "נתניה": { lat: 32.3215, lng: 34.8532 },
  "באר שבע": { lat: 31.2518, lng: 34.7913 },
  "בני ברק": { lat: 32.0807, lng: 34.8338 },
  "חולון": { lat: 32.0158, lng: 34.7874 },
  "רמת גן": { lat: 32.0684, lng: 34.8248 },
  "אשקלון": { lat: 31.6688, lng: 34.5715 },
  "רחובות": { lat: 31.8947, lng: 34.8094 },
  "בת ים": { lat: 32.0231, lng: 34.7503 },
  "בית שמש": { lat: 31.7477, lng: 34.986 },
  "כפר סבא": { lat: 32.175, lng: 34.907 },
  "הרצליה": { lat: 32.1663, lng: 34.8438 },
  "חדרה": { lat: 32.4341, lng: 34.9196 },
  "מודיעין-מכבים-רעות": { lat: 31.8969, lng: 35.0104 },
  "נצרת": { lat: 32.7021, lng: 35.2978 },
  "רעננה": { lat: 32.1847, lng: 34.8708 },
  "רמלה": { lat: 31.9293, lng: 34.8666 },
  "רמת השרון": { lat: 32.1462, lng: 34.8404 },
  "נצרת עילית": { lat: 32.7018, lng: 35.3211 },
  "הוד השרון": { lat: 32.15, lng: 34.8886 },
  "גבעתיים": { lat: 32.0719, lng: 34.8103 },
  "קריית אתא": { lat: 32.8098, lng: 35.1104 },
  "נהריה": { lat: 33.01, lng: 35.098 },
  "אור יהודה": { lat: 32.0294, lng: 34.8536 },
  "עפולה": { lat: 32.6078, lng: 35.2897 },
  "רהט": { lat: 31.39, lng: 34.7642 },
  "קריית גת": { lat: 31.61, lng: 34.7642 },
  "אילת": { lat: 29.5581, lng: 34.9482 },
  "עכו": { lat: 32.9281, lng: 35.082 },
  "קריית מוצקין": { lat: 32.8367, lng: 35.0803 },
  "מעלה אדומים": { lat: 31.7714, lng: 35.2969 },
  "אריאל": { lat: 32.1044, lng: 35.1731 },
  "טבריה": { lat: 32.7922, lng: 35.5312 },
  "כרמיאל": { lat: 32.9186, lng: 35.2952 },
  "יבנה": { lat: 31.8781, lng: 34.7392 },
  "טירת כרמל": { lat: 32.7614, lng: 34.9722 },
  "שפרעם": { lat: 32.8058, lng: 35.1697 },
  "נס ציונה": { lat: 31.9294, lng: 34.7994 },
  "דימונה": { lat: 31.0688, lng: 35.0327 },
  "סחנין": { lat: 32.8642, lng: 35.2989 },
  "יהוד-מונוסון": { lat: 32.0342, lng: 34.8828 },
  "קריית ים": { lat: 32.8492, lng: 35.0692 },
  "קריית מלאכי": { lat: 31.7297, lng: 34.7469 },
  "מגדל העמק": { lat: 32.6767, lng: 35.2419 },
  "אום אל-פחם": { lat: 32.5192, lng: 35.1544 },
  "קריית ביאליק": { lat: 32.8378, lng: 35.0864 },
  "צפת": { lat: 32.9646, lng: 35.496 },
  "נתיבות": { lat: 31.4231, lng: 34.5928 },
  "אופקים": { lat: 31.3153, lng: 34.6208 },
  "טירה": { lat: 32.2333, lng: 34.95 },
  "רמת ישי": { lat: 32.7, lng: 35.1917 },
  "בית שאן": { lat: 32.497, lng: 35.4967 },
  "כפר יונה": { lat: 32.3167, lng: 34.9333 },
  "מזכרת בתיה": { lat: 31.8347, lng: 34.8558 },
  "עראבה": { lat: 32.8517, lng: 35.3383 },
  "טמרה": { lat: 32.8497, lng: 35.1972 },
  "אבן יהודה": { lat: 32.2667, lng: 34.8833 },
  "גני תקווה": { lat: 32.0667, lng: 34.85 },
  "כפר קאסם": { lat: 32.1136, lng: 34.9761 },
  "שוהם": { lat: 31.9994, lng: 34.9481 },
  "אלעד": { lat: 32.05, lng: 34.95 },
  "בית דגן": { lat: 32.0044, lng: 34.8256 },
  "מבשרת ציון": { lat: 31.7975, lng: 35.15 },
  "גדרה": { lat: 31.8125, lng: 34.7778 },
  "פרדס חנה-כרכור": { lat: 32.4739, lng: 34.9711 },
  "נשר": { lat: 32.7708, lng: 35.0439 },
  "קריית אונו": { lat: 32.0625, lng: 34.8578 },
  "זכרון יעקב": { lat: 32.5719, lng: 34.95 },
  "בנימינה-גבעת עדה": { lat: 32.5169, lng: 34.95 },
  "ראש העין": { lat: 32.0956, lng: 34.9581 },
  "גבעת שמואל": { lat: 32.0778, lng: 34.85 },
  "מודיעין עילית": { lat: 31.9328, lng: 35.0417 },
  "ביתר עילית": { lat: 31.6989, lng: 35.1075 },
  "קצרין": { lat: 32.9878, lng: 35.6889 },
  "מעלות-תרשיחא": { lat: 33.0197, lng: 35.2739 },
  "ירוחם": { lat: 30.9903, lng: 34.9269 },
  "שדרות": { lat: 31.5236, lng: 34.5967 },
  "קריית שמונה": { lat: 33.2075, lng: 35.5698 },
  "מגדל": { lat: 32.8781, lng: 35.5019 },
  "אור עקיבא": { lat: 32.5083, lng: 34.9167 },
  "פרדסיה": { lat: 32.2547, lng: 34.9364 },
  "כוכב יאיר": { lat: 32.1889, lng: 34.9633 },
  "אזור": { lat: 32.0225, lng: 34.8 },
  "קדימה-צורן": { lat: 32.2725, lng: 34.9142 },
  "תל מונד": { lat: 32.25, lng: 34.9167 },
  "לוד": { lat: 31.9516, lng: 34.8886 },
  "קרית גת": { lat: 31.61, lng: 34.7642 },
  "מודיעין": { lat: 31.8969, lng: 35.0104 },
};

function attractionToPlaceResult(a: Attraction): PlaceResult {
  return {
    id: `local-${a.id}`,
    name: a.name,
    address: a.city,
    lat: a.lat,
    lng: a.lng,
    rating: null,
    userRatingCount: null,
    mapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.name + " " + a.city)}`,
    websiteUri: a.url ?? null,
    primaryType: a.category,
    primaryTypeId: null,
    types: [],
    openNow: null,
    openShabbat: a.openShabbat,
    saturdayHours: null,
    todayHours: null,
    environment: a.environment,
    ageRange: { min: a.minAge, max: a.maxAge },
    isSoftDemoted: false,
    price: a.price ?? null,
    description: a.description,
    photoUri: null,
    emoji: a.emoji,
  };
}

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
  const [category, setCategory] = useState<string>("all");

  const [nearCity, setNearCity] = useState<string>("");
  const [radius, setRadius] = useState<number>(30);
  const [origin, setOrigin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>("");
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [didAutoLocate, setDidAutoLocate] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [googleResults, setGoogleResults] = useState<PlaceResult[] | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string>("");
  const [openNowLoading, setOpenNowLoading] = useState(false);
  const [weatherInfo, setWeatherInfo] = useState<{description: string, isHot: boolean, isRainy: boolean} | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [expandedSaturdayDetails, setExpandedSaturdayDetails] = useState<string | null>(null);
  const [activityMode, setActivityMode] = useState<boolean>(false);
  const searchPlacesFn = useServerFn(searchPlaces);
  const aiSearchFn = useServerFn(aiSearch);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const [aiChecks, setAiChecks] = useState<Record<string, string[]>>({});
  const [aiPrices, setAiPrices] = useState<Record<string, string>>({});
  const [resultsUpdatedAt, setResultsUpdatedAt] = useState<number | null>(null);
  // Saved places (works for Google/AI results, which have string ids —
  // separate from the numeric-id favorites of the built-in attractions).
  const [savedPlaces, setSavedPlaces] = useState<PlaceResult[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);

  const isSavedPlace = (id: string) => savedPlaces.some((item) => item.id === id);

  const toggleSavedPlace = (place: PlaceResult) => {
    setSavedPlaces((prev) => {
      const next = prev.some((item) => item.id === place.id)
        ? prev.filter((item) => item.id !== place.id)
        : [place, ...prev];
      try {
        localStorage.setItem("kids_saved_places", JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const [recentCitySearches, setRecentCitySearches] = useState<
    { cityName: string; result: { lat: number; lng: number; label: string } }[]
  >([]);

  const addRecentCity = (cityName: string, result: { lat: number; lng: number; label: string }) => {
    setRecentCitySearches((prev) => {
      const filtered = prev.filter((c) => c.cityName !== cityName);
      const next = [{ cityName, result }, ...filtered].slice(0, 8);
      try {
        localStorage.setItem("kids_recent_city_searches", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const runAiSearch = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? aiPrompt).trim();
    if (!prompt) {
      setAiError("כתבו במשפט מה אתם מחפשים");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiSummary("");
    setSavedOnly(false);
    try {
      const res = await aiSearchFn({ data: { prompt, fallbackOrigin: origin } });
      if (res.error) setAiError(res.error);
      if (res.origin) setOrigin(res.origin);
      setAiSummary(res.summary ?? "");
      setAiReasons(res.reasons ?? {});
      setAiChecks(res.checks ?? {});
      setAiPrices(res.priceEstimates ?? {});
      if (res.places.length > 0) {
        setGoogleResults(res.places);
        setResultsUpdatedAt(Date.now());
      }
    } catch (e) {
      console.error(e);
      setAiError("שגיאה בחיפוש AI");
    } finally {
      setAiLoading(false);
    }
  };

  const runItinerarySearch = async () => {
    if (!origin) {
      setAiError("אנא בחרו מיקום קודם כדי שנבנה לכם מסלול הגיוני");
      return;
    }
    setAiLoading(true);
    setItineraryLoading(true);
    setAiError("");
    setAiSummary("");
    setSavedOnly(false);
    try {
      const prompt = "תבנה מסלול שלם לשבת (בוקר, צהריים, אחהצ). מזג אוויר: .";
      const res = await aiSearchFn({ data: { prompt, fallbackOrigin: origin } });
      if (res.error) setAiError(res.error);
      setAiSummary("הנה הצעה למסלול מלא לשבת הקרובה! 🎲\n" + (res.summary ?? ""));
      setAiReasons(res.reasons ?? {});
      setAiChecks(res.checks ?? {});
      setAiPrices(res.priceEstimates ?? {});
      if (res.places.length > 0) {
        setGoogleResults(res.places);
        setResultsUpdatedAt(Date.now());
      } else {
        setGoogleResults([]);
      }
    } catch (err) {
      setAiError("תקלה בבניית המסלול");
    } finally {
      setAiLoading(false);
      setItineraryLoading(false);
    }
  };


  const runGoogleSearch = async () => {
    if (!origin) {
      setGoogleError("בחרו קודם עיר או השתמשו במיקום שלכם");
      return;
    }
    setGoogleLoading(true);
    setGoogleError("");
    try {
      const res = await searchPlacesFn({
        data: {
          lat: origin.lat,
          lng: origin.lng,
          radius: Math.min(radius, 50) * 1000,
          keyword: query.trim(),
          activityMode,
        },
      });
      if (res.error) setGoogleError(res.error);

      // Merge our hand-picked local attractions inside the same radius so the
      // user only ever sees ONE unified list, sorted purely by distance.
      const effectiveRadius = Math.min(radius, 50);
      const localMatches = ATTRACTIONS
        .filter((a) => {
          if (showFavOnly && !favorites.includes(a.id)) return false;
          if (shabbatOnly && !a.openShabbat) return false;
          if (env !== "all" && a.environment !== env) return false;
          if (region !== "all" && a.region !== region) return false;
          if (category !== "all" && a.category !== category) return false;
          if (age !== "" && (age < a.minAge || age > a.maxAge)) return false;
          if (query.trim()) {
            const q = query.trim();
            if (!(a.name.includes(q) || a.category.includes(q))) return false;
          }
          return distanceKm(origin, { lat: a.lat, lng: a.lng }) <= effectiveRadius;
        })
        .map(attractionToPlaceResult);

      // De-dupe by name+city so a local entry and its Google twin (e.g. same
      // mall) don't both show up.
      const seenNames = new Set(
        res.places.map((p) => `${p.name.trim().toLowerCase()}|${p.address.split(",")[0]?.trim().toLowerCase()}`)
      );
      const uniqueLocalMatches = localMatches.filter(
        (p) => !seenNames.has(`${p.name.trim().toLowerCase()}|${p.address.trim().toLowerCase()}`)
      );

      const merged = [...res.places, ...uniqueLocalMatches];
      const sortedByDistance = merged.sort((a, b) => {
        const distanceA = distanceKm(origin, { lat: a.lat, lng: a.lng });
        const distanceB = distanceKm(origin, { lat: b.lat, lng: b.lng });
        const delta = distanceA - distanceB;
        if (Math.abs(delta) > 0.05) return delta;
        const cityA = a.address.split(",").at(-1)?.trim() ?? "";
        const cityB = b.address.split(",").at(-1)?.trim() ?? "";
        return cityA.localeCompare(cityB, "he") || a.name.localeCompare(b.name, "he");
      });
      setGoogleResults(sortedByDistance);
      setResultsUpdatedAt(Date.now());
      setAiReasons({});
      setAiChecks({});
      setAiPrices({});
    } catch (e) {
      setGoogleError("שגיאה בחיפוש");
      console.error(e);
    } finally {
      setGoogleLoading(false);
    }
  };

  

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kids_favorites");
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
    try {
      const rawSaved = localStorage.getItem("kids_saved_places");
      if (rawSaved) {
        const parsed = JSON.parse(rawSaved) as PlaceResult[];
        if (Array.isArray(parsed)) setSavedPlaces(parsed);
      }
    } catch {}
    try {
      const rawRecent = localStorage.getItem("kids_recent_city_searches");
      if (rawRecent) {
        const savedList = JSON.parse(rawRecent) as {
          cityName: string;
          result: { lat: number; lng: number; label: string };
        }[];
        if (Array.isArray(savedList) && savedList.length > 0) {
          setRecentCitySearches(savedList);
          const mostRecent = savedList[0];
          if (mostRecent?.result?.lat && mostRecent?.result?.lng) {
            setNearCity(CITY_COORDS[mostRecent.cityName] ? mostRecent.cityName : "");
            setOrigin(mostRecent.result);
          }
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("kids_favorites", JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  useEffect(() => {
    if (didAutoLocate || origin) return;
    setDidAutoLocate(true);
    useMyLocation(true);
  }, [didAutoLocate, origin]);

  useEffect(() => {
    if (origin) {
      getWeekendWeather(origin.lat, origin.lng).then(setWeatherInfo);
    }
  }, [origin]);

  const toggleFav = (id: number) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const cityNames = useMemo(() => Object.keys(CITY_COORDS).sort((a, b) => a.localeCompare(b, "he")), []);

  /**
   * Resolve GPS position with a hard timeout — some devices/browsers block
   * location silently and never call either callback, which used to leave the
   * UI stuck on "מאתר מיקום...".
   */
  const getPosition = (timeoutMs = 8000) =>
    new Promise<{ lat: number; lng: number; label: string } | null>((resolve) => {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) return resolve(null);
      let settled = false;
      const done = (v: { lat: number; lng: number; label: string } | null) => {
        if (settled) return;
        settled = true;
        resolve(v);
      };
      const timer = setTimeout(() => done(null), timeoutMs);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          done({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "המיקום שלי" });
        },
        () => {
          clearTimeout(timer);
          done(null);
        },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300000 }
      );
    });

  const useMyLocation = async (silent = false) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoBlocked(true);
      if (!silent) setGeoStatus("הדפדפן לא תומך במיקום – בחרו עיר קרובה מהרשימה");
      return null;
    }
    if (!silent) setGeoStatus("מאתר מיקום...");
    const located = await getPosition();
    if (located) {
      setGeoBlocked(false);
      setOrigin(located);
      setNearCity("");
      setGeoStatus("");
      return located;
    }
    setGeoBlocked(true);
    setGeoStatus(
      silent ? "" : "המיקום חסום במכשיר – בחרו עיר קרובה מהרשימה והכפתור יחפש סביבה"
    );
    return null;
  };

  /**
   * "מה פתוח עכשיו בסביבתי" — one tap: use GPS, and when the device blocks
   * location fall back to the city already chosen so the button still works.
   * Searches ~15–20 minutes of driving and relaxes filters step by step
   * instead of returning an empty list.
   */
  const runOpenNowNearby = async () => {
    setOpenNowLoading(true);
    setGoogleError("");
    setSavedOnly(false);
    setAiReasons({});
    setAiChecks({});
    setAiPrices({});
    setAiSummary("");

    try {
      const located = geoBlocked ? null : await getPosition();
      const here = located ?? origin;
      if (!here) {
        setGeoBlocked(true);
        setGeoStatus("לא הצלחנו לאתר את המיקום – בחרו עיר קרובה מהרשימה ולחצו שוב");
        return;
      }
      if (located) {
        setGeoBlocked(false);
        setOrigin(located);
        setNearCity("");
      }
      setGeoStatus(located ? "" : `מחפשים סביב ${here.label}`);


      const isShabbatNow = new Date().getDay() === 6;
      // Try a tight radius first, then widen if nothing sensible comes back.
      for (const quickRadius of [18, 35]) {
        setRadius(quickRadius);
        const res = await searchPlacesFn({
          data: { lat: here.lat, lng: here.lng, radius: quickRadius * 1000, keyword: "", activityMode: false },
        });
        if (res.error) {
          setGoogleError(res.error);
          setGoogleResults([]);
          return;
        }

        const byDistance = (list: PlaceResult[]) =>
          [...list].sort((a, b) => distanceKm(here, a) - distanceKm(here, b));
        const openNow = res.places.filter((p) => p.openNow !== false);
        const shabbatFriendly = openNow.filter((p) => p.openShabbat === true || Boolean(p.saturdayHours));
        const indoorShabbat = shabbatFriendly.filter((p) => p.environment === "ממוזג" || p.environment === "משולב");

        // Best → good enough, in order.
        const tiers: { list: PlaceResult[]; note: string }[] = [
          { list: indoorShabbat, note: "" },
          { list: shabbatFriendly, note: "אין מקומות ממוזגים פנויים – מוצגים גם מקומות פתוחים" },
          { list: openNow, note: isShabbatNow ? "" : "מוצג מה שפתוח עכשיו (לא בהכרח פתוח בשבת)" },
        ];
        const hit = tiers.find((t) => t.list.length >= 3) ?? tiers.find((t) => t.list.length > 0);
        if (hit) {
          setShabbatOnly(hit.list === indoorShabbat || hit.list === shabbatFriendly);
          setEnv(hit.list === indoorShabbat ? "ממוזג" : "all");
          setGoogleResults(byDistance(hit.list));
          setResultsUpdatedAt(Date.now());
          setGoogleError(
            hit.note ? `${hit.note} · רדיוס ${quickRadius} ק"מ` : ""
          );
          return;
        }
      }

      setGoogleResults([]);
      setGoogleError("לא מצאנו מקומות שפתוחים עכשיו בסביבה – נסו להגדיל את הרדיוס או לחפש בגוגל");
    } catch (e) {
      console.error(e);
      setGoogleError("שגיאה בחיפוש");
    } finally {
      setOpenNowLoading(false);
    }
  };



  const pickCity = (city: string) => {
    setNearCity(city);
    if (city && CITY_COORDS[city]) {
      const result = { ...CITY_COORDS[city], label: city };
      setOrigin(result);
      addRecentCity(city, result);
    } else {
      setOrigin(null);
    }
  };

  const clearNearby = () => {
    setOrigin(null);
    setNearCity("");
    setGeoStatus("");
  };

  const selectRecentCity = (item: { cityName: string; result: { lat: number; lng: number; label: string } }) => {
    setOrigin(item.result);
    setNearCity(CITY_COORDS[item.cityName] ? item.cityName : "");
    setGeoStatus("");
    addRecentCity(item.cityName, item.result);
  };

  const removeRecentCity = (cityName: string) => {
    setRecentCitySearches((prev) => {
      const next = prev.filter((c) => c.cityName !== cityName);
      try {
        localStorage.setItem("kids_recent_city_searches", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="liquid-orb orb-a" aria-hidden="true" />
      <div className="liquid-orb orb-b" aria-hidden="true" />
      <div className="liquid-orb orb-c" aria-hidden="true" />
      <div className="liquid-orb orb-d" aria-hidden="true" />
      <header className="glass-header text-primary-foreground rounded-b-[28px]">
        <div className="mx-auto max-w-5xl px-4 py-10 relative">
          <div className="absolute top-4 left-4">
            <ThemeToggle />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">כיף לילדים – אטרקציות ובילויים בשבת 🎈</h1>
          <p className="mt-2 text-base md:text-lg opacity-90">
            מוצאים אטרקציות לילדים – כולל אלה שפתוחות בשבת, ממוזגות או בחוץ, ולפי גיל וקרבה אליכם
          </p>
          {weatherInfo && (
            <div className={`mt-4 inline-block px-4 py-2 rounded-full font-bold text-sm ${weatherInfo.isHot ? 'bg-orange-500/20 text-orange-900 dark:text-orange-100' : weatherInfo.isRainy ? 'bg-blue-500/20 text-blue-900 dark:text-blue-100' : 'bg-green-500/20 text-green-900 dark:text-green-100'}`}>
              {weatherInfo.description}
            </div>
          )}
        </div>
      </header>


      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <SuggestAttraction />
        <ShabbatMode
          originLabel={origin?.label ?? null}
          loading={aiLoading}
          onSearch={(prompt) => {
            setAiPrompt(prompt);
            void runAiSearch(prompt);
          }}
        />

        <section className="glass-panel rounded-2xl p-4">
          <h2 className="text-lg font-bold">✨ חיפוש חכם עם AI</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            כתבו במשפט אחד מה אתם מחפשים – גילאי הילדים, מאיפה אתם יוצאים, כמה זמן נסיעה ותקציב.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={3}
            aria-label="תיאור הפעילות שאתם מחפשים"
            placeholder='לדוגמה: יש לנו שני ילדים בני 4 ו־7, אנחנו מראש העין, רוצים משהו עד 30 דקות נסיעה ובחינם'
            className="glass-field mt-3 w-full rounded-xl px-4 py-3 text-base"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => runAiSearch()}
              disabled={aiLoading}
              className="glass-btn-primary rounded-2xl px-6 py-3 text-base font-bold disabled:opacity-70 inline-flex items-center gap-2"
            >
              {aiLoading && !itineraryLoading ? "ה-AI מחפש בשבילכם..." : "✨ מצא לי פעילות מתאימה"}
            </button>
            <button
              onClick={runItinerarySearch}
              disabled={aiLoading}
              className="rounded-2xl px-6 py-3 text-base font-bold disabled:opacity-70 inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-lg"
            >
              {itineraryLoading ? "בונה מסלול..." : "🎲 תבנה לי את השבת"}
            </button>
            {aiPrompt && (
              <button
                onClick={() => {
                  setAiPrompt("");
                  setAiSummary("");
                  setAiError("");
                  setAiReasons({});
                  setAiChecks({});
                  setAiPrices({});
                }}
                className="glass-btn rounded-2xl px-4 py-2 text-sm"
              >
                נקה
              </button>
            )}
          </div>
          {aiSummary && (
            <div className="glass-panel mt-3 rounded-2xl p-3 text-sm">🤖 {aiSummary}</div>
          )}
          {aiError && <div className="mt-2 text-xs text-rose-700">{aiError}</div>}
        </section>

        <section className="glass-panel mt-4 rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="שם או קטגוריה"
              aria-label="חיפוש לפי שם או קטגוריה"
              className="glass-field w-full min-w-0 rounded-xl px-3 py-2.5 text-sm md:col-span-1"
            />

            <div className="flex flex-wrap gap-2 md:col-span-3">
              <select
                value={age === "" ? "" : String(age)}
                onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                className="glass-select rounded-xl px-3 py-3 text-base"
                aria-label="גיל הילד"
              >
                <option value="">גיל הילד</option>
                {Array.from({ length: 19 }, (_, i) => i).map((n) => (
                  <option key={n} value={n}>
                    גיל {n}
                  </option>
                ))}
              </select>

              <select
                value={env}
                onChange={(e) => setEnv(e.target.value as typeof env)}
                className="glass-select rounded-xl px-3 py-3 text-base"
                aria-label="סינון לפי סביבה"
              >
                <option value="all">סביבה</option>
                <option value="ממוזג">ממוזג</option>
                <option value="פתוח">פתוח</option>
                <option value="משולב">משולב</option>
              </select>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as typeof region)}
                className="glass-select rounded-xl px-3 py-3 text-base"
                aria-label="סינון לפי אזור"
              >

                <option value="all">אזור</option>
                <option value="צפון">צפון</option>
                <option value="מרכז">מרכז</option>
                <option value="ירושלים">ירושלים</option>
                <option value="דרום">דרום</option>
              </select>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="glass-select rounded-xl px-3 py-3 text-base"
                aria-label="סינון לפי קטגוריה"
              >
                <option value="all">כל הקטגוריות</option>
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
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

          <div className="glass-panel mt-4 rounded-2xl p-3">
            <div className="text-sm font-semibold mb-2">🔎 חיפוש לפי קרבה אליי</div>
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <button
                onClick={runOpenNowNearby}
                disabled={openNowLoading || (geoBlocked && !origin)}
                className="glass-btn-primary rounded-2xl px-4 py-2 text-sm font-bold disabled:opacity-70"
                title={geoBlocked && !origin ? "בחרו עיר קרובה כדי להפעיל" : undefined}
              >
                {openNowLoading
                  ? "מאתר בסביבה..."
                  : geoBlocked && origin
                    ? `⚡ מה פתוח עכשיו סביב ${origin.label}`
                    : "⚡ מה פתוח עכשיו בסביבתי"}
              </button>
              {!geoBlocked && (
                <button
                  onClick={() => useMyLocation()}
                  className="glass-btn rounded-2xl px-3 py-2 text-xs"
                  title="רק לעדכן את המיקום שלי בלי חיפוש"
                >
                  📍 עדכן מיקום
                </button>
              )}
              <span className="text-sm text-muted-foreground">או</span>


              <select
                value={nearCity}
                onChange={(e) => pickCity(e.target.value)}
                className="glass-select rounded-2xl px-3 py-2 text-sm"
                aria-label="בחירת עיר קרובה"
              >
                <option value="">בחרו עיר קרובה...</option>
                {cityNames.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="flex items-center gap-2 flex-1">
                <label htmlFor="radius-range" className="text-sm whitespace-nowrap">רדיוס: {radius} ק"מ</label>
                <input
                  id="radius-range"
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
                  className="glass-btn rounded-2xl px-3 py-2 text-sm"
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

          {recentCitySearches.length > 0 && (
            <div className="glass-panel mt-4 rounded-2xl p-3">
              <div className="text-sm font-semibold mb-2">🕘 חיפושים אחרונים</div>
              <div className="flex flex-wrap gap-2">
                {recentCitySearches.map((item) => (
                  <div
                    key={item.cityName}
                    className={`glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs whitespace-nowrap ${
                      origin?.label === item.result.label ? "ring-2 ring-primary/60" : ""
                    }`}
                  >
                    <button
                      onClick={() => selectRecentCity(item)}
                      className="hover:underline"
                    >
                      {item.cityName}
                    </button>
                    <button
                      onClick={() => removeRecentCity(item.cityName)}
                      aria-label={`הסר ${item.cityName} מהיסטוריית החיפושים`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {origin && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={runGoogleSearch}
                disabled={googleLoading}
                className="glass-btn-primary rounded-2xl px-6 py-3 text-base font-bold shadow-lg shadow-primary/30 hover:scale-[1.03] active:scale-[0.98] transition-transform disabled:opacity-70 disabled:hover:scale-100 inline-flex items-center gap-2"
              >
                {googleLoading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2z" />
                    </svg>
                    מחפש אטרקציות...
                  </>
                ) : (
                  <>🔎 חפש אטרקציות בגוגל</>
                )}
              </button>
              <label className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={activityMode}
                  onChange={(e) => setActivityMode(e.target.checked)}
                  className="accent-emerald-600"
                />
                <span>🎡 מצב פעילות (אטרקציות בלבד — בלי מסעדות/קניונים)</span>
              </label>
              <span className="text-xs text-muted-foreground">
                עד {Math.min(radius, 50)} ק"מ · מקסימום 20 תוצאות
              </span>
            </div>
          )}
          {googleError && (
            <div className="mt-2 text-xs text-rose-700">{googleError}</div>
          )}
        </section>

        {googleLoading && !googleResults ? (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <svg
              className="h-10 w-10 animate-spin text-primary"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2z" />
            </svg>
            <span className="text-sm font-medium">מחפשים אטרקציות בגוגל בשבילכם...</span>
          </div>
        ) : googleResults || (savedOnly && savedPlaces.length > 0) ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                {savedOnly
                  ? `⭐ הרשימה שלי: ${savedPlaces.length} מקומות`
                  : `🌍 תוצאות: ${googleResults?.length ?? 0} · מסודר מהקרוב לרחוק`}
              </span>
              <label className="glass-chip inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5">
                <input
                  type="checkbox"
                  checked={savedOnly}
                  onChange={(e) => setSavedOnly(e.target.checked)}
                  className="accent-primary"
                />
                <span>⭐ הצג רק את הרשימה שלי ({savedPlaces.length})</span>
              </label>
            </div>
            {(() => {
              const list = savedOnly ? savedPlaces : googleResults ?? [];
              const ranked = !savedOnly && Object.keys(aiReasons).length > 0;
              const card = (p: PlaceResult, index: number) => (
                <PlaceCard
                  key={p.id}
                  place={p}
                  distanceKm={origin ? distanceKm(origin, { lat: p.lat, lng: p.lng }) : null}
                  rank={ranked ? index + 1 : null}
                  reason={aiReasons[p.id]}
                  checks={aiChecks[p.id]}
                  priceEstimate={aiPrices[p.id]}
                  saved={isSavedPlace(p.id)}
                  onToggleSave={() => toggleSavedPlace(p)}
                  updatedAt={resultsUpdatedAt}
                  saturdayOpen={expandedSaturdayDetails === p.id}
                  onToggleSaturday={() =>
                    setExpandedSaturdayDetails((current) => (current === p.id ? null : p.id))
                  }
                />
              );
              return (
                <div className="mt-3 space-y-4">
                  {ranked && list.length > 0 && (
                    <div className="mx-auto max-w-2xl">{card(list[0]!, 0)}</div>
                  )}
                  {ranked && list.length > 1 && (
                    <h2 className="pt-2 text-base font-bold">עוד אפשרויות מתאימות</h2>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {(ranked ? list.slice(1) : list).map((p, i) => card(p, ranked ? i + 2 : i))}
                  </div>
                </div>
              );
            })()}

            {(savedOnly ? savedPlaces.length === 0 : googleResults?.length === 0) && !googleLoading && (
              <div className="glass-empty mt-8 rounded-2xl p-8 text-center text-muted-foreground">
                {savedOnly
                  ? "עוד לא שמרתם מקומות. לחצו על 🤍 בכרטיס כדי להוסיף לרשימה."
                  : "לא נמצאו תוצאות ב-Google. נסו לשנות את החיפוש או הרדיוס."}
              </div>
            )}

          </>
        ) : (
          <div className="glass-empty mt-8 rounded-2xl p-10 text-center text-muted-foreground">
            {origin
              ? "בחרו סינון ולחצו על \"חפש אטרקציות בגוגל\" כדי להציג תוצאות."
              : "בחרו עיר או השתמשו במיקום שלכם, ואז לחצו על \"חפש אטרקציות בגוגל\"."}
          </div>
        )}


        <footer className="mt-10 pb-6 text-center text-xs text-muted-foreground">
          המידע הוא לצורך התרשמות בלבד. מומלץ לוודא שעות פתיחה מול האתר הרשמי.
        </footer>
      </main>
    </div>
  );
}




