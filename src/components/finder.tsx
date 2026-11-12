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
import { AiPanel } from "@/components/finder/ai-panel";
import { FiltersPanel } from "@/components/finder/filters-panel";
import { ItineraryPanel } from "@/components/finder/itinerary-panel";
import { LocationPanel } from "@/components/finder/location-panel";
import { Spinner } from "@/components/finder/spinner";
import {
  attractionToPlaceResult,
  getPosition,
  readJson,
  saveJson,
  MAX_RADIUS_KM,
  type Origin,
  type RecentCity,
} from "@/lib/finder-utils";
import { fetchReportCounts, type ReportCounts } from "@/components/community-reports";

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
        <AiPanel
          aiPrompt={aiPrompt}
          onPromptChange={setAiPrompt}
          aiLoading={aiLoading}
          itineraryLoading={itineraryLoading}
          aiSummary={aiSummary}
          aiError={aiError}
          onSearch={() => void runAiSearch()}
          onItinerary={() => void runItinerarySearch()}
          onClear={() => {
            setAiPrompt("");
            resetAi();
          }}
        />

        {/* Step 3 — browse everything around a location. */}
        <LocationPanel
          runOpenNowNearby={() => void runOpenNowNearby()}
          openNowLoading={openNowLoading}
          geoBlocked={geoBlocked}
          origin={origin}
          locateMe={() => void locateMe()}
          nearCity={nearCity}
          pickCity={pickCity}
          cityNames={cityNames}
          lookupCity={() => void lookupCity()}
          cityInput={cityInput}
          setCityInput={setCityInput}
          cityLookupLoading={cityLookupLoading}
          radius={radius}
          setRadius={setRadius}
          clearNearby={clearNearby}
          geoStatus={geoStatus}
          recentCitySearches={recentCitySearches}
          selectRecentCity={selectRecentCity}
          removeRecentCity={removeRecentCity}
          query={query}
          setQuery={setQuery}
          searchLoading={searchLoading}
          runGoogleSearch={() => void runGoogleSearch()}
          activityMode={activityMode}
          setActivityMode={setActivityMode}
          searchError={searchError}
        />

        {/* Filters — apply live to whatever list is on screen. */}
        <FiltersPanel
          shabbatOnly={shabbatOnly}
          setShabbatOnly={setShabbatOnly}
          age={age}
          setAge={setAge}
          env={env}
          setEnv={setEnv}
          activeFilterCount={activeFilterCount}
        />

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
              <ItineraryPanel
                itinerary={itinerary}
                placeById={placeById}
                origin={origin}
                lunchTip={lunchTip}
              />
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
