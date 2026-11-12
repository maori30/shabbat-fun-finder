import type { PlaceResult } from "@/lib/places.functions";
import type { Attraction } from "@/data/attractions";

export type Origin = { lat: number; lng: number; label: string };
export type RecentCity = { cityName: string; result: Origin };

/** The Places API search radius is capped at 50 km. */
export const MAX_RADIUS_KM = 50;

export function attractionToPlaceResult(a: Attraction): PlaceResult {
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

export function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — keep in memory only */
  }
}

export function readJson<T>(key: string): T | null {
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
export function getPosition(timeoutMs = 8000) {
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
