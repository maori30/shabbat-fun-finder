import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getInsights } from "@/lib/admin.functions";
import type { AreaSummary } from "@/lib/insights";
import { LOW_RESULTS } from "@/lib/insights";

/** "Where are places missing?" — areas whose searches return few results. */
export function InsightsPanel({ password }: { password: string }) {
  const fn = useServerFn(getInsights);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<{ total: number; areas: AreaSummary[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (d = days) => {
    setLoading(true);
    setError("");
    try {
      const res = await fn({ data: { password, days: d } });
      if (res.ok) setData(res.data);
      else setError(res.error);
    } catch {
      setError("הטעינה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-panel space-y-3 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">📊 איפה חסרים מקומות?</h2>
        <div className="flex gap-2">
          <select
            value={days}
            onChange={(e) => {
              const d = Number(e.target.value);
              setDays(d);
              if (data) void load(d);
            }}
            className="glass-select rounded-xl px-2 py-1.5 text-sm"
            aria-label="תקופה"
          >
            <option value={7}>7 ימים</option>
            <option value={30}>30 יום</option>
            <option value={90}>90 יום</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || !password}
            className="glass-btn rounded-xl px-3 py-1.5 text-sm disabled:opacity-60"
          >
            {loading ? "טוען..." : "הצג"}
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        אזורים שבהם הורים חיפשו וקיבלו פחות מ-{LOW_RESULTS} תוצאות – שם כדאי להוסיף מקומות (למשל עם
        "הוספה מקישור" למטה). הנתונים אנונימיים: בלי כתובות IP ובלי טקסט חופשי.
      </p>
      {error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
      {data && data.total === 0 && (
        <p className="text-sm text-muted-foreground">עוד אין חיפושים בתקופה הזו.</p>
      )}
      {data && data.total > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{data.total} חיפושים בתקופה</div>
          <ul className="space-y-2">
            {data.areas.slice(0, 25).map((a) => (
              <li
                key={a.area}
                className={`glass-chip flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm ${
                  a.lowSearches > 0 ? "ring-1 ring-rose-400/60" : ""
                }`}
              >
                <span className="font-semibold">{a.area}</span>
                <span className="text-xs text-muted-foreground">
                  {a.searches} חיפושים · ממוצע {a.avgResults} תוצאות
                  {a.lowSearches > 0 ? ` · ${a.lowSearches} עם מעט תוצאות` : ""}
                  {a.topWants.length > 0 ? ` · חיפשו: ${a.topWants.join(", ")}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
