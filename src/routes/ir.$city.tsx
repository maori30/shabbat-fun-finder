import { createFileRoute, notFound } from "@tanstack/react-router";
import { Finder } from "@/components/finder";
import { cityFromSlug, citySlug } from "@/lib/geo";
import { PREVIEW_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * City landing pages, e.g. /ir/תל_אביב — "מה פתוח בשבת לילדים בתל אביב".
 * Same finder as the home page, pre-centered on the city, with its own
 * title/description/canonical so each city can rank in search.
 */
export const Route = createFileRoute("/ir/$city")({
  loader: ({ params }) => {
    const city = cityFromSlug(params.city);
    if (!city) throw notFound();
    return { city };
  },
  head: ({ loaderData }) => {
    const city = loaderData?.city;
    if (!city) return {};
    const url = `${SITE_URL}/ir/${encodeURIComponent(citySlug(city))}`;
    const title = `אטרקציות לילדים בשבת ב${city} – מה פתוח ומה עושים | ${SITE_NAME}`;
    const description = `מה עושים עם הילדים בשבת ב${city} והסביבה? אטרקציות פתוחות בשבת, מקומות ממוזגים ובחוץ, לפי גיל ומרחק – כולל דיווחי הורים.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: PREVIEW_IMAGE },
        { name: "twitter:image", content: PREVIEW_IMAGE },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CityPage,
});

function CityPage() {
  const { city } = Route.useLoaderData();
  // key: remount when navigating between cities so state starts fresh.
  return <Finder key={city} initialCity={city} />;
}
