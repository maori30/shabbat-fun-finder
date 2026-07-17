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
  openNow: boolean | null;
  openShabbat: boolean | null;
};

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
      "places.primaryTypeDisplayName",
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
        primaryTypeDisplayName?: { text?: string };
        currentOpeningHours?: { openNow?: boolean };
        regularOpeningHours?: { weekdayDescriptions?: string[] };
      }>;
    };

    const places: PlaceResult[] = (json.places ?? []).map((p) => {
      // Saturday is index 5 in weekdayDescriptions (Google returns Mon-Sun in he locale)
      const weekly = p.regularOpeningHours?.weekdayDescriptions ?? [];
      const satLine = weekly.find((d) => d.startsWith("שבת"));
      let openShabbat: boolean | null = null;
      if (satLine) openShabbat = !/סגור/.test(satLine);

      return {
        id: p.id,
        name: p.displayName?.text ?? "ללא שם",
        address: p.formattedAddress ?? "",
        lat: p.location?.latitude ?? 0,
        lng: p.location?.longitude ?? 0,
        rating: p.rating ?? null,
        userRatingCount: p.userRatingCount ?? null,
        mapsUri: p.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`,
        websiteUri: p.websiteUri ?? null,
        primaryType: p.primaryTypeDisplayName?.text ?? null,
        openNow: p.currentOpeningHours?.openNow ?? null,
        openShabbat,
      };
    });

    return { places };
  });
