import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { searchPlaces, geocodeCity, type PlaceResult } from "@/lib/places.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "כיף לילדים - אטרקציות בשבת" },
      { name: "description", content: "מצאו אטרקציות לילדים הפתוחות בשבת, עם סינון לפי גיל, מיזוג, מיקום וקרבה אליכם." },
      { property: "og:title", content: "כיף לילדים - אטרקציות בשבת" },
      { property: "og:description", content: "מצאו אטרקציות לילדים הפתוחות בשבת, עם סינון לפי גיל, מיזוג, מיקום וקרבה אליכם." },
    ],
  }),
  component: Index,
});

type Attraction = {
  id: number;
  name: string;
  city: string;
  region: "צפון" | "מרכז" | "דרום" | "ירושלים";
  category: string;
  openShabbat: boolean;
  environment: "ממוזג" | "פתוח" | "משולב";
  minAge: number;
  maxAge: number;
  description: string;
  emoji: string;
  lat: number;
  lng: number;
  url?: string;
};

const ATTRACTIONS: Attraction[] = [
  { id: 1, name: "מוזיאון המדע ע\"ש בלומפילד", city: "ירושלים", region: "ירושלים", category: "מוזיאון", openShabbat: false, environment: "ממוזג", minAge: 4, maxAge: 16, description: "תערוכות מדע אינטראקטיביות לכל המשפחה.", emoji: "🔬", lat: 31.7767, lng: 35.1975, url: "https://www.mada.org.il/" },
  { id: 2, name: "לונה פארק סופרלנד", city: "ראשון לציון", region: "מרכז", category: "פארק שעשועים", openShabbat: false, environment: "פתוח", minAge: 3, maxAge: 16, description: "מתקנים לכל הגילאים, קרוסלות ורכבות הרים.", emoji: "🎢", lat: 31.9730, lng: 34.7925, url: "https://www.superland.co.il/" },
  { id: 3, name: "ספארי רמת גן", city: "רמת גן", region: "מרכז", category: "גן חיות", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 16, description: "טיול ברכב בין חיות בר וגן חיות מטופח.", emoji: "🦁", lat: 32.0787, lng: 34.8137, url: "https://www.safari.co.il/" },
  { id: 4, name: "מיני ישראל", city: "לטרון", region: "מרכז", category: "פארק", openShabbat: true, environment: "פתוח", minAge: 3, maxAge: 12, description: "דגמים זעירים של אתרים מפורסמים בישראל.", emoji: "🏛️", lat: 31.8386, lng: 34.9861, url: "https://www.minisrael.co.il/" },
  { id: 5, name: "מוזיאון הילדים חולון", city: "חולון", region: "מרכז", category: "מוזיאון", openShabbat: false, environment: "ממוזג", minAge: 2, maxAge: 12, description: "חוויות והדמיות אינטראקטיביות לכל הגילאים.", emoji: "🎨", lat: 32.0158, lng: 34.7874, url: "https://www.childrensmuseum.org.il/" },
  { id: 6, name: "ימית 2000 - פארק מים", city: "חולון", region: "מרכז", category: "פארק מים", openShabbat: true, environment: "פתוח", minAge: 3, maxAge: 16, description: "מגלשות מים, בריכות ופעילויות רטובות.", emoji: "🏊", lat: 32.0089, lng: 34.7745, url: "https://www.ymit2000.co.il/" },
  { id: 7, name: "גן גרו (Gan Garoo)", city: "עמק בית שאן", region: "צפון", category: "גן חיות", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 12, description: "פארק אוסטרלי - קנגורו, קואלה וחיות מקסימות.", emoji: "🦘", lat: 32.5133, lng: 35.5117, url: "https://gan-garoo.co.il/" },
  { id: 8, name: "Jump טרמפולינות", city: "ראשון לציון", region: "מרכז", category: "טרמפולינות", openShabbat: true, environment: "ממוזג", minAge: 4, maxAge: 16, description: "אולם טרמפולינות ענק עם מסלולי אתגר.", emoji: "🤸", lat: 31.9945, lng: 34.7830, url: "https://www.jump.co.il/" },
  { id: 9, name: "מצפה הכוכבים גבעתיים", city: "גבעתיים", region: "מרכז", category: "מדע", openShabbat: true, environment: "משולב", minAge: 6, maxAge: 16, description: "צפייה בכוכבים והרצאות אסטרונומיה.", emoji: "🔭", lat: 32.0719, lng: 34.8103, url: "https://www.givatayim-observatory.co.il/" },
  { id: 10, name: "חוות התאומים", city: "מודיעין", region: "מרכז", category: "חווה", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 10, description: "האכלת חיות משק ופעילויות בטבע.", emoji: "🐐", lat: 31.8969, lng: 35.0104 },
  { id: 11, name: "אתר החרמון", city: "נווה אטי\"ב", region: "צפון", category: "טבע", openShabbat: true, environment: "משולב", minAge: 5, maxAge: 16, description: "חוויה שלגית ומתקני אתגר בפסגת הצפון.", emoji: "🏔️", lat: 33.2833, lng: 35.7833, url: "https://www.skihermon.co.il/" },
  { id: 12, name: "גן החיות התנ\"כי ירושלים", city: "ירושלים", region: "ירושלים", category: "גן חיות", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 14, description: "גן חיות עם דגש על חיות מהתנ\"ך.", emoji: "🦒", lat: 31.7451, lng: 35.1806, url: "https://www.jerusalemzoo.org.il/" },
  { id: 13, name: "פארק הכרמל", city: "חיפה", region: "צפון", category: "טבע", openShabbat: true, environment: "פתוח", minAge: 3, maxAge: 16, description: "טיולים, פיקניקים ומסלולים משפחתיים.", emoji: "🌲", lat: 32.7333, lng: 35.0333 },
  { id: 14, name: "פארק תמנע", city: "אילת", region: "דרום", category: "טבע", openShabbat: true, environment: "פתוח", minAge: 4, maxAge: 16, description: "אתגרים גיאולוגיים ופעילויות מדבר.", emoji: "🏜️", lat: 29.7500, lng: 34.9500, url: "https://www.parktimna.co.il/" },
  { id: 15, name: "האקווריום הצוללת אילת", city: "אילת", region: "דרום", category: "אקווריום", openShabbat: true, environment: "משולב", minAge: 2, maxAge: 14, description: "צפייה בשונית האלמוגים מתחת למים.", emoji: "🐡", lat: 29.5033, lng: 34.9200, url: "https://www.coralworld.co.il/" },
  { id: 16, name: "אקסטרים פארק פ\"ת", city: "פתח תקווה", region: "מרכז", category: "פארק אתגרים", openShabbat: true, environment: "פתוח", minAge: 6, maxAge: 16, description: "מסלולי נינג'ה, אומגות וקירות טיפוס.", emoji: "🧗", lat: 32.0878, lng: 34.8878 },
  { id: 17, name: "iClimb חיפה", city: "חיפה", region: "צפון", category: "טיפוס", openShabbat: true, environment: "ממוזג", minAge: 5, maxAge: 16, description: "קירות טיפוס בולדרינג וקווי חבל.", emoji: "🧗‍♀️", lat: 32.7940, lng: 34.9896, url: "https://iclimb.co.il/" },
  { id: 18, name: "פארק אריאל שרון (הירקון)", city: "תל אביב", region: "מרכז", category: "פארק", openShabbat: true, environment: "פתוח", minAge: 0, maxAge: 16, description: "מרחבים ירוקים, אגם ומסלולי אופניים.", emoji: "🚴", lat: 32.0500, lng: 34.8000 },
  { id: 19, name: "יער בן שמן", city: "בן שמן", region: "מרכז", category: "טבע", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 16, description: "פיקניק, אופניים ופינות משחק ביער.", emoji: "🌳", lat: 31.9556, lng: 34.9247 },
  { id: 20, name: "פארק המים שפיים", city: "שפיים", region: "מרכז", category: "פארק מים", openShabbat: true, environment: "פתוח", minAge: 2, maxAge: 16, description: "בריכות ומגלשות מים בקיבוץ שפיים.", emoji: "💦", lat: 32.3350, lng: 34.8319, url: "https://www.shefayim.co.il/waterpark/" },
  { id: 21, name: "מדעטק חיפה", city: "חיפה", region: "צפון", category: "מוזיאון", openShabbat: true, environment: "ממוזג", minAge: 4, maxAge: 16, description: "מוצגי מדע אינטראקטיביים לכל המשפחה.", emoji: "⚗️", lat: 32.7935, lng: 34.9895, url: "https://www.madatech.org.il/" },
  { id: 22, name: "פארק שרונה", city: "תל אביב", region: "מרכז", category: "פארק", openShabbat: true, environment: "פתוח", minAge: 0, maxAge: 16, description: "מתחם ירוק עם מזרקה, מסעדות ומגרשים.", emoji: "⛲", lat: 32.0722, lng: 34.7855 },
  { id: 23, name: "נמל תל אביב", city: "תל אביב", region: "מרכז", category: "טיילת", openShabbat: true, environment: "פתוח", minAge: 0, maxAge: 16, description: "טיילת עם משחקים, אוכל וים.", emoji: "⚓", lat: 32.0996, lng: 34.7719, url: "https://www.namal.co.il/" },
  { id: 24, name: "גן לאומי אשקלון", city: "אשקלון", region: "דרום", category: "פארק לאומי", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 16, description: "טיולים, ארכיאולוגיה וחוף ים.", emoji: "🏖️", lat: 31.6688, lng: 34.5715 },
  { id: 25, name: "חוות סוסים בשרון", city: "רעננה", region: "מרכז", category: "רכיבה", openShabbat: true, environment: "פתוח", minAge: 4, maxAge: 16, description: "שיעורי רכיבה וטיולים בטבע.", emoji: "🐴", lat: 32.1900, lng: 34.8750 },
  { id: 26, name: "מוזיאון ארץ ישראל", city: "תל אביב", region: "מרכז", category: "מוזיאון", openShabbat: true, environment: "משולב", minAge: 4, maxAge: 14, description: "מוזיאון עם תערוכות ופעילויות לילדים.", emoji: "🏺", lat: 32.1035, lng: 34.7955, url: "https://www.eretzmuseum.org.il/" },
  { id: 27, name: "קיאקי כפר בלום", city: "כפר בלום", region: "צפון", category: "פארק מים", openShabbat: true, environment: "פתוח", minAge: 5, maxAge: 16, description: "רפטינג וקיאקים על נהר הירדן.", emoji: "🛶", lat: 33.1789, lng: 35.6100, url: "https://www.kayak.co.il/" },
  { id: 28, name: "לונה גל", city: "חוף גולן", region: "צפון", category: "פארק מים", openShabbat: true, environment: "פתוח", minAge: 3, maxAge: 16, description: "פארק מים על חוף הכנרת.", emoji: "🌀", lat: 32.8619, lng: 35.6486, url: "https://www.lunagal.co.il/" },
  { id: 29, name: "פארק הירקון", city: "תל אביב", region: "מרכז", category: "פארק", openShabbat: true, environment: "פתוח", minAge: 0, maxAge: 16, description: "פארק ענק עם סירות, אופניים ופינות משחק.", emoji: "🌿", lat: 32.1000, lng: 34.8100 },
  { id: 30, name: "מגדל דוד - מוזיאון", city: "ירושלים", region: "ירושלים", category: "מוזיאון", openShabbat: true, environment: "משולב", minAge: 5, maxAge: 16, description: "סיור בהיסטוריה של ירושלים.", emoji: "🏰", lat: 31.7761, lng: 35.2278, url: "https://www.tod.org.il/" },

  // --- קניונים וקולנוע ---
  { id: 31, name: "קניון עזריאלי תל אביב", city: "תל אביב", region: "מרכז", category: "קניון", openShabbat: false, environment: "ממוזג", minAge: 0, maxAge: 16, description: "קניון גדול עם קולנוע, מסעדות וארקייד.", emoji: "🛍️", lat: 32.0745, lng: 34.7920, url: "https://www.azrieli.com/mall/azrieli-tel-aviv/" },
  { id: 32, name: "קניון איילון", city: "רמת גן", region: "מרכז", category: "קניון", openShabbat: false, environment: "ממוזג", minAge: 0, maxAge: 16, description: "קניון ענק עם קולנוע וסניפי בילוי לילדים.", emoji: "🛒", lat: 32.0847, lng: 34.8014, url: "https://www.ayalonmall.co.il/" },
  { id: 33, name: "קניון גרנד חיפה", city: "חיפה", region: "צפון", category: "קניון", openShabbat: true, environment: "ממוזג", minAge: 0, maxAge: 16, description: "קניון פתוח בשבת עם קולנוע ומסעדות.", emoji: "🏬", lat: 32.7940, lng: 35.0350, url: "https://www.grandkanyon.co.il/" },
  { id: 34, name: "קניון הזהב ראשל\"צ", city: "ראשון לציון", region: "מרכז", category: "קניון", openShabbat: false, environment: "ממוזג", minAge: 0, maxAge: 16, description: "קניון עם ארקייד וקולנוע.", emoji: "🛍️", lat: 31.9930, lng: 34.7750, url: "https://www.hazahav.co.il/" },
  { id: 35, name: "ביג פאשן אשדוד", city: "אשדוד", region: "דרום", category: "קניון", openShabbat: true, environment: "ממוזג", minAge: 0, maxAge: 16, description: "מרכז קניות פתוח בשבת עם מתחם בילוי.", emoji: "🏬", lat: 31.7920, lng: 34.6510, url: "https://big.co.il/" },
  { id: 36, name: "סינמה סיטי גלילות", city: "רמת השרון", region: "מרכז", category: "קולנוע", openShabbat: true, environment: "ממוזג", minAge: 4, maxAge: 16, description: "מתחם קולנוע ענק עם ארקייד ובילוי משפחתי.", emoji: "🎬", lat: 32.1585, lng: 34.8060, url: "https://www.cinema-city.co.il/" },
  { id: 37, name: "סינמה סיטי ראשל\"צ", city: "ראשון לציון", region: "מרכז", category: "קולנוע", openShabbat: true, environment: "ממוזג", minAge: 4, maxAge: 16, description: "קולנוע רב אולמות עם מתחם משחקים.", emoji: "🎥", lat: 31.9840, lng: 34.7810, url: "https://www.cinema-city.co.il/" },
  { id: 38, name: "יס פלאנט ראשל\"צ", city: "ראשון לציון", region: "מרכז", category: "קולנוע", openShabbat: true, environment: "ממוזג", minAge: 4, maxAge: 16, description: "קומפלקס קולנוע ובילוי משפחתי.", emoji: "🍿", lat: 31.9970, lng: 34.7810, url: "https://www.yesplanet.co.il/" },
  { id: 39, name: "אייס מול אילת", city: "אילת", region: "דרום", category: "קניון", openShabbat: true, environment: "ממוזג", minAge: 0, maxAge: 16, description: "קניון פתוח בשבת בטיילת אילת עם מתחם קרח.", emoji: "🧊", lat: 29.5560, lng: 34.9530, url: "https://www.icemall.co.il/" },
  { id: 40, name: "קניון מלחה", city: "ירושלים", region: "ירושלים", category: "קניון", openShabbat: false, environment: "ממוזג", minAge: 0, maxAge: 16, description: "קניון גדול עם קולנוע וארקייד.", emoji: "🏬", lat: 31.7515, lng: 35.1876, url: "https://www.jerusalem-mall.co.il/" },
  { id: 41, name: "דיזנגוף סנטר", city: "תל אביב", region: "מרכז", category: "קניון", openShabbat: true, environment: "ממוזג", minAge: 0, maxAge: 16, description: "קניון עם קולנוע, אוכל ובאולינג.", emoji: "🛍️", lat: 32.0770, lng: 34.7745, url: "https://dizengof-center.co.il/" },
  { id: 42, name: "קניון סירקין פ\"ת", city: "פתח תקווה", region: "מרכז", category: "קניון", openShabbat: false, environment: "ממוזג", minAge: 0, maxAge: 16, description: "קניון שכונתי עם משחקייה ומסעדות.", emoji: "🏬", lat: 32.0900, lng: 34.9060, url: "https://www.sirkin-mall.co.il/" },
  { id: 43, name: "קניון אבנת פ\"ת", city: "פתח תקווה", region: "מרכז", category: "קניון", openShabbat: false, environment: "ממוזג", minAge: 0, maxAge: 16, description: "קניון עם קולנוע יס פלאנט ובילוי משפחתי.", emoji: "🛒", lat: 32.1050, lng: 34.8770, url: "https://avnat-mall.co.il/" },
  { id: 44, name: "יס פלאנט קניון אבנת", city: "פתח תקווה", region: "מרכז", category: "קולנוע", openShabbat: false, environment: "ממוזג", minAge: 4, maxAge: 16, description: "מתחם קולנוע ובילוי בקניון אבנת.", emoji: "🎬", lat: 32.1050, lng: 34.8770, url: "https://www.yesplanet.co.il/" },
  { id: 45, name: "TLV Fashion Mall", city: "תל אביב", region: "מרכז", category: "קניון", openShabbat: false, environment: "ממוזג", minAge: 0, maxAge: 16, description: "קניון בילוי, מסעדות וארקייד.", emoji: "🛍️", lat: 32.0568, lng: 34.7626, url: "https://www.tlv-mall.co.il/" },
  { id: 46, name: "רמת אביב מול", city: "תל אביב", region: "מרכז", category: "קניון", openShabbat: false, environment: "ממוזג", minAge: 0, maxAge: 16, description: "קניון עם ילדופיה, קולנוע ומסעדות.", emoji: "🛍️", lat: 32.1123, lng: 34.7962, url: "https://www.ramat-aviv-mall.co.il/" },
  { id: 47, name: "ביג פאשן גלילות", city: "רמת השרון", region: "מרכז", category: "קניון", openShabbat: true, environment: "ממוזג", minAge: 0, maxAge: 16, description: "מתחם קניות ופנאי פתוח בשבת.", emoji: "🏬", lat: 32.1560, lng: 34.8050, url: "https://big.co.il/" },
  { id: 48, name: "קניון סי מול אשדוד", city: "אשדוד", region: "דרום", category: "קניון", openShabbat: true, environment: "ממוזג", minAge: 0, maxAge: 16, description: "קניון בחוף אשדוד פתוח בשבת.", emoji: "🌊", lat: 31.7840, lng: 34.6350, url: "https://seamall.co.il/" },

  // --- משחקיות ומתחמים סגורים לילדים (אמת) ---
  { id: 49, name: "פעלטון קניון סירקין פ\"ת", city: "פתח תקווה", region: "מרכז", category: "משחקייה", openShabbat: false, environment: "ממוזג", minAge: 1, maxAge: 10, description: "משחקייה מקורה בקניון סירקין - מגלשות ובריכות כדורים.", emoji: "🎈", lat: 32.0900, lng: 34.9060, url: "https://www.paalton.co.il/" },
  { id: 50, name: "פעלטון קניון הדר פ\"ת", city: "פתח תקווה", region: "מרכז", category: "משחקייה", openShabbat: false, environment: "ממוזג", minAge: 1, maxAge: 10, description: "משחקייה מקורה גדולה עם מתקני שעשוע.", emoji: "🎪", lat: 32.0870, lng: 34.8890, url: "https://www.paalton.co.il/" },
  { id: 51, name: "פאן פאן ראשל\"צ", city: "ראשון לציון", region: "מרכז", category: "משחקייה", openShabbat: true, environment: "ממוזג", minAge: 1, maxAge: 10, description: "משחקייה ענקית ומתקנים לילדים.", emoji: "🎠", lat: 31.9850, lng: 34.7830, url: "https://funfun.co.il/" },
  { id: 52, name: "ג'מבורי בנימינה", city: "בנימינה", region: "צפון", category: "משחקייה", openShabbat: true, environment: "ממוזג", minAge: 1, maxAge: 10, description: "משחקייה מקורה עם מגלשות ובריכת כדורים.", emoji: "🧸", lat: 32.5170, lng: 34.9540 },
  { id: 53, name: "קידילנד ראשל\"צ", city: "ראשון לציון", region: "מרכז", category: "משחקייה", openShabbat: true, environment: "ממוזג", minAge: 1, maxAge: 8, description: "משחקייה עירונית לילדים קטנים.", emoji: "🎡", lat: 31.9800, lng: 34.7850 },
  { id: 54, name: "מונקי פארק - חיפה", city: "חיפה", region: "צפון", category: "משחקייה", openShabbat: true, environment: "ממוזג", minAge: 1, maxAge: 10, description: "מתחם משחקים מקורה עם מגלשות אתגר.", emoji: "🐒", lat: 32.7900, lng: 35.0100 },
  { id: 55, name: "קידס אילנד נתניה", city: "נתניה", region: "מרכז", category: "משחקייה", openShabbat: true, environment: "ממוזג", minAge: 1, maxAge: 10, description: "משחקייה ענקית ובית קפה להורים.", emoji: "🎪", lat: 32.3215, lng: 34.8532 },

  // --- באולינג, קארטינג, לייזר טאג, בריחה, VR ---
  { id: 56, name: "באולינג דיזנגוף סנטר", city: "תל אביב", region: "מרכז", category: "באולינג", openShabbat: true, environment: "ממוזג", minAge: 5, maxAge: 16, description: "מסלולי באולינג, ארקייד ומשחקי חברה.", emoji: "🎳", lat: 32.0770, lng: 34.7745, url: "https://www.bowling.co.il/" },
  { id: 57, name: "באולינג באר שבע", city: "באר שבע", region: "דרום", category: "באולינג", openShabbat: true, environment: "ממוזג", minAge: 5, maxAge: 16, description: "מסלולי באולינג ואולם ארקייד.", emoji: "🎳", lat: 31.2518, lng: 34.7913 },
  { id: 58, name: "קארטינג רעננה", city: "רעננה", region: "מרכז", category: "קארטינג", openShabbat: true, environment: "פתוח", minAge: 7, maxAge: 16, description: "מסלול קארטינג משפחתי במהירויות שונות.", emoji: "🏎️", lat: 32.1847, lng: 34.8708, url: "https://www.karting-raanana.co.il/" },
  { id: 59, name: "קארטינג אילת (מוטו פארק)", city: "אילת", region: "דרום", category: "קארטינג", openShabbat: true, environment: "פתוח", minAge: 7, maxAge: 16, description: "מסלול קארטינג באילת.", emoji: "🏁", lat: 29.5400, lng: 34.9500 },
  { id: 60, name: "לייזר טאג הרצליה", city: "הרצליה", region: "מרכז", category: "לייזר טאג", openShabbat: true, environment: "ממוזג", minAge: 6, maxAge: 16, description: "משחק לייזר טאג באולם חשוך ומגניב.", emoji: "🔫", lat: 32.1663, lng: 34.8438 },
  { id: 61, name: "Questomatica חדרי בריחה", city: "תל אביב", region: "מרכז", category: "חדר בריחה", openShabbat: true, environment: "ממוזג", minAge: 10, maxAge: 16, description: "חדרי בריחה מרובי חדרים ומשימות.", emoji: "🗝️", lat: 32.0668, lng: 34.7788, url: "https://www.questomatica.com/" },
  { id: 62, name: "VR פארק תל אביב", city: "תל אביב", region: "מרכז", category: "VR", openShabbat: true, environment: "ממוזג", minAge: 8, maxAge: 16, description: "מציאות מדומה, חדרי משחק וסימולטורים.", emoji: "🥽", lat: 32.0700, lng: 34.7900 },
  { id: 63, name: "פארק הקרח (Ice Peaks) אילת", city: "אילת", region: "דרום", category: "החלקה על הקרח", openShabbat: true, environment: "ממוזג", minAge: 4, maxAge: 16, description: "מגלשות קרח והחלקה במדבר.", emoji: "⛸️", lat: 29.5560, lng: 34.9520, url: "https://www.icepark.co.il/" },
  { id: 64, name: "קניון קרח קניון איילון", city: "רמת גן", region: "מרכז", category: "החלקה על הקרח", openShabbat: false, environment: "ממוזג", minAge: 4, maxAge: 16, description: "החלקה על הקרח בקניון איילון.", emoji: "❄️", lat: 32.0847, lng: 34.8014 },

  // --- טבע ואטרקציות פתוחות ---
  { id: 65, name: "פארק אוטופיה", city: "פארק התעשייה בת שלמה", region: "צפון", category: "גן צמחייה", openShabbat: true, environment: "משולב", minAge: 2, maxAge: 14, description: "גן אורכידאות טרופי עם מזרקות מוזיקליות.", emoji: "🌺", lat: 32.5900, lng: 34.9800, url: "https://www.utopiapark.co.il/" },
  { id: 66, name: "חוות ההרפתקאות (רופין)", city: "אמק חפר", region: "מרכז", category: "פארק אתגרים", openShabbat: true, environment: "פתוח", minAge: 5, maxAge: 16, description: "אומגות, גשרים תלויים וקיר טיפוס.", emoji: "🪢", lat: 32.3800, lng: 34.9100 },
  { id: 67, name: "פארק צפרות עמק החולה", city: "עמק החולה", region: "צפון", category: "טבע", openShabbat: true, environment: "פתוח", minAge: 3, maxAge: 16, description: "צפייה בציפורים ונופי אגם.", emoji: "🦩", lat: 33.0700, lng: 35.6100, url: "https://www.agamon-hula.co.il/" },
  { id: 68, name: "אגמון החולה", city: "יסוד המעלה", region: "צפון", category: "טבע", openShabbat: true, environment: "פתוח", minAge: 2, maxAge: 16, description: "סיור בקלנועית או עגלה בין ציפורי הנדידה.", emoji: "🦆", lat: 33.0736, lng: 35.6033, url: "https://www.agamon-hula.co.il/" },
  { id: 69, name: "גן לאומי קיסריה", city: "קיסריה", region: "צפון", category: "פארק לאומי", openShabbat: true, environment: "פתוח", minAge: 3, maxAge: 16, description: "אתר עתיקות רומאי על הים.", emoji: "🏛️", lat: 32.5000, lng: 34.8917, url: "https://www.caesarea.com/" },
  { id: 70, name: "מערת הנטיפים", city: "בית שמש", region: "ירושלים", category: "טבע", openShabbat: true, environment: "משולב", minAge: 4, maxAge: 16, description: "מערת נטיפים מרהיבה בשמורת אבשלום.", emoji: "🕳️", lat: 31.7267, lng: 34.9767 },
  { id: 71, name: "גן החיות הזואולוגי חי-פארק", city: "קריית מוצקין", region: "צפון", category: "גן חיות", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 12, description: "גן חיות משפחתי בצפון.", emoji: "🐨", lat: 32.8380, lng: 35.0800 },
  { id: 72, name: "קליף (KALIA) גלישת קייטרים", city: "ים המלח", region: "דרום", category: "פארק מים", openShabbat: true, environment: "פתוח", minAge: 4, maxAge: 16, description: "פארק מים בקיבוץ קליה על ים המלח.", emoji: "🌊", lat: 31.7400, lng: 35.4600 },
  { id: 73, name: "פארק דרום השרון (סיבים)", city: "יהוד", region: "מרכז", category: "פארק", openShabbat: true, environment: "פתוח", minAge: 1, maxAge: 12, description: "פארק ילדים ענק עם משחקיות ומסלולים.", emoji: "🛝", lat: 32.0342, lng: 34.8828 },
  { id: 74, name: "מיצוב תרבות דוד המלך (מים בירושלים)", city: "ירושלים", region: "ירושלים", category: "טבע", openShabbat: false, environment: "משולב", minAge: 6, maxAge: 16, description: "מנהרות ומעיינות באתר עיר דוד.", emoji: "💧", lat: 31.7739, lng: 35.2354, url: "https://www.cityofdavid.org.il/" },
  { id: 75, name: "פארק אשכול", city: "צפון הנגב", region: "דרום", category: "פארק לאומי", openShabbat: true, environment: "פתוח", minAge: 2, maxAge: 16, description: "בריכות, מגלשות ומרחבים ירוקים.", emoji: "🌴", lat: 31.3167, lng: 34.4667 },
  { id: 76, name: "פארק בריאות (חוות נועם)", city: "מודיעין", region: "מרכז", category: "חווה", openShabbat: true, environment: "פתוח", minAge: 2, maxAge: 12, description: "חוות טיפולית עם חיות משק ופעילויות.", emoji: "🐑", lat: 31.9000, lng: 35.0100 },
  { id: 77, name: "בית האמנים ראשל\"צ", city: "ראשון לציון", region: "מרכז", category: "אמנות", openShabbat: true, environment: "ממוזג", minAge: 4, maxAge: 14, description: "סדנאות אמנות לילדים.", emoji: "🎨", lat: 31.9700, lng: 34.7900 },
  { id: 78, name: "טיילת נתניה", city: "נתניה", region: "מרכז", category: "טיילת", openShabbat: true, environment: "פתוח", minAge: 0, maxAge: 16, description: "טיילת חוף עם רכבל, מזרקות ומתקנים.", emoji: "🚡", lat: 32.3300, lng: 34.8500 },
  { id: 79, name: "טיילת חוף אשדוד (לידו)", city: "אשדוד", region: "דרום", category: "טיילת", openShabbat: true, environment: "פתוח", minAge: 0, maxAge: 16, description: "טיילת חוף עם מתקני משחק.", emoji: "🏖️", lat: 31.7930, lng: 34.6350 },
  { id: 80, name: "רכבל חיפה - סטלה מאריס", city: "חיפה", region: "צפון", category: "טיילת", openShabbat: true, environment: "משולב", minAge: 2, maxAge: 16, description: "רכבל מהחוף לראש הכרמל.", emoji: "🚠", lat: 32.8280, lng: 34.9700 },
];

