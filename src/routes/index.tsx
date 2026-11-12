import { createFileRoute } from "@tanstack/react-router";
import { Finder } from "@/components/finder";
import { SITE_URL, PREVIEW_IMAGE } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "כיף לילדים - אטרקציות ובילויים לילדים בשבת" },
      {
        name: "description",
        content:
          "מצאו אטרקציות ובילויים לילדים הפתוחים בשבת, עם סינון לפי גיל, מיזוג, מיקום וקרבה אליכם.",
      },
      { property: "og:title", content: "כיף לילדים - אטרקציות ובילויים לילדים בשבת" },
      {
        property: "og:description",
        content:
          "מצאו אטרקציות ובילויים לילדים הפתוחים בשבת, עם סינון לפי גיל, מיזוג, מיקום וקרבה אליכם.",
      },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: PREVIEW_IMAGE },
      { name: "twitter:image", content: PREVIEW_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${SITE_URL}/#organization`,
              name: "כיף לילדים",
              url: `${SITE_URL}/`,
            },
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              name: "כיף לילדים",
              url: `${SITE_URL}/`,
              inLanguage: "he-IL",
              publisher: { "@id": `${SITE_URL}/#organization` },
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  return <Finder />;
}
