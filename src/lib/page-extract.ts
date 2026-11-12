/**
 * Helpers for "import an attraction from its website": URL safety checks and
 * turning raw HTML into compact text an AI can read. Pure (no imports) so it
 * can be unit-tested with `node --test`.
 */

/**
 * Only public http(s) sites. The server fetches the URL, so block anything
 * that could reach internal services: IP literals, localhost, internal TLDs,
 * credentials in the URL and non-standard ports.
 */
export function isSafePublicUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".")) return null; // "localhost", "intranet"
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null; // IPv4 literal
  if (host.startsWith("[") || host.includes(":")) return null; // IPv6 literal
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(host)) return null;
  if (/^(metadata|169\.254)/.test(host)) return null;
  return url;
}

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

function decode(text: string) {
  return text
    .replace(/&(nbsp|amp|quot|#39|apos|lt|gt);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)));
}

/**
 * Title + meta description + JSON-LD (often holds exact opening hours,
 * address and price) + visible text, capped for the AI prompt.
 */
export function htmlToText(html: string, maxChars = 12000): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const metaDesc =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
    html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
    "";
  const jsonLd = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  )
    .map((m) => m[1]!.trim())
    .join("\n")
    .slice(0, 4000);

  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const text = decode(body)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1)
    .join("\n");

  return [
    title && `כותרת: ${decode(title)}`,
    metaDesc && `תיאור: ${decode(metaDesc)}`,
    jsonLd && `נתונים מובנים (JSON-LD): ${jsonLd}`,
    `תוכן הדף:\n${text}`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, maxChars);
}

export type ExtractedAttraction = {
  is_attraction: boolean;
  name: string;
  city: string | null;
  address: string | null;
  category: string | null;
  description: string | null;
  open_shabbat: boolean | null;
  shabbat_hours: string | null;
  environment: "ממוזג" | "פתוח" | "משולב" | null;
  min_age: number | null;
  max_age: number | null;
  price: string | null;
};

const str = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
const age = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 18 ? Math.round(v) : null;

/** Validate whatever the AI returned into a safe, typed draft. */
export function normalizeExtracted(raw: Record<string, unknown>): ExtractedAttraction | null {
  const name = str(raw.name, 120);
  if (!name || name.length < 2) return null;
  const env = raw.environment;
  let minAge = age(raw.min_age);
  let maxAge = age(raw.max_age);
  if (minAge !== null && maxAge !== null && minAge > maxAge) [minAge, maxAge] = [maxAge, minAge];
  return {
    is_attraction: raw.is_attraction !== false,
    name,
    city: str(raw.city, 80),
    address: str(raw.address, 200),
    category: str(raw.category, 60),
    description: str(raw.description, 600),
    open_shabbat: raw.open_shabbat === true ? true : raw.open_shabbat === false ? false : null,
    shabbat_hours: str(raw.shabbat_hours, 80),
    environment: env === "ממוזג" || env === "פתוח" || env === "משולב" ? env : null,
    min_age: minAge,
    max_age: maxAge,
    price: str(raw.price, 120),
  };
}
