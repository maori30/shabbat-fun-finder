/**
 * Geo helpers shared by the client and the server functions.
 * Keep this file free of runtime imports so it can be unit-tested with
 * `node --test` directly.
 */

export type LatLng = { lat: number; lng: number };

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Known city centers for "search near city" without geolocation. */
export const CITY_COORDS: Record<string, LatLng> = {
  ירושלים: { lat: 31.7683, lng: 35.2137 },
  "תל אביב": { lat: 32.0853, lng: 34.7818 },
  חיפה: { lat: 32.794, lng: 34.9896 },
  "ראשון לציון": { lat: 31.973, lng: 34.7925 },
  "פתח תקווה": { lat: 32.0878, lng: 34.8878 },
  אשדוד: { lat: 31.8014, lng: 34.6435 },
  נתניה: { lat: 32.3215, lng: 34.8532 },
  "באר שבע": { lat: 31.2518, lng: 34.7913 },
  "בני ברק": { lat: 32.0807, lng: 34.8338 },
  חולון: { lat: 32.0158, lng: 34.7874 },
  "רמת גן": { lat: 32.0684, lng: 34.8248 },
  אשקלון: { lat: 31.6688, lng: 34.5715 },
  רחובות: { lat: 31.8947, lng: 34.8094 },
  "בת ים": { lat: 32.0231, lng: 34.7503 },
  "בית שמש": { lat: 31.7477, lng: 34.986 },
  "כפר סבא": { lat: 32.175, lng: 34.907 },
  הרצליה: { lat: 32.1663, lng: 34.8438 },
  חדרה: { lat: 32.4341, lng: 34.9196 },
  "מודיעין-מכבים-רעות": { lat: 31.8969, lng: 35.0104 },
  נצרת: { lat: 32.7021, lng: 35.2978 },
  רעננה: { lat: 32.1847, lng: 34.8708 },
  רמלה: { lat: 31.9293, lng: 34.8666 },
  "רמת השרון": { lat: 32.1462, lng: 34.8404 },
  "נוף הגליל": { lat: 32.7018, lng: 35.3211 },
  "הוד השרון": { lat: 32.15, lng: 34.8886 },
  גבעתיים: { lat: 32.0719, lng: 34.8103 },
  "קריית אתא": { lat: 32.8098, lng: 35.1104 },
  נהריה: { lat: 33.01, lng: 35.098 },
  "אור יהודה": { lat: 32.0294, lng: 34.8536 },
  עפולה: { lat: 32.6078, lng: 35.2897 },
  רהט: { lat: 31.39, lng: 34.7642 },
  "קריית גת": { lat: 31.61, lng: 34.7642 },
  אילת: { lat: 29.5581, lng: 34.9482 },
  עכו: { lat: 32.9281, lng: 35.082 },
  "קריית מוצקין": { lat: 32.8367, lng: 35.0803 },
  "מעלה אדומים": { lat: 31.7714, lng: 35.2969 },
  אריאל: { lat: 32.1044, lng: 35.1731 },
  טבריה: { lat: 32.7922, lng: 35.5312 },
  כרמיאל: { lat: 32.9186, lng: 35.2952 },
  יבנה: { lat: 31.8781, lng: 34.7392 },
  "טירת כרמל": { lat: 32.7614, lng: 34.9722 },
  שפרעם: { lat: 32.8058, lng: 35.1697 },
  "נס ציונה": { lat: 31.9294, lng: 34.7994 },
  דימונה: { lat: 31.0688, lng: 35.0327 },
  סחנין: { lat: 32.8642, lng: 35.2989 },
  "יהוד-מונוסון": { lat: 32.0342, lng: 34.8828 },
  "קריית ים": { lat: 32.8492, lng: 35.0692 },
  "קריית מלאכי": { lat: 31.7297, lng: 34.7469 },
  "מגדל העמק": { lat: 32.6767, lng: 35.2419 },
  "אום אל-פחם": { lat: 32.5192, lng: 35.1544 },
  "קריית ביאליק": { lat: 32.8378, lng: 35.0864 },
  צפת: { lat: 32.9646, lng: 35.496 },
  נתיבות: { lat: 31.4231, lng: 34.5928 },
  אופקים: { lat: 31.3153, lng: 34.6208 },
  טירה: { lat: 32.2333, lng: 34.95 },
  "רמת ישי": { lat: 32.7, lng: 35.1917 },
  "בית שאן": { lat: 32.497, lng: 35.4967 },
  "כפר יונה": { lat: 32.3167, lng: 34.9333 },
  "מזכרת בתיה": { lat: 31.8347, lng: 34.8558 },
  עראבה: { lat: 32.8517, lng: 35.3383 },
  טמרה: { lat: 32.8497, lng: 35.1972 },
  "אבן יהודה": { lat: 32.2667, lng: 34.8833 },
  "גני תקווה": { lat: 32.0667, lng: 34.85 },
  "כפר קאסם": { lat: 32.1136, lng: 34.9761 },
  שוהם: { lat: 31.9994, lng: 34.9481 },
  אלעד: { lat: 32.05, lng: 34.95 },
  "בית דגן": { lat: 32.0044, lng: 34.8256 },
  "מבשרת ציון": { lat: 31.7975, lng: 35.15 },
  גדרה: { lat: 31.8125, lng: 34.7778 },
  "פרדס חנה-כרכור": { lat: 32.4739, lng: 34.9711 },
  נשר: { lat: 32.7708, lng: 35.0439 },
  "קריית אונו": { lat: 32.0625, lng: 34.8578 },
  "זכרון יעקב": { lat: 32.5719, lng: 34.95 },
  "בנימינה-גבעת עדה": { lat: 32.5169, lng: 34.95 },
  "ראש העין": { lat: 32.0956, lng: 34.9581 },
  "גבעת שמואל": { lat: 32.0778, lng: 34.85 },
  "מודיעין עילית": { lat: 31.9328, lng: 35.0417 },
  "ביתר עילית": { lat: 31.6989, lng: 35.1075 },
  קצרין: { lat: 32.9878, lng: 35.6889 },
  "מעלות-תרשיחא": { lat: 33.0197, lng: 35.2739 },
  ירוחם: { lat: 30.9903, lng: 34.9269 },
  שדרות: { lat: 31.5236, lng: 34.5967 },
  "קריית שמונה": { lat: 33.2075, lng: 35.5698 },
  מגדל: { lat: 32.8781, lng: 35.5019 },
  "אור עקיבא": { lat: 32.5083, lng: 34.9167 },
  פרדסיה: { lat: 32.2547, lng: 34.9364 },
  "כוכב יאיר": { lat: 32.1889, lng: 34.9633 },
  אזור: { lat: 32.0225, lng: 34.8 },
  "קדימה-צורן": { lat: 32.2725, lng: 34.9142 },
  "תל מונד": { lat: 32.25, lng: 34.9167 },
  לוד: { lat: 31.9516, lng: 34.8886 },
};

/** Old / alternate spellings that should resolve to a city in CITY_COORDS. */
export const CITY_ALIASES: Record<string, string> = {
  "קרית גת": "קריית גת",
  מודיעין: "מודיעין-מכבים-רעות",
  "נצרת עילית": "נוף הגליל",
};

export function resolveCityName(name: string): string | null {
  const trimmed = name.trim();
  if (CITY_COORDS[trimmed]) return trimmed;
  const alias = CITY_ALIASES[trimmed];
  return alias && CITY_COORDS[alias] ? alias : null;
}

/** URL slug for a city page: spaces → dashes, Hebrew kept as-is. */
export function citySlug(city: string): string {
  return city.trim().replace(/\s+/g, "_");
}

export function cityFromSlug(slug: string): string | null {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    /* keep raw slug */
  }
  return resolveCityName(decoded.replace(/_/g, " "));
}
