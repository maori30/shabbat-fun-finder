import type { PlaceResult } from "@/lib/places.functions";
import type { ItineraryStop } from "@/lib/ai-search.functions";
import { distanceKm } from "@/lib/geo";
import type { Origin } from "@/lib/finder-utils";
import { itineraryShareText, wazeUrl, whatsappUrl } from "@/lib/share";
import { SITE_URL } from "@/lib/site";

/** The morning → noon → afternoon plan from "תבנה לי את השבת". */
export function ItineraryPanel({
  itinerary,
  placeById,
  origin,
  lunchTip,
}: {
  itinerary: ItineraryStop[];
  placeById: Map<string, PlaceResult>;
  origin: Origin | null;
  lunchTip: string;
}) {
  return (
    <div className="glass-panel mt-3 rounded-3xl p-4">
      <h2 className="text-lg font-bold">🗓️ המסלול שלכם לשבת</h2>
      <ol className="mt-3 space-y-3">
        {itinerary.map((stop, i) => {
          const place = placeById.get(stop.placeId);
          if (!place) return null;
          const prev = i > 0 ? placeById.get(itinerary[i - 1]!.placeId) : null;
          const hop = prev ? distanceKm(prev, place) : origin ? distanceKm(origin, place) : null;
          return (
            <li key={`${stop.slot}-${stop.placeId}`} className="flex gap-3">
              <div className="glass-badge-info h-fit shrink-0 text-xs font-bold">{stop.slot}</div>
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
                    href={wazeUrl(place)}
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
      {lunchTip && <p className="glass-panel mt-3 rounded-2xl p-3 text-sm">🥪 {lunchTip}</p>}
      <a
        href={whatsappUrl(itineraryShareText(itinerary, placeById, lunchTip, SITE_URL))}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white"
        style={{ backgroundColor: "#25D366" }}
      >
        💬 שלחו את כל התוכנית בוואטסאפ
      </a>
    </div>
  );
}
