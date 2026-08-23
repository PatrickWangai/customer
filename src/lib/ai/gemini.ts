import "server-only";

const MODEL = "gemini-3.6-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * Minimal Gemini text-generation call over raw REST — no SDK dependency,
 * since the whole request/response shape is three fields. Uses "minimal"
 * thinking (verified against the live API: without it, this model spends
 * ~100 tokens "thinking" even for a one-word reply, which matters when
 * running on Google AI Studio's free tier). Returns null on any failure —
 * missing key, network error, non-200, empty candidate — so every caller
 * can fall back to its existing non-AI behavior rather than breaking.
 */
export async function generateGeminiReply(systemInstruction: string, userText: string, maxOutputTokens = 300): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          maxOutputTokens,
          temperature: 0.4,
          thinkingConfig: { thinkingLevel: "MINIMAL" },
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts as { text?: string }[] | undefined;
    const text = parts?.map((p) => p.text ?? "").join("").trim();
    return text || null;
  } catch {
    return null;
  }
}