// Known city centers for "search near city" without geolocation
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "ירושלים": { lat: 31.7683, lng: 35.2137 },
  "תל אביב": { lat: 32.0853, lng: 34.7818 },
  "חיפה": { lat: 32.7940, lng: 34.9896 },
  "ראשון לציון": { lat: 31.9730, lng: 34.7925 },
  "רמת גן": { lat: 32.0684, lng: 34.8248 },
  "בני ברק": { lat: 32.0807, lng: 34.8338 },
  "חולון": { lat: 32.0158, lng: 34.7874 },
  "בת ים": { lat: 32.0231, lng: 34.7503 },
  "גבעתיים": { lat: 32.0719, lng: 34.8103 },
  "רמת השרון": { lat: 32.1462, lng: 34.8404 },
  "פתח תקווה": { lat: 32.0878, lng: 34.8878 },
  "ראש העין": { lat: 32.0956, lng: 34.9581 },
  "גבעת שמואל": { lat: 32.0778, lng: 34.8500 },
  "אור יהודה": { lat: 32.0294, lng: 34.8536 },
  "יהוד": { lat: 32.0342, lng: 34.8828 },
  "נתניה": { lat: 32.3215, lng: 34.8532 },
  "הרצליה": { lat: 32.1663, lng: 34.8438 },
  "רעננה": { lat: 32.1847, lng: 34.8708 },
  "כפר סבא": { lat: 32.1750, lng: 34.9070 },
  "הוד השרון": { lat: 32.1500, lng: 34.8886 },
  "מודיעין": { lat: 31.8969, lng: 35.0104 },
  "רחובות": { lat: 31.8947, lng: 34.8094 },
  "נס ציונה": { lat: 31.9294, lng: 34.7994 },
  "רמלה": { lat: 31.9293, lng: 34.8666 },
  "לוד": { lat: 31.9516, lng: 34.8886 },
  "אשדוד": { lat: 31.8014, lng: 34.6435 },
  "אשקלון": { lat: 31.6688, lng: 34.5715 },
  "קרית גת": { lat: 31.6100, lng: 34.7642 },
  "באר שבע": { lat: 31.2518, lng: 34.7913 },
  "דימונה": { lat: 31.0688, lng: 35.0327 },
  "אילת": { lat: 29.5581, lng: 34.9482 },
  "טבריה": { lat: 32.7922, lng: 35.5312 },
  "צפת": { lat: 32.9646, lng: 35.4960 },
  "כרמיאל": { lat: 32.9186, lng: 35.2952 },
  "עכו": { lat: 32.9281, lng: 35.0820 },
  "נהריה": { lat: 33.0100, lng: 35.0980 },
  "קרית שמונה": { lat: 33.2075, lng: 35.5698 },
  "נצרת": { lat: 32.7021, lng: 35.2978 },
  "עפולה": { lat: 32.6078, lng: 35.2897 },
  "בית שאן": { lat: 32.4970, lng: 35.4967 },
  "בית שמש": { lat: 31.7477, lng: 34.9860 },
  "אריאל": { lat: 32.1044, lng: 35.1731 },
  "מעלה אדומים": { lat: 31.7714, lng: 35.2969 },
};

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function Index() {
  const [query, setQuery] = useState("");
  const [shabbatOnly, setShabbatOnly] = useState(true);
  const [age, setAge] = useState<number | "">("");
  const [env, setEnv] = useState<"all" | "ממוזג" | "פתוח" | "משולב">("all");
  const [region, setRegion] = useState<"all" | Attraction["region"]>("all");

  const [nearCity, setNearCity] = useState<string>("");
  const [radius, setRadius] = useState<number>(30);
  const [origin, setOrigin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [googleResults, setGoogleResults] = useState<PlaceResult[] | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string>("");
  const [activityMode, setActivityMode] = useState<boolean>(false);
  const searchPlacesFn = useServerFn(searchPlaces);
  const geocodeCityFn = useServerFn(geocodeCity);
  const [freeCityInput, setFreeCityInput] = useState<string>("");
  const [cityLookupStatus, setCityLookupStatus] = useState<string>("");
  const [recentCitySearches, setRecentCitySearches] = useState<
    { cityName: string; result: { lat: number; lng: number; label: string } }[]
  >([]);

  const addRecentCity = (cityName: string, result: { lat: number; lng: number; label: string }) => {
    setRecentCitySearches((prev) => {
      const filtered = prev.filter((c) => c.cityName !== cityName);
      const next = [{ cityName, result }, ...filtered].slice(0, 8);
      try {
        localStorage.setItem("kids_recent_city_searches", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const searchAnyCity = async (cityInput: string) => {
    const trimmed = cityInput.trim();
    if (!trimmed) return;
    setCityLookupStatus("מחפש עיר...");
    try {
      const result = await geocodeCityFn({ data: { cityName: trimmed } });
      if (result) {
        setOrigin(result);
        setNearCity("");
        setGeoStatus("");
        setCityLookupStatus("");
        setFreeCityInput(trimmed);
        addRecentCity(trimmed, result);
      } else {
        setCityLookupStatus("לא נמצאה עיר כזו, נסו שם מלא יותר");
      }
    } catch (e) {
      setCityLookupStatus("שגיאה בחיפוש העיר");
      console.error(e);
    }
  };

  const runGoogleSearch = async () => {
    if (!origin) {
      setGoogleError("בחרו קודם עיר או השתמשו במיקום שלכם");
      return;
    }
    setGoogleLoading(true);
    setGoogleError("");
    try {
      const res = await searchPlacesFn({
        data: {
          lat: origin.lat,
          lng: origin.lng,
          radius: Math.min(radius, 50) * 1000,
          keyword: query.trim(),
          activityMode,
        },
      });
      if (res.error) setGoogleError(res.error);
      setGoogleResults(res.places);
    } catch (e) {
      setGoogleError("שגיאה בחיפוש");
      console.error(e);
    } finally {
      setGoogleLoading(false);
    }
  };

  const clearGoogle = () => {
    setGoogleResults(null);
    setGoogleError("");
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kids_favorites");
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
    try {
      const rawRecent = localStorage.getItem("kids_recent_city_searches");
      if (rawRecent) {
        const savedList = JSON.parse(rawRecent) as {
          cityName: string;
          result: { lat: number; lng: number; label: string };
        }[];
        if (Array.isArray(savedList) && savedList.length > 0) {
          setRecentCitySearches(savedList);
          const mostRecent = savedList[0];
          if (mostRecent?.result?.lat && mostRecent?.result?.lng) {
            setFreeCityInput(mostRecent.cityName);
            setOrigin(mostRecent.result);
          }
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("kids_favorites", JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  const toggleFav = (id: number) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const cityNames = useMemo(() => Object.keys(CITY_COORDS), []);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("הדפדפן לא תומך במיקום");
      return;
    }
    setGeoStatus("מאתר מיקום...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "המיקום שלי" });
        setNearCity("");
        setGeoStatus("");
      },
      () => setGeoStatus("לא הצלחנו לאתר את המיקום"),
      { timeout: 8000 }
    );
  };

  const pickCity = (city: string) => {
    setNearCity(city);
    if (city && CITY_COORDS[city]) {
      const result = { ...CITY_COORDS[city], label: city };
      setOrigin(result);
      setFreeCityInput("");
      addRecentCity(city, result);
    } else {
      setOrigin(null);
    }
  };

  const clearNearby = () => {
    setOrigin(null);
    setNearCity("");
    setGeoStatus("");
    setFreeCityInput("");
  };

  const selectRecentCity = (item: { cityName: string; result: { lat: number; lng: number; label: string } }) => {
    setOrigin(item.result);
    setNearCity("");
    setFreeCityInput(item.cityName);
    setGeoStatus("");
    addRecentCity(item.cityName, item.result);
  };

  const removeRecentCity = (cityName: string) => {
    setRecentCitySearches((prev) => {
      const next = prev.filter((c) => c.cityName !== cityName);
      try {
        localStorage.setItem("kids_recent_city_searches", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const results = useMemo(() => {
    const list = ATTRACTIONS.filter((a) => {
      if (showFavOnly && !favorites.includes(a.id)) return false;
      if (shabbatOnly && !a.openShabbat) return false;
      if (env !== "all" && a.environment !== env) return false;
      if (region !== "all" && a.region !== region) return false;
      if (age !== "" && (age < a.minAge || age > a.maxAge)) return false;
      if (query.trim()) {
        const q = query.trim();
        if (!(a.name.includes(q) || a.category.includes(q))) return false;
      }
      return true;
    }).map((a) => ({
      ...a,
      distance: origin ? distanceKm(origin, { lat: a.lat, lng: a.lng }) : null,
    }));

    if (origin) {
      return list
        .filter((a) => a.distance !== null && a.distance <= radius)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }
    return list;
  }, [query, shabbatOnly, age, env, region, origin, radius, showFavOnly, favorites]);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="liquid-orb orb-a" aria-hidden="true" />
      <div className="liquid-orb orb-b" aria-hidden="true" />
      <div className="liquid-orb orb-c" aria-hidden="true" />
      <div className="liquid-orb orb-d" aria-hidden="true" />
      <header className="glass-header text-primary-foreground rounded-b-[28px]">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">כיף לילדים 🎈</h1>
          <p className="mt-2 text-base md:text-lg opacity-90">
            מוצאים אטרקציות לילדים – כולל אלה שפתוחות בשבת, ממוזגות או בחוץ, ולפי גיל וקרבה אליכם
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="glass-panel rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי שם או קטגוריה"
              className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={18}
                value={age}
                onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="גיל הילד"
                className="w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={env}
                onChange={(e) => setEnv(e.target.value as typeof env)}
                className="rounded-xl border bg-background px-3 py-3 text-base"
              >
                <option value="all">סביבה</option>
                <option value="ממוזג">ממוזג</option>
                <option value="פתוח">פתוח</option>
                <option value="משולב">משולב</option>
              </select>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as typeof region)}
                className="rounded-xl border bg-background px-3 py-3 text-base"
              >
                <option value="all">אזור</option>
                <option value="צפון">צפון</option>
                <option value="מרכז">מרכז</option>
                <option value="ירושלים">ירושלים</option>
                <option value="דרום">דרום</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={shabbatOnly}
                onChange={(e) => setShabbatOnly(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              הצג רק אטרקציות פתוחות בשבת
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showFavOnly}
                onChange={(e) => setShowFavOnly(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              ❤️ רק מועדפים ({favorites.length})
            </label>
          </div>

          <div className="glass-panel mt-4 rounded-2xl p-3">
            <div className="text-sm font-semibold mb-2">🔎 חיפוש לפי קרבה אליי</div>
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <button
                onClick={useMyLocation}
                className="glass-btn-primary rounded-2xl px-4 py-2 text-sm font-medium"
              >
                📍 השתמש במיקום שלי
              </button>
              <span className="text-sm text-muted-foreground">או</span>
              <select
                value={nearCity}
                onChange={(e) => pickCity(e.target.value)}
                className="glass-select rounded-2xl px-3 py-2 text-sm"
              >
                <option value="">בחרו עיר קרובה...</option>
                {cityNames.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <input
                  value={freeCityInput}
                  onChange={(e) => setFreeCityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      searchAnyCity(freeCityInput);
                    }
                  }}
                  placeholder="או הקלידו כל עיר בישראל..."
                  className="glass-field rounded-2xl px-3 py-2 text-sm w-40"
                />
                <button
                  onClick={() => searchAnyCity(freeCityInput)}
                  className="glass-btn rounded-2xl px-2 py-2 text-sm whitespace-nowrap"
                >
                  🔎 חפש עיר
                </button>
              </div>
              {cityLookupStatus && (
                <span className="text-xs text-muted-foreground">{cityLookupStatus}</span>
              )}
              
              <div className="flex items-center gap-2 flex-1">
                <label className="text-sm whitespace-nowrap">רדיוס: {radius} ק"מ</label>
                <input
                  type="range"
                  min={5}
                  max={500}
                  step={5}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              {origin && (
                <button
                  onClick={clearNearby}
                  className="glass-btn rounded-2xl px-3 py-2 text-sm"
                >
                  נקה
                </button>
              )}
            </div>
            {origin && (
              <div className="mt-2 text-xs text-muted-foreground">
                מציג אטרקציות עד {radius} ק"מ מ־{origin.label}
              </div>
            )}
            {geoStatus && (
              <div className="mt-2 text-xs text-rose-700">{geoStatus}</div>
            )}
          </div>

          {recentCitySearches.length > 0 && (
            <div className="glass-panel mt-4 rounded-2xl p-3">
              <div className="text-sm font-semibold mb-2">🕘 חיפושים אחרונים</div>
              <div className="flex flex-wrap gap-2">
                {recentCitySearches.map((item) => (
                  <div
                    key={item.cityName}
                    className={`glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs whitespace-nowrap ${
                      origin?.label === item.result.label ? "ring-2 ring-primary/60" : ""
                    }`}
                  >
                    <button
                      onClick={() => selectRecentCity(item)}
                      className="hover:underline"
                    >
                      {item.cityName}
                    </button>
                    <button
                      onClick={() => removeRecentCity(item.cityName)}
                      aria-label={`הסר ${item.cityName} מהיסטוריית החיפושים`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {origin && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={runGoogleSearch}
                disabled={googleLoading}
                className="glass-btn-primary rounded-2xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {googleLoading ? "מחפש..." : "🌍 חפש מקומות אמיתיים מ-Google"}
              </button>
              {googleResults && (
                <button
                  onClick={clearGoogle}
                  className="glass-btn rounded-2xl px-3 py-2 text-sm"
                >
                  חזור לרשימה שלנו
                </button>
              )}
              <label className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={activityMode}
                  onChange={(e) => setActivityMode(e.target.checked)}
                  className="accent-emerald-600"
                />
                <span>🎡 מצב פעילות (אטרקציות בלבד — בלי מסעדות/קניונים)</span>
              </label>
              <span className="text-xs text-muted-foreground">
                עד {Math.min(radius, 50)} ק"מ · מקסימום 20 תוצאות
              </span>
            </div>
          )}
          {googleError && (
            <div className="mt-2 text-xs text-rose-700">{googleError}</div>
          )}
        </section>

        {googleResults ? (
          <>
            <div className="mt-4 text-sm text-muted-foreground">
              🌍 תוצאות מ-Google Maps: {googleResults.length}
            </div>
            <section className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {googleResults.map((p) => {
                const dist = origin ? distanceKm(origin, { lat: p.lat, lng: p.lng }) : null;
                return (
                  <article key={p.id} className="glass-card rounded-2xl p-4 transition-shadow overflow-hidden">
                    {p.photoUri ? (
                      <img
                        src={p.photoUri}
                        alt={p.name}
                        loading="lazy"
                        className="-m-4 mb-3 h-40 w-[calc(100%+2rem)] object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : null}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-3xl">{p.emoji}</div>
                        <h2 className="mt-1 text-lg font-bold">{p.name}</h2>
                        <div className="text-sm text-muted-foreground">
                          {p.primaryType ?? "מקום"} {p.rating ? `· ⭐ ${p.rating} (${p.userRatingCount ?? 0})` : ""}
                        </div>
                      </div>
                      {p.openShabbat !== null && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${
                            p.openShabbat
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {p.openShabbat ? "פתוח בשבת" : "סגור בשבת"}
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="mt-2 text-sm text-foreground/80">{p.description}</p>
                    )}
                    {p.address && <p className="mt-2 text-sm text-muted-foreground">{p.address}</p>}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {dist !== null && (
                        <span className="rounded-full bg-primary/10 text-primary px-2.5 py-1 font-semibold">
                          📏 {dist.toFixed(1)} ק"מ
                        </span>
                      )}
                      {dist !== null && (
                        <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 font-semibold">
                          🚗 ~{Math.max(1, Math.round(dist))} דק'
                        </span>
                      )}
                      {p.openNow !== null && (
                        <span className={`rounded-full px-2.5 py-1 font-semibold ${p.openNow ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"}`}>
                          {p.openNow ? "🟢 פתוח עכשיו" : "⚫ סגור עכשיו"}
                        </span>
                      )}
                      {p.environment && (
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground font-semibold">
                          {p.environment === "ממוזג" ? "❄️ ממוזג" : p.environment === "פתוח" ? "☀️ פתוח" : "🔀 משולב"}
                        </span>
                      )}
                      {p.ageRange && (
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground font-semibold">
                          👶 גילאי {p.ageRange.min}–{p.ageRange.max}
                        </span>
                      )}
                      {p.isSoftDemoted && (
                        <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 font-semibold">
                          ⚠️ בדקו שעות אטרקציה פנימית (פעלטון/קולנוע)
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <a
                        href={p.mapsUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-blue-600 text-white px-3 py-1.5 font-semibold hover:opacity-90"
                      >
                        🗺️ פתח ב-Google Maps
                      </a>
                      <a
                        href={`https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-sky-600 text-white px-3 py-1.5 font-semibold hover:opacity-90"
                      >
                        🧭 וויז
                      </a>
                      {p.websiteUri && (
                        <a
                          href={p.websiteUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border px-3 py-1.5 font-semibold hover:bg-secondary"
                        >
                          🔗 אתר
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
            {googleResults.length === 0 && !googleLoading && (
              <div className="glass-empty mt-8 rounded-2xl p-8 text-center text-muted-foreground">
                לא נמצאו תוצאות ב-Google. נסו לשנות את החיפוש או הרדיוס.
              </div>
            )}
          </>
        ) : (
        <>
        <div className="mt-4 text-sm text-muted-foreground">
          נמצאו {results.length} אטרקציות
        </div>

        <section className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((a) => (
            <article key={a.id} className="glass-card rounded-2xl p-4 transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-3xl">{a.emoji}</div>
                  <h2 className="mt-1 text-lg font-bold">{a.name}</h2>
                  <div className="text-sm text-muted-foreground">
                    {a.city} · {a.category}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => toggleFav(a.id)}
                    aria-label="הוסף למועדפים"
                    className="text-2xl leading-none hover:scale-110 transition-transform"
                  >
                    {favorites.includes(a.id) ? "❤️" : "🤍"}
                  </button>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      a.openShabbat
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {a.openShabbat ? "פתוח בשבת" : "סגור בשבת"}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm">{a.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  {a.environment === "ממוזג" ? "❄️ ממוזג" : a.environment === "פתוח" ? "☀️ פתוח" : "🔀 משולב"}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  👶 גילאי {a.minAge}–{a.maxAge}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  📍 {a.region}
                </span>
                {a.distance !== null && (
                  <span className="rounded-full bg-primary/10 text-primary px-2.5 py-1 font-semibold">
                    📏 {a.distance.toFixed(1)} ק"מ
                  </span>
                )}
                {a.distance !== null && (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 font-semibold">
                    🚗 ~{Math.max(1, Math.round((a.distance / 60) * 60))} דק'
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <a
                  href={`https://waze.com/ul?ll=${a.lat},${a.lng}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-sky-600 text-white px-3 py-1.5 font-semibold hover:opacity-90"
                >
                  🧭 נווט בוויז
                </a>
                <a
                  href={a.url ?? `https://www.google.com/search?q=${encodeURIComponent(a.name + " " + a.city)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border px-3 py-1.5 font-semibold hover:bg-secondary"
                >
                  🔗 {a.url ? "לאתר" : "חיפוש בגוגל"}
                </a>
              </div>
            </article>
          ))}
        </section>

        {results.length === 0 && (
          <div className="glass-empty mt-8 rounded-2xl p-8 text-center text-muted-foreground">
            לא נמצאו אטרקציות מתאימות. נסו לשנות את הסינון או להגדיל את הרדיוס.
          </div>
        )}
        </>
        )}


        <footer className="mt-10 pb-6 text-center text-xs text-muted-foreground">
          המידע הוא לצורך התרשמות בלבד. מומלץ לוודא שעות פתיחה מול האתר הרשמי.
        </footer>
      </main>
    </div>
  );
}
