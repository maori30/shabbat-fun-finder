/**
 * Fetches the weekend weather forecast for a given location using open-meteo API.
 * Returns a simple string describing the weekend weather condition.
 */
export async function getWeekendWeather(
  lat: number,
  lng: number,
): Promise<{ description: string; isHot: boolean; isRainy: boolean } | null> {
  try {
    // We only need daily max temperature and precipitation to determine basic weather
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,precipitation_probability_max&timezone=Asia%2FJerusalem`,
    );

    if (!response.ok) return null;

    const data = await response.json();
    const times: string[] = data.daily.time;
    const tempMax: number[] = data.daily.temperature_2m_max;
    const precipProb: number[] = data.daily.precipitation_probability_max;

    // Find Saturday
    // Dates come back as "YYYY-MM-DD" in Israel time. Parse at noon UTC so the
    // weekday doesn't shift with the visitor's own timezone.
    const saturdayIndex = times.findIndex((t) => new Date(`${t}T12:00:00Z`).getUTCDay() === 6);

    if (saturdayIndex === -1) return null; // Couldn't find a Saturday in the forecast (usually 7 days)

    const satTemp = Math.round(tempMax[saturdayIndex] ?? 0);
    const satPrecip = precipProb[saturdayIndex] ?? 0;

    let isHot = false;
    let isRainy = false;
    let description = `צפויות ${satTemp}°C בשבת`;

    if (satTemp >= 32) {
      isHot = true;
      description = `☀️ שבת חמה מאוד! צפויות ${satTemp}°C`;
    } else if (satTemp <= 15) {
      description = `❄️ שבת קרירה (${satTemp}°C)`;
    } else if (satPrecip > 40) {
      isRainy = true;
      description = `🌧️ סיכוי לגשם בשבת (${satPrecip}%)`;
    }

    return { description, isHot, isRainy };
  } catch (err) {
    console.error("Failed to fetch weather", err);
    return null;
  }
}
