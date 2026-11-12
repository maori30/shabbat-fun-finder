/**
 * WhatsApp share text for a whole Shabbat plan. Pure (type-only imports) so
 * it can be unit-tested with `node --test`.
 */
import type { PlaceResult } from "./places.functions";
import type { ItineraryStop } from "./ai-search.functions";

const SLOT_EMOJI: Record<string, string> = { בוקר: "☀️", צהריים: "🌤️", "אחר הצהריים": "🌇" };

export function itineraryShareText(
  stops: ItineraryStop[],
  placeById: Map<string, PlaceResult>,
  lunchTip: string,
  siteUrl: string,
): string {
  const lines = ["🗓️ מה עושים בשבת? הנה התוכנית שלנו:", ""];
  for (const stop of stops) {
    const p = placeById.get(stop.placeId);
    if (!p) continue;
    lines.push(`${SLOT_EMOJI[stop.slot] ?? "📍"} ${stop.slot}: ${p.emoji} ${p.name}`);
    if (stop.tip) lines.push(`   ${stop.tip}`);
    lines.push(`   🧭 https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`);
    lines.push("");
  }
  if (lunchTip) lines.push(`🥪 ${lunchTip}`, "");
  lines.push(`נמצא ב"כיף לילדים" – ${siteUrl}`);
  return lines.join("\n");
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
