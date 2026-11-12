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
import { FiltersPanel } from "@/components/finder/filters-panel";
import { ItineraryPanel } from "@/components/finder/itinerary-panel";
import { ManualSearchPanel } from "@/components/finder/manual-search-panel";
import { PlanPanel } from "@/components/finder/plan-panel";
import { buildHints, buildPrompt, DEFAULT_PLAN } from "@/lib/prompt";
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
  const [vibe, setVibe] = useState(DEFAULT_PLAN.vibe);
  const [ages, setAges] = useState(DEFAULT_PLAN.ages);
  const [drive, setDrive] = useState(DEFAULT_PLAN.drive);
  const [budget, setBudget] = useState(DEFAULT_PLAN.budget);
  const [freeText, setFreeText] = useState(DEFAULT_PLAN.freeText);
  const [locationMissing, setLocationMissing] = useState(false);
  /** Bumped when a search starts so the page scrolls to the results area. */
  const [searchStartedAt, setSearchStartedAt] = useState(0);
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

  /** Ask the user for an origin unless the free text may contain one. */
  const needOrigin = () => {
    if (origin || freeText.trim()) return false;
    setLocationMissing(true);
    setAiError("בחרו קודם מאיפה יוצאים 👆");
    document.getElementById("plan")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  };

  const runAiSearch = async (promptOverride?: string) => {
    resetAi();
    if (!promptOverride && needOrigin()) return;
    const prompt =
      promptOverride ??
      buildPrompt({ vibe, ages, drive, budget, freeText, originLabel: origin?.label ?? null });
    setAiLoading(true);
    setSavedOnly(false);
    setSearchError("");
    setSearchStartedAt(Date.now());
    try {
      const res = await aiSearchFn({
        data: {
          prompt,
          fallbackOrigin: origin,
          // Deep links (?q=) carry only text; card searches send every choice.
          hints: promptOverride ? null : buildHints({ vibe, ages, drive, budget }),
        },
      });
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
    resetAi();
    if (needOrigin()) return;
    setAiLoading(true);
    setItineraryLoading(true);
    setSavedOnly(false);
    setSearchError("");
    setSearchStartedAt(Date.now());
    try {
      const prompt = buildPrompt(
        { vibe, ages, drive, budget, freeText, originLabel: origin?.label ?? null },
        "itinerary",
      );
      const res = await aiSearchFn({
        data: {
          prompt,
          fallbackOrigin: origin,
          mode: "itinerary",
          weather: weatherInfo?.description ?? null,
          hints: buildHints({ vibe, ages, drive, budget }),
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
    setSearchStartedAt(Date.now());
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
    setSearchStartedAt(Date.now());
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
      setFreeText(q.slice(0, 400));
      void runAiSearch(q.slice(0, 600));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (origin) {
      setLocationMissing(false);
      setAiError((e) => (e.startsWith("בחרו קודם מאיפה") ? "" : e));
    }
  }, [origin]);

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

  // Scroll to the results area when a search starts, so people see progress
  // and then the results without hunting for them.
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!searchStartedAt) return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchStartedAt]);

  // Floating "to results" pill while results exist below the viewport.
  const [resultsBelow, setResultsBelow] = useState(false);
  useEffect(() => {
    const el = resultsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setResultsBelow(!entry!.isIntersecting && entry!.boundingClientRect.top > 0),
      { rootMargin: "0px 0px -15% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const showJump = resultsBelow && !anyLoading && !savedOnly && (results?.length ?? 0) > 0;

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
        <div className="relative mx-auto max-w-5xl px-4 pb-6 pt-8 sm:py-10">
          <div className="absolute left-4 top-4">
            <ThemeToggle />
          </div>
          <h1 className="pl-12 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-5xl">
            {initialCity
              ? `מה עושים עם הילדים בשבת ב${initialCity}? 🎈`
              : "כיף לילדים – אטרקציות ובילויים בשבת 🎈"}
          </h1>
          <p className="mt-2 text-base opacity-90 md:text-lg">
            מקומות לילדים שפתוחים בשבת – לפי גיל, מזג אוויר ומרחק מכם
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
        {/* The one main card: where from + what you feel like → go. */}
        <PlanPanel
          origin={origin}
          nearCity={nearCity}
          cityNames={cityNames}
          pickCity={pickCity}
          locateMe={() => void locateMe()}
          geoBlocked={geoBlocked}
          geoStatus={geoStatus}
          cityInput={cityInput}
          setCityInput={setCityInput}
          lookupCity={() => void lookupCity()}
          cityLookupLoading={cityLookupLoading}
          recentCitySearches={recentCitySearches}
          selectRecentCity={selectRecentCity}
          removeRecentCity={removeRecentCity}
          vibe={vibe}
          setVibe={setVibe}
          ages={ages}
          setAges={setAges}
          drive={drive}
          setDrive={setDrive}
          budget={budget}
          setBudget={setBudget}
          freeText={freeText}
          setFreeText={setFreeText}
          onFind={() => void runAiSearch()}
          onBuild={() => void runItinerarySearch()}
          onOpenNow={() => void runOpenNowNearby()}
          aiLoading={aiLoading}
          itineraryLoading={itineraryLoading}
          openNowLoading={openNowLoading}
          error={aiError}
          locationMissing={locationMissing}
        />

        {/* Results anchor — the page scrolls here when a search starts. */}
        <div ref={resultsRef} id="results" className="scroll-mt-4" />

        {anyLoading && (
          <div
            className="glass-panel flex items-center justify-center gap-3 rounded-2xl p-6 text-muted-foreground"
            role="status"
          >
            <Spinner className="h-7 w-7 text-primary" />
            <span className="text-sm font-medium">
              {itineraryLoading
                ? "בונים לכם מסלול לשבת... זה לוקח כמה שניות"
                : "מחפשים בשבילכם... זה לוקח כמה שניות"}
            </span>
          </div>
        )}

        {!anyLoading && (results || savedOnly) ? (
          <section aria-label="תוצאות" className="space-y-3">
            {/* Results header: what we found + what to do next */}
            <div className="glass-panel rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-lg font-extrabold">
                  {savedOnly
                    ? `❤️ הרשימה שלי (${visible.length})`
                    : itinerary
                      ? "🗓️ המסלול שלכם לשבת מוכן!"
                      : visible.length > 0
                        ? `✅ מצאנו ${visible.length} מקומות${origin ? ` ליד ${origin.label}` : ""}`
                        : "לא מצאנו מקומות מתאימים"}
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("plan")?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="glass-btn rounded-full px-3 py-1.5 text-xs font-semibold"
                >
                  🔄 חיפוש חדש
                </button>
              </div>
              {!savedOnly && aiSummary && <p className="mt-2 text-sm">🤖 {aiSummary}</p>}
              {!savedOnly && (aiError || searchError) && (
                <p role="status" className="mt-2 text-sm text-rose-700 dark:text-rose-300">
                  {aiError || searchError}
                </p>
              )}
              {!savedOnly && visible.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {itinerary
                    ? "👇 למטה: התחנות במסלול, ואחריהן עוד חלופות – בכל כרטיס יש שעות, ניווט בוויז ושיתוף בוואטסאפ."
                    : ranked
                      ? "👇 הכרטיס הראשון הוא ההמלצה שלנו. גללו למטה לעוד אפשרויות – בכל כרטיס יש שעות, ניווט ושיתוף."
                      : "👇 מסודר מהקרוב לרחוק. לחצו 🤍 כדי לשמור מקום לרשימה שלכם."}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <label className="glass-chip inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5">
                  <input
                    type="checkbox"
                    checked={savedOnly}
                    onChange={(e) => setSavedOnly(e.target.checked)}
                    className="accent-primary"
                  />
                  <span>❤️ רק הרשימה שלי ({savedPlaces.length})</span>
                </label>
                {hiddenCount > 0 && (
                  <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5">
                    הוסתרו {hiddenCount} לפי הסינון
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
            </div>

            <FiltersPanel
              shabbatOnly={shabbatOnly}
              setShabbatOnly={setShabbatOnly}
              age={age}
              setAge={setAge}
              env={env}
              setEnv={setEnv}
              activeFilterCount={activeFilterCount}
            />

            {!savedOnly && itinerary && (
              <ItineraryPanel
                itinerary={itinerary}
                placeById={placeById}
                origin={origin}
                lunchTip={lunchTip}
              />
            )}

            <div className="space-y-4">
              {ranked && visible.length > 0 && (
                <div className="mx-auto max-w-2xl">{card(visible[0]!, 0)}</div>
              )}
              {ranked && visible.length > 1 && (
                <h2 className="pt-2 text-base font-bold">עוד אפשרויות מתאימות</h2>
              )}
              {itinerary && visible.length > 0 && (
                <h2 className="pt-2 text-base font-bold">המקומות במסלול ועוד חלופות</h2>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(ranked ? visible.slice(1) : visible).map((p, i) => card(p, ranked ? i + 1 : i))}
              </div>
            </div>

            {visible.length === 0 && (
              <div className="glass-empty rounded-2xl p-8 text-center text-muted-foreground">
                {savedOnly
                  ? savedPlaces.length === 0
                    ? "עוד לא שמרתם מקומות. לחצו על 🤍 בכרטיס כדי להוסיף לרשימה."
                    : "אף מקום ברשימה שלכם לא מתאים לסינון הנוכחי."
                  : baseList.length > 0
                    ? 'כל התוצאות הוסתרו בגלל הסינון – לחצו "הצג הכל" למעלה.'
                    : "נסו כיוון אחר, זמן נסיעה ארוך יותר, או את החיפוש הידני למטה."}
              </div>
            )}
          </section>
        ) : null}

        {!anyLoading && !results && !savedOnly && savedPlaces.length > 0 && (
          <button
            type="button"
            onClick={() => setSavedOnly(true)}
            className="glass-btn w-full rounded-2xl px-4 py-3 text-sm font-semibold"
          >
            ❤️ הרשימה השמורה שלי ({savedPlaces.length})
          </button>
        )}

        <ManualSearchPanel
          origin={origin}
          query={query}
          setQuery={setQuery}
          radius={radius}
          setRadius={setRadius}
          activityMode={activityMode}
          setActivityMode={setActivityMode}
          searchLoading={searchLoading}
          runGoogleSearch={() => void runGoogleSearch()}
        />

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

      {showJump && (
        <button
          type="button"
          onClick={() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="glass-btn-primary fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full px-5 py-3 text-sm font-bold shadow-xl"
        >
          ⬇️ לתוצאות ({visible.length})
        </button>
      )}
    </div>
  );
}
