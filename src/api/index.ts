import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(express.json({ limit: "25mb" }));

const PLAN_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    const err = new Error(
      "Brak skonfigurowanego klucza API GEMINI_API_KEY w ustawieniach Vercel."
    ) as Error & { status?: number; code?: string };
    err.status = 401;
    err.code = "API_KEY_MISSING";
    throw err;
  }
  return new GoogleGenAI({ apiKey });
}

function formatGeminiError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  const rawMessage =
    error instanceof Error ? error.message : String(error ?? "Nieznany błąd");
  const statusProp =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: number }).status)
      : undefined;

  const lower = rawMessage.toLowerCase();

  if (
    statusProp === 429 ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("429")
  ) {
    return {
      status: 429,
      code: "RESOURCE_EXHAUSTED",
      message:
        "Przekroczono limit zapytań darmowego klucza API (429). Odczekaj chwilę i spróbuj ponownie.",
    };
  }

  if (
    statusProp === 403 ||
    statusProp === 401 ||
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid")
  ) {
    return {
      status: 403,
      code: "PERMISSION_DENIED",
      message:
        "Klucz API został odrzucony przez Google. Sprawdź wartość GEMINI_API_KEY w ustawieniach Vercel.",
    };
  }

  return {
    status: statusProp && statusProp >= 400 ? statusProp : 500,
    code: "GENERATION_FAILED",
    message: `Błąd silnika AI: ${rawMessage}`,
  };
}

const TYPOGRAPHY_ENGLISH_MAP: Record<string, string> = {
  "Nowoczesny Grotesk":
    "bold geometric Swiss neo-grotesque sans-serif typography, clean crisp tracking, confident architectural hierarchy",
  "Redakcyjny Szeryf":
    "refined high-contrast modern editorial serif display typography paired with clean humanist sans-serif captions",
  "Techniczny Geometryczny":
    "sharp modular geometric sans-serif display type with structured Swiss grid alignment and crisp technical spacing",
  "Humanistyczny Minimalizm":
    "warm, approachable minimalist humanist sans-serif typography with generous whitespace and balanced legibility",
};

const WORKPLACE_ENGLISH_MAP: Record<string, string> = {
  "Jasne biuro loftowe":
    "sunlit contemporary European industrial-loft office with tall steel-framed windows, warm brick accents, oak worktables, and indoor plants",
  "Studio z drewnem i zielenią":
    "bright Scandinavian-inspired architectural studio with pale oak timber slats, glass meeting rooms, abundant botanical greenery, and soft natural daylight",
  "Laboratorium R&D ze szkłem":
    "modern high-craft R&D innovation center with clean glass partitions, brushed aluminum fixtures, minimalist benches, prototyping tools, and crisp daylight",
  "Skandynawski open-space z tarasem":
    "airy minimalist modern workspace opening onto a green urban terrace, natural concrete floors, acoustic wood panels, warm afternoon light",
};

