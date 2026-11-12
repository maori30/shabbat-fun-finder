import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchPlaces, geocodeCity, type PlaceResult } from "@/lib/places.functions";
import { aiSearch, type ItineraryStop } from "@/lib/ai-search.functions";
import { getWeekendWeather } from "@/lib/weather.functions";
import { CITY_COORDS, citySlug, distanceKm, resolveCityName } from "@/lib/geo";
import { applyFilters, type EnvFilter } from "@/lib/filters";
import { ATTRACTIONS, type Attraction } from "@/data/attractions";
import { SuggestAttraction } from "@/components/suggest-attraction";
import { ThemeToggle } from "@/components/glass/theme-toggle";
import { PlaceCard } from "@/components/place-card";
import { ShabbatMode } from "@/components/shabbat-mode";
import { fetchReportCounts, type ReportCounts } from "@/components/community-reports";

type Origin = { lat: number; lng: number; label: string };
type RecentCity = { cityName: string; result: Origin };

const MAX_RADIUS_KM = 50;
const POPULAR_CITIES = [
  "ירושלים",
  "תל אביב",
  "חיפה",
  "ראשון לציון",
  "פתח תקווה",
  "אשדוד",
  "נתניה",
  "באר שבע",
  "חולון",
  "רמת גן",
  "רחובות",
  "מודיעין-מכבים-רעות",
  "כפר סבא",
  "הרצליה",
  "רעננה",
  "ראש העין",
];
const SAVED_KEY = "kids_saved_places";
const LEGACY_FAVORITES_KEY = "kids_favorites";
const RECENT_KEY = "kids_recent_city_searches";

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
    stroller_accessible: a.stroller_accessible,
    changing_table: a.changing_table,
    easy_parking: a.easy_parking,
  };
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — keep in memory only */
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Resolve GPS position with a hard timeout — some devices/browsers block
 * location silently and never call either callback.
 */
function getPosition(timeoutMs = 8000) {
  return new Promise<Origin | null>((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return resolve(null);
    let settled = false;
    const done = (v: Origin | null) => {
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
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300000 },
    );
  });
}

const Spinner = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-90"
      fill="currentColor"
      d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2z"
    />
  </svg>
);

