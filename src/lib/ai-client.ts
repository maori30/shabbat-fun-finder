/**
 * Server-side JSON chat-completion helper: Lovable AI gateway first, Gemini
 * as a fallback, with retries on 429/503. Used by the smart search and by the
 * admin "import from link" tool.
 */

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "openai/gpt-5.6-sol";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-3.8-flash";

export function envKey(...names: string[]): string | undefined {
  const proc = typeof process !== "undefined" ? process.env : {};
  const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  for (const n of names) {
    const v = proc[n] ?? meta[n];
    if (v) return v;
  }
  return undefined;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAiWithRetry(
  endpoint: string,
  model: string,
  headers: Record<string, string>,
  messages: { role: string; content: string }[],
  maxRetries = 2,
): Promise<Record<string, unknown>> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        const err = new Error(`AI ${res.status}: ${body.slice(0, 200)}`);
        // Retry on 503 (high demand) or 429 (rate limit)
        if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
          await delay(1000 * (attempt + 1));
          continue;
        }
        throw err;
      }

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content ?? "{}";
      try {
        return JSON.parse(content) as Record<string, unknown>;
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        return match ? (JSON.parse(match[0]) as Record<string, unknown>) : {};
      }
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        await delay(1000 * (attempt + 1));
      }
    }
  }
  throw lastError ?? new Error("AI request failed");
}

export async function callAi(messages: { role: string; content: string }[]) {
  const lovableKey = envKey("LOVABLE_API_KEY");
  const geminiKey = envKey("GEMINI_API_KEY", "VITE_GEMINI_API_KEY");

  if (!lovableKey && !geminiKey) {
    throw new Error("חסר מפתח AI");
  }

  // 1. Try Lovable API if key is present
  if (lovableKey) {
    try {
      return await callAiWithRetry(
        AI_URL,
        MODEL,
        {
          "Content-Type": "application/json",
          "Lovable-API-Key": lovableKey,
        },
        messages,
        1,
      );
    } catch (e) {
      console.warn("Lovable AI Gateway failed, checking Gemini fallback...", e);
      if (!geminiKey) throw e;
    }
  }

  // 2. Try Gemini API as fallback or primary
  if (geminiKey) {
    return await callAiWithRetry(
      GEMINI_URL,
      GEMINI_MODEL,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${geminiKey}`,
      },
      messages,
      2,
    );
  }

  throw new Error("לא ניתן להשלים את פניית ה-AI");
}
