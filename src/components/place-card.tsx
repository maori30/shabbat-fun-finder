import type { PlaceResult } from "@/lib/places.functions";
import { CommunityReports } from "@/components/community-reports";

/**
 * A single place, presented as a *decision* rather than a row in a list.
 * The top pick gets a highlighted "🥇 הבחירה הכי מתאימה לך" treatment with
 * ✓ checks, an explicit "למה בחרנו בזה" line and a trust/verification block.
 */

export type PlaceCardData = {
  place: PlaceResult;
  distanceKm: number | null;
  rank: number | null;
  reason?: string;
  checks?: string[];
  priceEstimate?: string;
};

function driveMinutes(km: number) {
  // City driving averages ~45 km/h door to door.
  return Math.max(2, Math.round((km / 45) * 60));
}

export function PlaceCard({
  place: p,
  distanceKm: dist,
  rank,
  reason,
  checks,
  priceEstimate,
  saved,
  onToggleSave,
  updatedAt,
  saturdayOpen,
  onToggleSaturday,
}: PlaceCardData & {
  saved: boolean;
  onToggleSave: () => void;
  updatedAt: number | null;
  saturdayOpen: boolean;
  onToggleSaturday: () => void;
}) {
  const isTop = rank === 1;
  const shabbatKnown = p.openShabbat !== null || Boolean(p.saturdayHours);
  const shabbatOpen = Boolean(p.openShabbat || p.saturdayHours);
  const isLocal = p.id.startsWith("local-");

  const autoChecks: string[] = [];
  if (p.ageRange) autoChecks.push(`מתאים לגילאי ${p.ageRange.min}–${p.ageRange.max}`);
  if (shabbatOpen) autoChecks.push("פתוח בשבת");
  if (p.environment === "ממוזג") autoChecks.push("ממוזג");
  else if (p.environment === "פתוח") autoChecks.push("פעילות בחוץ");
  if (dist !== null) autoChecks.push(`${driveMinutes(dist)} דקות נסיעה`);
  const shownChecks = (checks && checks.length > 0 ? checks : autoChecks).slice(0, 5);

  return (
    <article
      className={`glass-card relative overflow-hidden rounded-3xl p-4 transition-shadow ${
        isTop ? "ring-2 ring-primary/70 shadow-xl shadow-primary/20 sm:p-5" : ""
      }`}
    >
      {isTop && (
        <div className="glass-badge-success mb-3 inline-flex text-sm font-extrabold">
          🥇 הבחירה הכי מתאימה לך
        </div>
      )}
      {!isTop && rank !== null && (
        <div className="glass-badge-neutral mb-2 inline-flex text-[11px]">חלופה {rank - 1}</div>
      )}

      {p.photoUri ? (
        <img
          src={p.photoUri}
          alt={p.name}
          loading="lazy"
          className={`-mx-4 mb-3 w-[calc(100%+2rem)] object-cover ${isTop ? "h-52" : "h-40"}`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-3xl">{p.emoji}</div>
          <h3 className={`mt-1 font-bold ${isTop ? "text-2xl" : "text-lg"}`}>{p.name}</h3>
          <div className="text-sm text-muted-foreground">
            {p.primaryType ?? "מקום"} {p.rating ? `· ⭐ ${p.rating} (${p.userRatingCount ?? 0})` : ""}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            aria-label={saved ? "הסרה מהרשימה שלי" : "שמירה לרשימה שלי"}
            className="glass-btn rounded-full px-2.5 py-1.5 text-lg leading-none transition-transform hover:scale-110 active:scale-95"
          >
            {saved ? "❤️" : "🤍"}
          </button>
          {shabbatKnown ? (
            <button
              type="button"
              onClick={() => p.saturdayHours && onToggleSaturday()}
              aria-expanded={saturdayOpen}
              className={`shrink-0 ${shabbatOpen ? "glass-badge-success" : "glass-badge-danger"} ${
                p.saturdayHours ? "cursor-pointer hover:opacity-80" : "cursor-default"
              }`}
              title={p.saturdayHours ? "לחצו להצגת שעות בשבת" : "שעות מדויקות אינן זמינות"}
            >
              📅 {shabbatOpen ? "פתוח בשבת" : "סגור בשבת"}
            </button>
          ) : (
            <span className="glass-badge-warning" title="לא הצלחנו לאמת את שעות השבת">
              📅 שבת – לא אומת
            </span>
          )}
        </div>
      </div>

      {saturdayOpen && p.saturdayHours && (
        <div className="mt-2 text-xs text-muted-foreground">
          שעות בשבת: <span className="font-semibold text-foreground">🕐 {p.saturdayHours}</span>
        </div>
      )}

      {shownChecks.length > 0 && (
        <ul className={`mt-3 grid gap-1 ${isTop ? "sm:grid-cols-2" : ""} text-sm`}>
          {shownChecks.map((c) => (
            <li key={c} className="flex items-start gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}

      {(priceEstimate || p.price) && (
        <div className="mt-2 text-sm font-semibold">💰 {priceEstimate ?? p.price}</div>
      )}

      {reason && (
        <p className="glass-panel mt-3 rounded-2xl p-3 text-sm">
          <span className="font-bold">למה בחרנו בזה: </span>
          {reason.replace(/^למה בחרנו בזה:?\s*/u, "")}
        </p>
      )}

      {p.description && <p className="mt-2 text-sm text-foreground/80">{p.description}</p>}

      {p.address && (
        <p className="mt-2 text-sm text-muted-foreground">
          📍{" "}
          {p.address
            .replace(/,?\s*ישראל\s*$/u, "")
            .replace(/,?\s*\d{5,8}\s*(?=,|$)/gu, "")
            .replace(/,\s*,/g, ",")
            .trim()}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {p.openNow !== null ? (
          <span className={p.openNow ? "glass-badge-success" : "glass-badge-danger"}>
            {p.openNow ? "🟢 פתוח עכשיו" : "🔴 סגור עכשיו"}
          </span>
        ) : (
          <span className="glass-badge-neutral">⚪ לא ידוע אם פתוח עכשיו</span>
        )}
        <span className="glass-badge">
          🕐 {p.todayHours ? `היום ${p.todayHours}` : "שעות לא אומתו"}
        </span>
        {dist !== null && <span className="glass-badge-info">📏 {dist.toFixed(1)} ק"מ</span>}
        {dist !== null && (
          <span className="glass-badge-warning">🚗 ~{driveMinutes(dist)} דק' נסיעה</span>
        )}
        {p.environment && (
          <span className="glass-badge">
            {p.environment === "ממוזג" ? "❄️ ממוזג" : p.environment === "פתוח" ? "🌳 בחוץ" : "🔀 משולב"}
          </span>
        )}
        <span className="glass-badge">
          👶 {p.ageRange ? `גילאי ${p.ageRange.min}–${p.ageRange.max}` : "גילאים לא אומתו"}
        </span>
        {p.stroller_accessible && (
          <span className="glass-badge-success">♿ נגיש לעגלות</span>
        )}
        {p.changing_table && (
          <span className="glass-badge-info">🍼 פינת החתלה</span>
        )}
        {p.easy_parking && (
          <span className="glass-badge-info">🅿️ חניה נוחה</span>
        )}
        {p.isSoftDemoted && (
          <span className="glass-badge-warning">⚠️ בדקו שעות אטרקציה פנימית (פעלטון/קולנוע)</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          🕒 עודכן לאחרונה:{" "}
          {updatedAt
            ? new Date(updatedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
            : "לא ידוע"}
        </span>
        <span>🔗 מקור: {isLocal ? "מסד המידע שלנו" : "Google Maps"}</span>
        {!shabbatKnown && <span className="font-semibold">⚠️ מידע השבת לא אומת לאחרונה</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <a href={p.mapsUri} target="_blank" rel="noopener noreferrer" className="glass-link glass-link-maps">
          🗺️ Google Maps
        </a>
        <a
          href={`https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-link glass-link-waze"
        >
          🧭 וויז
        </a>
        <a
          href={`whatsapp://send?text=${encodeURIComponent(`חשבתי שניסע ל${p.name} בשבת! 🎈\nזה פתוח, ${p.environment === "ממוזג" ? "ממוזג" : "כיף"}, ונמצא במרחק של בערך ${dist ? driveMinutes(dist) : "?"} דקות נסיעה מאיתנו.\n\nלינק לוויז: https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-link"
          style={{ backgroundColor: "#25D366", color: "white", borderColor: "#1DA851" }}
        >
          💬 שתף בוואטסאפ
        </a>
        {p.websiteUri && (
          <a href={p.websiteUri} target="_blank" rel="noopener noreferrer" className="glass-link">
            🔗 אתר רשמי
          </a>
        )}
      </div>

      <CommunityReports placeId={p.id} placeName={p.name} />
    </article>
  );
}
