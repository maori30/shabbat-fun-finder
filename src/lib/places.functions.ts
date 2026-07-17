import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const KIDS_TYPES = [
  "amusement_park",
  "amusement_center",
  "aquarium",
  "zoo",
  "tourist_attraction",
  "water_park",
  "park",
  "national_park",
  "shopping_mall",
  "movie_theater",
  "bowling_alley",
  "playground",
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
  .inputValidator((data: { lat: number; lng: number; radius: number; keyword?: string }) => {
    if (typeof data.lat !== "number" || typeof data.lng !== "number") throw new Error("Bad coords");
    return {
      lat: data.lat,
      lng: data.lng,
      radius: Math.min(Math.max(data.radius, 500), 50000),
      keyword: (data.keyword ?? "").slice(0, 100),
    };
  })
  .handler(async ({ data }): Promise<{ places: PlaceResult[]; error?: string }> => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return { places: [], error: "Google Maps not configured" };
    }

    const useText = data.keyword.trim().length > 0;
    const endpoint = useText ? "places/v1/places:searchText" : "places/v1/places:searchNearby";

    const body = useText
      ? {
          textQuery: data.keyword,
          languageCode: "he",
          regionCode: "IL",
          maxResultCount: 20,
          locationBias: {
            circle: {
              center: { latitude: data.lat, longitude: data.lng },
              radius: data.radius,
            },
          },
        }
      : {
          includedTypes: KIDS_TYPES,
          maxResultCount: 20,
          languageCode: "he",
          regionCode: "IL",
          locationRestriction: {
            circle: {
              center: { latitude: data.lat, longitude: data.lng },
              radius: data.radius,
            },
          },
        };

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

    const response = await fetch(`${GATEWAY_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Places gateway failed [${response.status}]: ${text}`);
      return { places: [], error: `שגיאה מ-Google (${response.status})` };
    }

    const json = (await response.json()) as {
      places?: Array<{
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
      }>;
    };

    const places: PlaceResult[] = (json.places ?? []).map((p) => {
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

    return { places };
  });
