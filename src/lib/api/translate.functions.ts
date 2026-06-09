import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server-side proxy to the Lovable AI Gateway for translating short
// AI-generated strings (university match reasons, profile summaries) into the
// user's chosen language. Cached client-side by useAutoTranslate.

const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  zh: "Simplified Chinese",
  hi: "Hindi",
  ar: "Arabic",
  pt: "Portuguese (Brazilian)",
  ru: "Russian",
  fr: "French",
  de: "German",
  kk: "Kazakh",
};

export const translateTexts = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      targetLang: z.string().min(2).max(5),
      texts: z.array(z.string().min(1).max(2000)).min(1).max(20),
    }),
  )
  .handler(async ({ data }) => {
    if (data.targetLang === "en") {
      return { translations: data.texts };
    }
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { translations: data.texts };
    }
    const langName = LANG_NAMES[data.targetLang] ?? data.targetLang;
    const system = `You are a professional translator. Translate every string in the provided JSON array into ${langName}.
- Return ONLY a JSON object: {"items":[...]} — same order, same length, translated values.
- Preserve placeholders like {name}, emoji, punctuation, arrows, percent signs.
- Keep brand and acronym tokens untranslated: QuestCampus, Polar, Google, SAT, ACT, IELTS, TOEFL, Duolingo, IB, A-Levels, Gaokao, CBSE, Abitur.
- Keep dollar amounts (e.g. $9, $1,500) intact.
- Tone: warm, friendly, concise, second-person.`;

    try {
      const res = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: system },
              {
                role: "user",
                content: JSON.stringify({ items: data.texts }),
              },
            ],
            response_format: { type: "json_object" },
          }),
        },
      );
      if (!res.ok) return { translations: data.texts };
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) return { translations: data.texts };
      const parsed = JSON.parse(content) as { items?: unknown };
      if (
        Array.isArray(parsed.items) &&
        parsed.items.length === data.texts.length &&
        parsed.items.every((v) => typeof v === "string")
      ) {
        return { translations: parsed.items as string[] };
      }
    } catch {
      /* fall through */
    }
    return { translations: data.texts };
  });