app.post("/api/campaign/plan", async (req, res) => {
  try {
    const brief = req.body;
    if (!brief?.companyName?.trim() || !brief?.description?.trim()) {
      return res.status(400).json({
        code: "INVALID_BRIEF",
        message: "Podaj nazwę firmy oraz opis kultury, propozycji EVP lub stanowiska.",
      });
    }

    const ai = createGeminiClient();
    const modeLabel =
      brief.mode === "culture"
        ? "Kultura organizacyjna firmy"
        : brief.mode === "evp"
          ? "Propozycja wartości dla pracownika (EVP)"
          : `Rekrutacja na konkretne stanowisko: ${brief.roleTitle || "Specjalista"}`;

    const typoEng =
      TYPOGRAPHY_ENGLISH_MAP[brief.typographyStyle] ??
      TYPOGRAPHY_ENGLISH_MAP["Nowoczesny Grotesk"];
    const workplaceEng =
      WORKPLACE_ENGLISH_MAP[brief.workplaceVibe] ??
      WORKPLACE_ENGLISH_MAP["Studio z drewnem i zielenią"];

    const prompt = `
Jesteś dyrektorem kreatywnym i strategiem employer brandingu (EB) w topowym europejskim studiu projektowym.
Przygotuj spójny koncept kampanii employer brandingowej dla polskiej firmy na podstawie briefu:

- Nazwa firmy: ${brief.companyName.trim()}
- Punkt wyjścia: ${modeLabel}
${brief.roleTitle ? `- Stanowisko: ${brief.roleTitle.trim()}` : ""}
- Opis kultury / EVP / stanowiska: ${brief.description.trim()}
- Główny kolor marki (HEX): ${brief.primaryColor}
- Kolor uzupełniający / akcent (HEX): ${brief.secondaryColor}
- Styl typografii: ${brief.typographyStyle} (${typoEng})
- Klimat miejsca pracy: ${brief.workplaceVibe} (${workplaceEng})
${brief.customHeadline?.trim() ? `- Preferowane hasło użytkownika (użyj go jako headline): ${brief.customHeadline.trim()}` : "- Brak narzuconego hasła — stwórz krótkie, autentyczne polskie hasło (maks. 5 słów), zero korporacyjnych klisz typu 'dynamiczny zespół'."}

ZASADY KRYTYCZNE DLA SPÓJNOŚCI WIZUALNEJ:
1. Wszystkie 3 prompty obrazowe (linkedin, billboard, officeBanner) MUSZĄ być napisane po ANGIELSKU, ale cytowane napisy na kreacjach (nazwa firmy "${brief.companyName.trim()}", hasło główne, powitanie w biurze) MUSZĄ być dokładnie po POLSKU.
2. Wszystkie 3 obrazy muszą wyglądać jak jedna kampania tej samej marki: paleta ${brief.primaryColor} i ${brief.secondaryColor}, styl typografii ${typoEng}, klimat ${workplaceEng}, autentyczna fotografia dokumentalna 35mm, naturalne światło dzienne, zróżnicowani profesjonaliści przy prawdziwej pracy, zero sztucznych póz stockowych.
3. Post na LinkedIn ("linkedinPost") napisz po polsku: konkretny, ludzki, z 3 krótkimi akapitami, wyraźnym CTA i 4 trafnymi hashtagami.
`;

    const response = await ai.models.generateContent({
      model: PLAN_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            subheadline: { type: Type.STRING },
            welcomeMessage: { type: Type.STRING },
            linkedinPost: { type: Type.STRING },
            brandVoiceSummary: { type: Type.STRING },
            artDirectionLock: { type: Type.STRING },
            prompts: {
              type: Type.OBJECT,
              properties: {
                linkedin: { type: Type.STRING },
                billboard: { type: Type.STRING },
                officeBanner: { type: Type.STRING },
              },
              required: ["linkedin", "billboard", "officeBanner"],
            },
          },
          required: [
            "headline",
            "subheadline",
            "welcomeMessage",
            "linkedinPost",
            "brandVoiceSummary",
            "artDirectionLock",
            "prompts",
          ],
        },
      },
    });

    const rawText = (response.text ?? "").trim();
    const plan = JSON.parse(rawText);
    res.json({ plan, model: PLAN_MODEL });
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json(formatted);
  }
});

app.post("/api/campaign/image", async (req, res) => {
  try {
    const {
      medium,
      prompt,
      aspectRatio,
      artDirectionLock,
      referenceImageBase64,
      referenceMimeType,
      refinementNote,
    } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({
        code: "INVALID_PROMPT",
        message: "Brak opisu wizualnego do wygenerowania obrazu.",
      });
    }

    const ai = createGeminiClient();
    const parts: Array<
      { text: string } | { inlineData: { data: string; mimeType: string } }
    > = [];

    let finalPrompt = prompt.trim();
    if (artDirectionLock?.trim()) {
      finalPrompt += `\n\nSTRICT BRAND VISUAL DNA LOCK: ${artDirectionLock.trim()}`;
    }
    finalPrompt +=
      "\n\nANTI-STOCK REALISM DIRECTIVE: Depict authentic, diverse contemporary professionals genuinely absorbed in collaborative work in a real modern office. Natural unposed expressions, subtle 35mm documentary depth and daylight, zero cheesy posed camera smiles.";

    if (refinementNote?.trim()) {
      finalPrompt += `\n\nUSER CREATIVE ADJUSTMENT: ${refinementNote.trim()}`;
    }

    if (referenceImageBase64 && referenceMimeType) {
      parts.push({
        inlineData: {
          data: referenceImageBase64,
          mimeType: referenceMimeType,
        },
      });
      finalPrompt =
        `BRAND COHESION REFERENCE: Preserve the exact brand color palette, graphic identity, typography style, and workplace aesthetic from the attached master visual while adapting it to the new medium (${medium}).\n\n` +
        finalPrompt;
    }

    parts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "4:3",
        },
      },
    });

    let imageUrl: string | null = null;
    let mimeType = "image/png";
    let base64Data: string | null = null;

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        base64Data = part.inlineData.data;
        mimeType = part.inlineData.mimeType ?? "image/png";
        imageUrl = `data:${mimeType};base64,${base64Data}`;
      }
    }

    if (!imageUrl || !base64Data) {
      return res.status(502).json({
        code: "NO_IMAGE_RETURNED",
        message: "Model obrazowy nie zwrócił grafiki. Spróbuj ponownie.",
      });
    }

    res.json({ imageUrl, base64Data, mimeType, model: IMAGE_MODEL });
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json(formatted);
  }
});

export default app;
