import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

// Places API searchNearby limits combos across category tables, so we
// run several small nearby searches in parallel and merge the results.
const TYPE_GROUPS: string[][] = [
  ["amusement_park", "amusement_center", "water_park", "adventure_sports_center"],
  ["zoo", "aquarium", "wildlife_park", "wildlife_refuge", "botanical_garden"],
  ["tourist_attraction", "cultural_landmark", "historical_place", "observation_deck"],
  ["park", "national_park", "state_park", "playground", "dog_park"],
  ["museum", "art_gallery", "planetarium", "cultural_center", "performing_arts_theater"],
  ["shopping_mall", "movie_theater", "bowling_alley", "video_arcade", "roller_coaster"],
  ["cafe", "coffee_shop", "ice_cream_shop", "bakery", "dessert_shop"],
  ["restaurant", "hamburger_restaurant", "pizza_restaurant", "family_restaurant"],
  ["swimming_pool", "sports_complex", "athletic_field", "skateboard_park", "ice_skating_rink"],
  ["library", "community_center", "event_venue", "banquet_hall"],
];

// Focused type groups for "activity mode" — attractions/parks/pools/workshops,
// no cafes/restaurants/malls/generic venues.
const ACTIVITY_TYPE_GROUPS: string[][] = [
  ["amusement_park", "amusement_center", "water_park", "adventure_sports_center", "roller_coaster"],
  ["zoo", "aquarium", "wildlife_park", "wildlife_refuge", "botanical_garden"],
  ["museum", "planetarium", "art_gallery", "cultural_center"],
  ["park", "national_park", "state_park", "playground"],
  ["tourist_attraction", "observation_deck"],
  ["swimming_pool", "ice_skating_rink", "skateboard_park", "sports_complex"],
  ["bowling_alley", "video_arcade", "movie_theater"],
];

// Free-text queries in Hebrew + English to catch places Google mis-categorizes.
const TEXT_QUERIES = [
  "משחקייה לילדים",
  "פעלטון",
  "חדר בריחה משפחות",
  "קפה עם פינת ילדים",
  "פעילות לילדים",
  "אטרקציות לילדים",
  "מקומות בילוי לילדים",
  "מתאים לילדים",
  "בילוי משפחות",
  "פארק שעשועים לילדים",
  "גני שעשועים",
  "מרכז משחקים",
  "חדר משחקים",
  "סדנאות לילדים",
  "בריכת שחייה משפחתית",
  "מוזיאון אינטראקטיבי",
  "Playground",
  "kids activities",
  "family friendly attractions",
  "soft play",
  "jump park",
  "trampoline park",
  "indoor playground",
];

// Tighter subset when "activity mode" is on — focus on attractions, not cafes.
const ACTIVITY_TEXT_QUERIES = [
  "משחקייה לילדים",
  "פעלטון",
  "פארק שעשועים לילדים",
  "גני שעשועים",
  "מרכז משחקים",
  "חדר משחקים",
  "סדנאות לילדים",
  "בריכת שחייה משפחתית",
  "מוזיאון אינטראקטיבי",
  "אטרקציות לילדים",
  "פעילות לילדים",
  "soft play",
  "jump park",
  "trampoline park",
  "indoor playground",
  "kids workshop",
];

export type PlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  mapsUri: string;
  websiteUri: string | null;
  primaryType: string | null;
  primaryTypeId: string | null;
  types: string[];
  openNow: boolean | null;
  openShabbat: boolean | null;
  environment: "ממוזג" | "פתוח" | "משולב" | null;
  ageRange: { min: number; max: number } | null;
};

const INDOOR_TYPES = new Set([
  "shopping_mall", "movie_theater", "aquarium", "museum", "bowling_alley",
  "amusement_center", "art_gallery", "library", "restaurant", "cafe",
]);
const OUTDOOR_TYPES = new Set([
  "park", "national_park", "playground", "zoo", "amusement_park",
  "tourist_attraction", "campground", "beach",
]);
const MIXED_TYPES = new Set(["water_park"]);

function inferEnvironment(types: string[], name: string): PlaceResult["environment"] {
  for (const t of types) {
    if (INDOOR_TYPES.has(t)) return "ממוזג";
    if (MIXED_TYPES.has(t)) return "משולב";
    if (OUTDOOR_TYPES.has(t)) return "פתוח";
  }
  if (/משחקייה|פעלטון|קניון|קולנוע|באולינג/.test(name)) return "ממוזג";
  if (/פארק|גן|חוף|טיילת/.test(name)) return "פתוח";
  return null;
}