export function Finder({ initialCity }: { initialCity?: string } = {}) {
  // --- filters ---
  const [query, setQuery] = useState("");
  const [shabbatOnly, setShabbatOnly] = useState(true);
  const [age, setAge] = useState<number | "">("");
  const [env, setEnv] = useState<EnvFilter>("all");
  const [activityMode, setActivityMode] = useState(false);

  // --- location ---
  const [nearCity, setNearCity] = useState<string>(initialCity ?? "");
  const [cityInput, setCityInput] = useState("");
  const [cityLookupLoading, setCityLookupLoading] = useState(false);
  const [radius, setRadius] = useState<number>(30);
  const [origin, setOrigin] = useState<Origin | null>(
    initialCity && CITY_COORDS[initialCity]
      ? { ...CITY_COORDS[initialCity]!, label: initialCity }
      : null,
  );
  const [geoStatus, setGeoStatus] = useState("");
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [recentCitySearches, setRecentCitySearches] = useState<RecentCity[]>([]);

  // --- results ---
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [openNowLoading, setOpenNowLoading] = useState(false);
  const [resultsUpdatedAt, setResultsUpdatedAt] = useState<number | null>(null);
  const [expandedSaturdayDetails, setExpandedSaturdayDetails] = useState<string | null>(null);
  const [reportCounts, setReportCounts] = useState<Record<string, ReportCounts>>({});

  // --- AI ---
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const [aiChecks, setAiChecks] = useState<Record<string, string[]>>({});
  const [aiPrices, setAiPrices] = useState<Record<string, string>>({});
  const [itinerary, setItinerary] = useState<ItineraryStop[] | null>(null);
  const [lunchTip, setLunchTip] = useState("");

  // --- weather ---
  const [weatherInfo, setWeatherInfo] = useState<{
    description: string;
    isHot: boolean;
    isRainy: boolean;
  } | null>(null);

  // --- saved list (one list for every source) ---
  const [savedPlaces, setSavedPlaces] = useState<PlaceResult[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);

  const searchPlacesFn = useServerFn(searchPlaces);
  const aiSearchFn = useServerFn(aiSearch);
  const geocodeCityFn = useServerFn(geocodeCity);

  const isSavedPlace = (id: string) => savedPlaces.some((item) => item.id === id);
  const toggleSavedPlace = (place: PlaceResult) => {
    setSavedPlaces((prev) => {
      const next = prev.some((item) => item.id === place.id)
        ? prev.filter((item) => item.id !== place.id)
        : [place, ...prev];
      saveJson(SAVED_KEY, next);
      return next;
    });
  };

  const addRecentCity = (cityName: string, result: Origin) => {
    setRecentCitySearches((prev) => {
      const next = [{ cityName, result }, ...prev.filter((c) => c.cityName !== cityName)].slice(
        0,
        8,
      );
      saveJson(RECENT_KEY, next);
      return next;
    });
  };

  const removeRecentCity = (cityName: string) => {
    setRecentCitySearches((prev) => {
      const next = prev.filter((c) => c.cityName !== cityName);
      saveJson(RECENT_KEY, next);
      return next;
    });
  };

  const resetAi = () => {
    setAiSummary("");
    setAiError("");
    setAiReasons({});
    setAiChecks({});
    setAiPrices({});
    setItinerary(null);
    setLunchTip("");
  };

  const runAiSearch = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? aiPrompt).trim();
    if (!prompt) {
      setAiError("כתבו במשפט מה אתם מחפשים");
      return;
    }
    setAiLoading(true);
    resetAi();
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
        setResults(res.places);
        setResultsUpdatedAt(Date.now());
      }
    } catch (e) {
      console.error(e);
      setAiError("החיפוש החכם לא זמין כרגע – נסו שוב בעוד רגע");
    } finally {
      setAiLoading(false);
    }
  };

  const runItinerarySearch = async () => {
    if (!origin && !aiPrompt.trim()) {
      setAiError("בחרו מיקום (או כתבו מאיפה יוצאים) כדי שנבנה מסלול הגיוני");
      return;
    }
    setAiLoading(true);
    setItineraryLoading(true);
    resetAi();
    setSavedOnly(false);
    try {
      const prompt = `תבנה מסלול שלם לשבת עם הילדים (בוקר, צהריים, אחר הצהריים).${
        aiPrompt.trim() ? ` פרטים מההורים: ${aiPrompt.trim()}` : ""
      }`;
      const res = await aiSearchFn({
        data: {
          prompt,
          fallbackOrigin: origin,
          mode: "itinerary",
          weather: weatherInfo?.description ?? null,
        },
      });
      if (res.error) setAiError(res.error);
      if (res.origin) setOrigin(res.origin);
      setAiSummary(res.summary ?? "");
      setAiReasons(res.reasons ?? {});
      setAiChecks(res.checks ?? {});
      setAiPrices(res.priceEstimates ?? {});
      setItinerary(res.itinerary && res.itinerary.length > 0 ? res.itinerary : null);
      setLunchTip(res.lunchTip ?? "");
      setResults(res.places);
      setResultsUpdatedAt(Date.now());
    } catch (err) {
      console.error(err);
      setAiError("לא הצלחנו לבנות מסלול כרגע – נסו שוב בעוד רגע");
    } finally {
      setAiLoading(false);
      setItineraryLoading(false);
    }
  };

  const runGoogleSearch = async () => {
    if (!origin) {
      setSearchError("בחרו קודם עיר או השתמשו במיקום שלכם");
      return;
    }
    setSearchLoading(true);
    setSearchError("");
    setSavedOnly(false);
    resetAi();
    try {
      const effectiveRadius = Math.min(radius, MAX_RADIUS_KM);
      const res = await searchPlacesFn({
        data: {
          lat: origin.lat,
          lng: origin.lng,
          radius: effectiveRadius * 1000,
          keyword: query.trim(),
          activityMode,
        },
      });
      if (res.error) setSearchError(res.error);

      // Merge our hand-picked attractions inside the same radius so the user
      // sees ONE list. Shabbat/age/environment filters are applied at render
      // time to the whole list (see `visible` below).
      const q = query.trim();
      const localMatches = ATTRACTIONS.filter((a) => {
        if (q && !(a.name.includes(q) || a.category.includes(q))) return false;
        return distanceKm(origin, a) <= effectiveRadius;
      }).map(attractionToPlaceResult);

      // De-dupe a local entry and its Google twin.
      const seenNames = new Set(res.places.map((p) => p.name.trim().toLowerCase()));
      const merged = [
        ...res.places,
        ...localMatches.filter((p) => !seenNames.has(p.name.trim().toLowerCase())),
      ];
      merged.sort(
        (a, b) =>
          distanceKm(origin, a) - distanceKm(origin, b) || a.name.localeCompare(b.name, "he"),
      );
      setResults(merged);
      setResultsUpdatedAt(Date.now());
    } catch (e) {
      console.error(e);
      setSearchError("החיפוש נכשל – בדקו את החיבור ונסו שוב");
    } finally {
      setSearchLoading(false);
    }
  };

  const locateMe = async () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoBlocked(true);
      setGeoStatus("הדפדפן לא תומך במיקום – בחרו או הקלידו עיר");
      return null;
    }
    setGeoStatus("מאתר מיקום...");
    const located = await getPosition();
    if (located) {
      setGeoBlocked(false);
      setOrigin(located);
      setNearCity("");
      setGeoStatus("");
      return located;
    }
    setGeoBlocked(true);
    setGeoStatus("המיקום חסום במכשיר – בחרו או הקלידו עיר קרובה");
    return null;
  };

  /**
   * "מה פתוח עכשיו בסביבתי" — one tap: GPS, falling back to the chosen city.
   * Widens the radius and relaxes filters step by step instead of returning
   * an empty list.
   */
  const runOpenNowNearby = async () => {
    setOpenNowLoading(true);
    setSearchError("");
    setSavedOnly(false);
    resetAi();
    try {
      const located = geoBlocked ? null : await getPosition();
      const here = located ?? origin;
      if (!here) {
        setGeoBlocked(true);
        setGeoStatus("לא הצלחנו לאתר את המיקום – בחרו עיר קרובה ולחצו שוב");
        return;
      }
      if (located) {
        setGeoBlocked(false);
        setOrigin(located);
        setNearCity("");
      }
      setGeoStatus(located ? "" : `מחפשים סביב ${here.label}`);

      const isShabbatNow = new Date().getDay() === 6;
      for (const quickRadius of [18, 35]) {
        setRadius(quickRadius);
        const res = await searchPlacesFn({
          data: {
            lat: here.lat,
            lng: here.lng,
            radius: quickRadius * 1000,
            keyword: "",
            activityMode: false,
          },
        });
        if (res.error) {
          setSearchError(res.error);
          setResults([]);
          return;
        }
        const byDistance = (list: PlaceResult[]) =>
          [...list].sort((a, b) => distanceKm(here, a) - distanceKm(here, b));
        const openNow = res.places.filter((p) => p.openNow !== false);
        const shabbatFriendly = openNow.filter(
          (p) => p.openShabbat === true || Boolean(p.saturdayHours),
        );
        const indoorShabbat = shabbatFriendly.filter(
          (p) => p.environment === "ממוזג" || p.environment === "משולב",
        );
        const tiers: { list: PlaceResult[]; note: string }[] = [
          { list: indoorShabbat, note: "" },
          { list: shabbatFriendly, note: "אין מספיק מקומות ממוזגים – מוצגים גם מקומות בחוץ" },
          { list: openNow, note: isShabbatNow ? "" : "מוצג מה שפתוח עכשיו (לא בהכרח פתוח בשבת)" },
        ];
        const hit = tiers.find((t) => t.list.length >= 3) ?? tiers.find((t) => t.list.length > 0);
        if (hit) {
          setShabbatOnly(hit.list === indoorShabbat || hit.list === shabbatFriendly);
          setEnv(hit.list === indoorShabbat ? "ממוזג" : "all");
          setAge("");
          setResults(byDistance(hit.list));
          setResultsUpdatedAt(Date.now());
          setSearchError(hit.note ? `${hit.note} · רדיוס ${quickRadius} ק"מ` : "");
          return;
        }
      }
      setResults([]);
      setSearchError("לא מצאנו מקומות שפתוחים עכשיו בסביבה – נסו להגדיל את הרדיוס");
    } catch (e) {
      console.error(e);
      setSearchError("החיפוש נכשל – בדקו את החיבור ונסו שוב");
    } finally {
      setOpenNowLoading(false);
    }
  };

  const pickCity = (city: string) => {
    setNearCity(city);
    setGeoStatus("");
    if (city && CITY_COORDS[city]) {
      const result = { ...CITY_COORDS[city]!, label: city };
      setOrigin(result);
      addRecentCity(city, result);
    } else {
      setOrigin(null);
    }
  };

  /** Free-text city: known list first, then Google geocoding (any town). */
  const lookupCity = async () => {
    const name = cityInput.trim();
    if (!name) return;
    const known = resolveCityName(name);
    if (known) {
      pickCity(known);
      setCityInput("");
      return;
    }
    setCityLookupLoading(true);
    setGeoStatus("");
    try {
      const geo = await geocodeCityFn({ data: { cityName: name } });
      if (geo) {
        const result = { lat: geo.lat, lng: geo.lng, label: name };
        setOrigin(result);
        setNearCity("");
        addRecentCity(name, result);
        setCityInput("");
      } else {
        setGeoStatus(`לא מצאנו את "${name}" – נסו לכתוב אחרת או לבחור מהרשימה`);
      }
    } catch {
      setGeoStatus("חיפוש העיר נכשל – נסו שוב");
    } finally {
      setCityLookupLoading(false);
    }
  };

  const clearNearby = () => {
    setOrigin(null);
    setNearCity("");
    setGeoStatus("");
  };

  const selectRecentCity = (item: RecentCity) => {
    setOrigin(item.result);
    setNearCity(CITY_COORDS[item.cityName] ? item.cityName : "");
    setGeoStatus("");
    addRecentCity(item.cityName, item.result);
  };

  // Load saved data once. Location is NOT requested automatically — only
  // when the user taps a location button.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const saved = readJson<PlaceResult[]>(SAVED_KEY);
    let savedList = Array.isArray(saved) ? saved : [];
    // Migrate the old ❤️ favorites (numeric ids of built-in attractions)
    // into the single saved list.
    const legacy = readJson<number[]>(LEGACY_FAVORITES_KEY);
    if (Array.isArray(legacy) && legacy.length > 0) {
      const migrated = ATTRACTIONS.filter((a) => legacy.includes(a.id))
        .map(attractionToPlaceResult)
        .filter((p) => !savedList.some((s) => s.id === p.id));
      savedList = [...savedList, ...migrated];
      saveJson(SAVED_KEY, savedList);
      try {
        localStorage.removeItem(LEGACY_FAVORITES_KEY);
      } catch {
        /* ignore */
      }
    }
    setSavedPlaces(savedList);

    const recent = readJson<RecentCity[]>(RECENT_KEY);
    if (Array.isArray(recent) && recent.length > 0) {
      setRecentCitySearches(recent);
      const mostRecent = recent[0];
      if (!initialCity && mostRecent?.result?.lat && mostRecent?.result?.lng) {
        setNearCity(CITY_COORDS[mostRecent.cityName] ? mostRecent.cityName : "");
        setOrigin(mostRecent.result);
      }
    }

    // Deep link: /?q=... runs the smart search (matches the SearchAction in
    // the page's structured data and lets people share a search).
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    if (q) {
      setAiPrompt(q.slice(0, 600));
      void runAiSearch(q.slice(0, 600));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const lat = origin?.lat ?? 32.0853;
    const lng = origin?.lng ?? 34.7818;
    let alive = true;
    getWeekendWeather(lat, lng).then((w) => alive && setWeatherInfo(w));
    return () => {
      alive = false;
    };
  }, [origin]);

  const cityNames = useMemo(
    () => Object.keys(CITY_COORDS).sort((a, b) => a.localeCompare(b, "he")),
    [],
  );

  const filters = useMemo(() => ({ shabbatOnly, age, env }), [shabbatOnly, age, env]);
  const baseList = useMemo(
    () => (savedOnly ? savedPlaces : (results ?? [])),
    [savedOnly, savedPlaces, results],
  );
  // Filters apply to every source (Google, our list, AI, saved).
  const visible = useMemo(() => applyFilters(baseList, filters), [baseList, filters]);
  const hiddenCount = baseList.length - visible.length;
  const activeFilterCount = (shabbatOnly ? 1 : 0) + (age !== "" ? 1 : 0) + (env !== "all" ? 1 : 0);

  // One batched query for community report counts of everything on screen.
  const visibleIdsKey = visible.map((p) => p.id).join("|");
  useEffect(() => {
    if (!visibleIdsKey) return;
    let alive = true;
    fetchReportCounts(visibleIdsKey.split("|"))
      .then((counts) => alive && setReportCounts((prev) => ({ ...prev, ...counts })))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [visibleIdsKey]);

  const placeById = useMemo(() => new Map(baseList.map((p) => [p.id, p])), [baseList]);
  const ranked = !savedOnly && Object.keys(aiReasons).length > 0 && !itinerary;
  const anyLoading = searchLoading || openNowLoading || aiLoading;

  const card = (p: PlaceResult, index: number) => (
    <PlaceCard
      key={p.id}
      place={p}
      distanceKm={origin ? distanceKm(origin, p) : null}
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
      reportCounts={reportCounts[p.id] ?? null}
    />
  );

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="liquid-orb orb-a" aria-hidden="true" />
      <div className="liquid-orb orb-b" aria-hidden="true" />
      <div className="liquid-orb orb-c" aria-hidden="true" />
      <div className="liquid-orb orb-d" aria-hidden="true" />
      <header className="glass-header text-primary-foreground rounded-b-[28px]">
        <div className="relative mx-auto max-w-5xl px-4 py-10">
          <div className="absolute left-4 top-4">
            <ThemeToggle />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            {initialCity
              ? `מה עושים עם הילדים בשבת ב${initialCity}? 🎈`
              : "כיף לילדים – אטרקציות ובילויים בשבת 🎈"}
          </h1>
          <p className="mt-2 text-base opacity-90 md:text-lg">
            מוצאים אטרקציות לילדים – כולל אלה שפתוחות בשבת, ממוזגות או בחוץ, ולפי גיל וקרבה אליכם
          </p>
          {weatherInfo && (
            <div
              className={`mt-4 inline-block rounded-full px-4 py-2 text-sm font-bold ${
                weatherInfo.isHot
                  ? "bg-orange-500/20 text-orange-900 dark:text-orange-100"
                  : weatherInfo.isRainy
                    ? "bg-blue-500/20 text-blue-900 dark:text-blue-100"
                    : "bg-green-500/20 text-green-900 dark:text-green-100"
              }`}
            >
              {weatherInfo.description}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {/* Step 1 — the fastest path: pick a vibe and go. */}
        <ShabbatMode
          originLabel={origin?.label ?? null}
          loading={aiLoading}
          onSearch={(prompt) => {
            setAiPrompt(prompt);
            void runAiSearch(prompt);
          }}
        />

        {/* Step 2 — describe it in your own words. */}
        <section className="glass-panel rounded-2xl p-4">
          <h2 className="text-lg font-bold">✨ ספרו לנו מה אתם מחפשים</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            משפט אחד מספיק – גילאי הילדים, מאיפה יוצאים, כמה זמן נסיעה ותקציב.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !aiLoading) {
                e.preventDefault();
                void runAiSearch();
              }
            }}
            rows={3}
            maxLength={600}
            aria-label="תיאור הפעילות שאתם מחפשים"
            placeholder="לדוגמה: יש לנו שני ילדים בני 4 ו־7, אנחנו מראש העין, רוצים משהו עד 30 דקות נסיעה ובחינם"
            className="glass-field mt-3 w-full rounded-xl px-4 py-3 text-base"
          />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => runAiSearch()}
                disabled={aiLoading}
                className="glass-btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-bold disabled:opacity-70"
              >
                {aiLoading && !itineraryLoading ? (
                  <>
                    <Spinner /> מחפשים בשבילכם...
                  </>
                ) : (
                  "✨ מצא לי פעילות מתאימה"
                )}
              </button>
              <span className="px-1 text-center text-xs text-muted-foreground">
                רשימת מקומות מדורגת עם הסבר
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={runItinerarySearch}
                disabled={aiLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-3 text-base font-bold text-white shadow-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-70"
              >
                {itineraryLoading ? (
                  <>
                    <Spinner /> בונה מסלול...
                  </>
                ) : (
                  "🎲 תבנה לי את השבת"
                )}
              </button>
              <span className="px-1 text-center text-xs text-muted-foreground">
                מסלול בוקר → צהריים → אחה״צ, לפי מזג האוויר
              </span>
            </div>
          </div>
          {(aiPrompt || aiSummary || aiError) && (
            <div className="mt-2 text-center">
              <button
                onClick={() => {
                  setAiPrompt("");
                  resetAi();
                }}
                className="glass-btn inline-flex items-center gap-1 rounded-2xl px-4 py-1.5 text-xs"
              >
                ✕ נקה חיפוש
              </button>
            </div>
          )}
          {aiSummary && (
            <div className="glass-panel mt-3 rounded-2xl p-3 text-sm">🤖 {aiSummary}</div>
          )}
          {aiError && (
            <div role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">
              {aiError}
            </div>
          )}
        </section>

        {/* Step 3 — browse everything around a location. */}
        <section className="glass-panel rounded-2xl p-4">
          <h2 className="text-lg font-bold">📍 או חפשו לבד לפי מיקום</h2>
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
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
                onClick={() => locateMe()}
                className="glass-btn rounded-2xl px-3 py-2 text-sm"
              >
                📍 השתמשו במיקום שלי
              </button>
            )}
            <span className="text-sm text-muted-foreground">או</span>
            <select
              value={nearCity}
              onChange={(e) => pickCity(e.target.value)}
              className="glass-select rounded-2xl px-3 py-2 text-sm"
              aria-label="בחירת עיר קרובה"
            >
              <option value="">בחרו עיר...</option>
              {cityNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void lookupCity();
              }}
            >
              <input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="או הקלידו כל יישוב"
                aria-label="הקלדת שם יישוב"
                maxLength={80}
                className="glass-field w-full min-w-0 rounded-2xl px-3 py-2 text-sm md:w-44"
              />
              <button
                type="submit"
                disabled={cityLookupLoading || !cityInput.trim()}
                className="glass-btn rounded-2xl px-3 py-2 text-sm disabled:opacity-60"
              >
                {cityLookupLoading ? "..." : "קבע"}
              </button>
            </form>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="radius-range" className="whitespace-nowrap text-sm">
              רדיוס: {radius} ק"מ
            </label>
            <input
              id="radius-range"
              type="range"
              min={5}
              max={MAX_RADIUS_KM}
              step={5}
              value={Math.min(radius, MAX_RADIUS_KM)}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-primary"
            />
            {origin && (
              <button onClick={clearNearby} className="glass-btn rounded-2xl px-3 py-1.5 text-sm">
                נקה מיקום
              </button>
            )}
          </div>
          {origin && (
            <div className="mt-1 text-xs text-muted-foreground">
              מחפשים עד {Math.min(radius, MAX_RADIUS_KM)} ק"מ מ־{origin.label}
            </div>
          )}
          {geoStatus && (
            <div
              role="status"
              className={`mt-2 text-sm ${
                /^(מאתר|מחפשים סביב)/.test(geoStatus)
                  ? "text-muted-foreground"
                  : "text-rose-700 dark:text-rose-300"
              }`}
            >
              {geoStatus}
            </div>
          )}

          {recentCitySearches.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">🕘 אחרונים:</span>
              {recentCitySearches.map((item) => (
                <div
                  key={item.cityName}
                  className={`glass-chip inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
                    origin?.label === item.result.label ? "ring-2 ring-primary/60" : ""
                  }`}
                >
                  <button onClick={() => selectRecentCity(item)} className="hover:underline">
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
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && origin && !searchLoading) void runGoogleSearch();
              }}
              placeholder="מה מחפשים? (לא חובה) – למשל: משחקייה, בריכה"
              aria-label="חיפוש לפי שם או סוג מקום"
              maxLength={100}
              className="glass-field w-full min-w-0 rounded-xl px-3 py-2.5 text-sm sm:flex-1"
            />
            <button
              onClick={runGoogleSearch}
              disabled={searchLoading || !origin}
              title={!origin ? "בחרו קודם מיקום" : undefined}
              className="glass-btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-bold shadow-lg shadow-primary/30 transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
            >
              {searchLoading ? (
                <>
                  <Spinner /> מחפש...
                </>
              ) : (
                <>🔎 חפש אטרקציות</>
              )}
            </button>
          </div>
          <label className="glass-chip mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={activityMode}
              onChange={(e) => setActivityMode(e.target.checked)}
              className="accent-emerald-600"
            />
            <span>🎡 אטרקציות בלבד (בלי מסעדות ובתי קפה)</span>
          </label>
          {searchError && (
            <div role="status" className="mt-2 text-sm text-rose-700 dark:text-rose-300">
              {searchError}
            </div>
          )}
        </section>

        {/* Filters — apply live to whatever list is on screen. */}
        <details className="glass-panel group rounded-2xl p-4">
          <summary className="cursor-pointer select-none text-sm font-semibold">
            ⚙️ סינון התוצאות {activeFilterCount > 0 ? `(${activeFilterCount} פעילים)` : ""}
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={shabbatOnly}
                onChange={(e) => setShabbatOnly(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              בלי מקומות שסגורים בשבת
            </label>
            <select
              value={age === "" ? "" : String(age)}
              onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
              className="glass-select rounded-xl px-3 py-2 text-sm"
              aria-label="גיל הילד"
            >
              <option value="">כל הגילאים</option>
              {Array.from({ length: 19 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  גיל {n}
                </option>
              ))}
            </select>
            <select
              value={env}
              onChange={(e) => setEnv(e.target.value as EnvFilter)}
              className="glass-select rounded-xl px-3 py-2 text-sm"
              aria-label="סינון לפי סביבה"
            >
              <option value="all">בפנים או בחוץ</option>
              <option value="ממוזג">❄️ ממוזג / בפנים</option>
              <option value="פתוח">🌳 בחוץ</option>
              <option value="משולב">🔀 משולב</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            מקומות שאין עליהם מידע (למשל שעות שבת לא ידועות) לא מוסתרים – הם מסומנים "לא אומת"
            בכרטיס.
          </p>
        </details>

        {anyLoading && !results ? (
          <div
            className="mt-10 flex flex-col items-center justify-center gap-4 text-muted-foreground"
            role="status"
          >
            <Spinner className="h-10 w-10 text-primary" />
            <span className="text-sm font-medium">מחפשים בשבילכם...</span>
          </div>
        ) : results || savedPlaces.length > 0 ? (
          <section aria-label="תוצאות" aria-busy={anyLoading}>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                {savedOnly
                  ? `❤️ הרשימה שלי: ${visible.length} מקומות`
                  : results
                    ? `🌍 ${visible.length} תוצאות${ranked || itinerary ? "" : " · מהקרוב לרחוק"}`
                    : ""}
              </span>
              <label className="glass-chip inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5">
                <input
                  type="checkbox"
                  checked={savedOnly}
                  onChange={(e) => setSavedOnly(e.target.checked)}
                  className="accent-primary"
                />
                <span>❤️ הצג רק את הרשימה שלי ({savedPlaces.length})</span>
              </label>
              {hiddenCount > 0 && (
                <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5">
                  הוסתרו {hiddenCount} שלא מתאימים לסינון
                  <button
                    className="font-semibold underline"
                    onClick={() => {
                      setShabbatOnly(false);
                      setAge("");
                      setEnv("all");
                    }}
                  >
                    הצג הכל
                  </button>
                </span>
              )}
            </div>

            {!savedOnly && itinerary && (
              <div className="glass-panel mt-3 rounded-3xl p-4">
                <h2 className="text-lg font-bold">🗓️ המסלול שלכם לשבת</h2>
                <ol className="mt-3 space-y-3">
                  {itinerary.map((stop, i) => {
                    const place = placeById.get(stop.placeId);
                    if (!place) return null;
                    const prev = i > 0 ? placeById.get(itinerary[i - 1]!.placeId) : null;
                    const hop = prev
                      ? distanceKm(prev, place)
                      : origin
                        ? distanceKm(origin, place)
                        : null;
                    return (
                      <li key={`${stop.slot}-${stop.placeId}`} className="flex gap-3">
                        <div className="glass-badge-info h-fit shrink-0 text-xs font-bold">
                          {stop.slot}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold">
                            {place.emoji} {place.name}
                          </div>
                          {stop.tip && <div className="text-sm text-foreground/80">{stop.tip}</div>}
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {hop !== null && (
                              <span>
                                🚗 ~{Math.max(2, Math.round((hop / 45) * 60))} דק'{" "}
                                {i === 0 ? "מהבית" : "מהתחנה הקודמת"}
                              </span>
                            )}
                            <a
                              href={`https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="glass-link glass-link-waze"
                            >
                              🧭 וויז
                            </a>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {lunchTip && (
                  <p className="glass-panel mt-3 rounded-2xl p-3 text-sm">🥪 {lunchTip}</p>
                )}
              </div>
            )}

            <div className="mt-3 space-y-4">
              {ranked && visible.length > 0 && (
                <div className="mx-auto max-w-2xl">{card(visible[0]!, 0)}</div>
              )}
              {ranked && visible.length > 1 && (
                <h2 className="pt-2 text-base font-bold">עוד אפשרויות מתאימות</h2>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(ranked ? visible.slice(1) : visible).map((p, i) => card(p, ranked ? i + 1 : i))}
              </div>
            </div>

            {visible.length === 0 && !anyLoading && (
              <div className="glass-empty mt-8 rounded-2xl p-8 text-center text-muted-foreground">
                {savedOnly
                  ? savedPlaces.length === 0
                    ? "עוד לא שמרתם מקומות. לחצו על 🤍 בכרטיס כדי להוסיף לרשימה."
                    : "אף מקום ברשימה שלכם לא מתאים לסינון הנוכחי."
                  : baseList.length > 0
                    ? 'כל התוצאות הוסתרו בגלל הסינון – לחצו "הצג הכל" למעלה.'
                    : "לא נמצאו תוצאות. נסו לשנות את החיפוש או להגדיל את הרדיוס."}
              </div>
            )}
          </section>
        ) : (
          <div className="glass-empty mt-4 rounded-2xl p-10 text-center text-muted-foreground">
            {origin
              ? `בחרו "מצב שבת", כתבו מה אתם מחפשים, או לחצו "חפש אטרקציות" סביב ${origin.label}.`
              : 'בחרו "מצב שבת", כתבו מה אתם מחפשים, או בחרו מיקום ולחצו "חפש אטרקציות".'}
          </div>
        )}

        <div className="pt-4">
          <SuggestAttraction />
        </div>

        <footer className="mt-6 pb-6 text-center text-xs text-muted-foreground">
          <nav aria-label="אטרקציות לפי עיר" className="mb-4">
            <div className="mb-2 font-semibold">אטרקציות לילדים בשבת לפי עיר</div>
            <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1">
              {POPULAR_CITIES.map((city) => (
                <li key={city}>
                  <Link
                    to="/ir/$city"
                    params={{ city: citySlug(city) }}
                    className="hover:underline"
                  >
                    {city}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          המידע הוא לצורך התרשמות בלבד. מומלץ לוודא שעות פתיחה מול האתר הרשמי.
        </footer>
      </main>
    </div>
  );
}
