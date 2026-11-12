/**
 * Parse coordinates pasted by an admin. Accepts:
 *  - "31.77, 35.21"
 *  - Google Maps URLs: ".../@31.77,35.21,15z", "?q=31.77,35.21", "!3d31.77!4d35.21"
 * Pure function (no imports) so it can be unit-tested with `node --test`.
 */
export function parseCoords(text: string): { lat: number; lng: number } | null {
  const t = text.trim();
  // Place-page URLs carry the exact pin as !3d<lat>!4d<lng> — prefer it over
  // the "@lat,lng" map-center, which can be off by a few hundred meters.
  const pin = t.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  const m = pin ?? t.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