function inferAgeRange(types: string[], name: string): PlaceResult["ageRange"] {
  if (/משחקייה|פעלטון|ג'ימבורי|קידילנד/.test(name)) return { min: 1, max: 10 };
  if (types.includes("playground")) return { min: 1, max: 10 };
  if (types.includes("water_park")) return { min: 3, max: 16 };
  if (types.includes("amusement_park")) return { min: 3, max: 16 };
  if (types.includes("zoo") || types.includes("aquarium")) return { min: 2, max: 14 };
  if (types.includes("movie_theater")) return { min: 4, max: 16 };
  if (types.includes("bowling_alley")) return { min: 6, max: 16 };
  if (types.includes("museum")) return { min: 4, max: 16 };
  if (types.includes("tourist_attraction") || types.includes("park")) return { min: 0, max: 16 };
  if (types.includes("shopping_mall")) return { min: 0, max: 16 };
  return null;
}

export const searchPlaces = createServerFn({ method: "POST" })
  .inputValidator((data: { lat: number; lng: number; radius: number; keyword?: string; activityMode?: boolean }) => {
    if (typeof data.lat !== "number" || typeof data.lng !== "number") throw new Error("Bad coords");
    return {
      lat: data.lat,
      lng: data.lng,
      radius: Math.min(Math.max(data.radius, 500), 50000),
      keyword: (data.keyword ?? "").slice(0, 100),
      activityMode: !!data.activityMode,
    };
  })
  .handler(async ({ data }): Promise<{ places: PlaceResult[]; error?: string }> => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return { places: [], error: "Google Maps not configured" };
    }

    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.location",
      "places.rating",
      "places.userRatingCount",
      "places.googleMapsUri",
      "places.websiteUri",
      "places.primaryType",
      "places.primaryTypeDisplayName",
      "places.types",
      "places.currentOpeningHours.openNow",
      "places.regularOpeningHours.weekdayDescriptions",
    ].join(",");

    const circle = {
      center: { latitude: data.lat, longitude: data.lng },
      radius: data.radius,
    };

    type RawPlace = {
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
      rating?: number;
      userRatingCount?: number;
      googleMapsUri?: string;
      websiteUri?: string;
      primaryType?: string;
      primaryTypeDisplayName?: { text?: string };
      types?: string[];
      currentOpeningHours?: { openNow?: boolean };
      regularOpeningHours?: { weekdayDescriptions?: string[] };
    };

    async function callGoogle(endpoint: string, body: unknown): Promise<RawPlace[]> {
      const res = await fetch(`${GATEWAY_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY!,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error(`Places gateway failed [${res.status}]: ${await res.text()}`);
        return [];
      }
      const json = (await res.json()) as { places?: RawPlace[] };
      return json.places ?? [];
    }

    const useText = data.keyword.trim().length > 0;

    let batches: Promise<RawPlace[]>[];
    if (useText) {
      batches = [
        callGoogle("places/v1/places:searchText", {
          textQuery: data.keyword,
          languageCode: "he",
          regionCode: "IL",
          maxResultCount: 20,
          locationBias: { circle },
        }),
      ];
    } else {
      const typeGroups = data.activityMode ? ACTIVITY_TYPE_GROUPS : TYPE_GROUPS;
      const textQueries = data.activityMode ? ACTIVITY_TEXT_QUERIES : TEXT_QUERIES;
      batches = [
        ...typeGroups.map((includedTypes) =>
          callGoogle("places/v1/places:searchNearby", {
            includedTypes,
            maxResultCount: 20,
            languageCode: "he",
            regionCode: "IL",
            locationRestriction: { circle },
          })
        ),
        ...textQueries.map((textQuery) =>
          callGoogle("places/v1/places:searchText", {
            textQuery,
            languageCode: "he",
            regionCode: "IL",
            maxResultCount: 10,
            locationBias: { circle },
          })
        ),
      ];
    }

    const results = await Promise.all(batches);
    const seen = new Set<string>();
    const merged: RawPlace[] = [];
    for (const arr of results) {
      for (const p of arr) {
        if (p.id && !seen.has(p.id)) {
          seen.add(p.id);
          merged.push(p);
        }
      }
    }

    const places: PlaceResult[] = merged.map((p) => {
      const weekly = p.regularOpeningHours?.weekdayDescriptions ?? [];
      const satLine = weekly.find((d) => d.startsWith("שבת"));
      let openShabbat: boolean | null = null;
      if (satLine) openShabbat = !/סגור/.test(satLine);

      const name = p.displayName?.text ?? "ללא שם";
      const types = p.types ?? (p.primaryType ? [p.primaryType] : []);

      return {
        id: p.id,
        name,
        address: p.formattedAddress ?? "",
        lat: p.location?.latitude ?? 0,
        lng: p.location?.longitude ?? 0,
        rating: p.rating ?? null,
        userRatingCount: p.userRatingCount ?? null,
        mapsUri: p.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`,
        websiteUri: p.websiteUri ?? null,
        primaryType: p.primaryTypeDisplayName?.text ?? null,
        primaryTypeId: p.primaryType ?? null,
        types,
        openNow: p.currentOpeningHours?.openNow ?? null,
        openShabbat,
        environment: inferEnvironment(types, name),
        ageRange: inferAgeRange(types, name),
      };
    });

    // Sort by rating*log(count) so the strong family spots float up.
    places.sort((a, b) => {
      const sa = (a.rating ?? 0) * Math.log10((a.userRatingCount ?? 0) + 10);
      const sb = (b.rating ?? 0) * Math.log10((b.userRatingCount ?? 0) + 10);
      return sb - sa;
    });

    return { places: places.slice(0, 60) };
  });
