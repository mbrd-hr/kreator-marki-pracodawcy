import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLAN_MODEL = "gemini-4-hydrogen";
const IMAGE_MODEL = "gemini-3.1-flash-lite-image";

const PORT = Number(process.env.PORT || 3000);

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    const err = new Error(
      "Brak skonfigurowanego klucza API. Dodaj klucz GEMINI_API_KEY w panelu Settings > Secrets, aby generować kampanie za pomocą modelu Nano-Banana."
    ) as Error & { status?: number; code?: string };
    err.status = 401;
    err.code = "API_KEY_MISSING";
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status?: number }).status)
          : 0;
      // Do not retry auth, billing, quota, or bad-request errors
      if (status >= 400 && status < 500 && status !== 408) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delayMs = 600 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
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
  const codeProp =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code)
      : undefined;

  if (codeProp === "API_KEY_MISSING") {
    return { status: 401, code: "API_KEY_MISSING", message: rawMessage };
  }

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
        "Przekroczono limit zapytań lub model Nano-Banana wymaga klucza API z włączonym rozliczaniem (paid tier). Zaktualizuj klucz API w panelu Settings > Secrets i spróbuj ponownie.",
    };
  }

  if (
    statusProp === 403 ||
    statusProp === 401 ||
    lower.includes("permission_denied") ||
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    lower.includes("unauthorized")
  ) {
    return {
      status: 403,
      code: "PERMISSION_DENIED",
      message:
        "Klucz API został odrzucony lub nie ma uprawnień do tego modelu. Sprawdź lub wybierz prawidłowy klucz w panelu Settings > Secrets.",
    };
  }

  if (statusProp === 404 || lower.includes("not_found")) {
    return {
      status: 404,
      code: "NOT_FOUND",
      message:
        "Wybrany model nie jest obecnie dostępny dla tego klucza API. Zweryfikuj konfigurację klucza w panelu Settings > Secrets.",
    };
  }

  return {
    status: statusProp && statusProp >= 400 ? statusProp : 500,
    code: "GENERATION_FAILED",
    message: `Nie udało się ukończyć generowania: ${rawMessage}`,
  };
}

interface BriefPayload {
  mode: "culture" | "evp" | "role";
  companyName: string;
  roleTitle?: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  typographyStyle: string;
  workplaceVibe: string;
  customHeadline?: string;
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, imageModel: IMAGE_MODEL, planModel: PLAN_MODEL });
  });

  app.post("/api/campaign/plan", async (req, res) => {
    try {
      const brief = req.body as BriefPayload;
      if (!brief?.companyName?.trim() || !brief?.description?.trim()) {
        return res.status(400).json({
          code: "INVALID_BRIEF",
          message:
            "Podaj nazwę firmy oraz opis kultury, propozycji EVP lub stanowiska.",
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

ZASADY KRYTYCZNE DLA SPÓJNOŚCI WIZUALNEJ (PROMPTÓW OBRAZOWYCH):
1. Wszystkie 3 prompty obrazowe (linkedin, billboard, officeBanner) MUSZĄ być napisane po ANGIELSKU, ale cytowane napisy na kreacjach (nazwa firmy "${brief.companyName.trim()}", hasło główne, powitanie w biurze) MUSZĄ być dokładnie po POLSKU z poprawnymi polskimi znakami.
2. Wszystkie 3 obrazy muszą wyglądać jak jedna, nierozłączna kampania tej samej marki:
   - Dokładnie ta sama paleta kolorów: primary ${brief.primaryColor}, accent ${brief.secondaryColor}, neutralne czyste tła.
   - Dokładnie ten sam styl typografii: ${typoEng}.
   - Ten sam nowoczesny klimat miejsca pracy: ${workplaceEng}.
   - Ten sam styl fotografii: authentic 35mm documentary editorial photography, natural diffused daylight, subtle organic film grain, candid mid-conversation posture, diverse contemporary European/international professionals (varied ages, genders, ethnicities) genuinely collaborating around real work (sketches, laptops, notebooks, coffee) — ABSOLUTELY NO cheesy stock-photo smiles, no staring at the camera, no stiff thumbs-up or artificial pointing at screens.
3. Specyfika 3 mediów:
   - "linkedin": Editorial recruitment campaign graphic (4:3) designed for a LinkedIn feed — candid documentary photo of diverse professionals collaborating in the described workspace, framed cleanly with a structured brand graphic strip/overlay in ${brief.primaryColor} and crisp typography displaying "${brief.companyName.trim()}" and the Polish headline${brief.roleTitle ? ` plus the role "${brief.roleTitle.trim()}"` : ""}.
   - "billboard": Wide architectural street-level photograph (16:9) of a prominent large-format modern urban city billboard mounted on a sleek contemporary building along a sunlit European city boulevard (trees, tram/pedestrians in natural motion). On the billboard sits the exact same cohesive employer-branding campaign creative: ${brief.primaryColor} & ${brief.secondaryColor} layout, bold ${typoEng} displaying "${brief.companyName.trim()}" and the exact Polish headline, paired with the candid team collaboration photograph in the same workspace.
   - "officeBanner": Architectural interior photograph (3:4) of a sunlit modern reception lobby matching ${workplaceEng}, featuring a tall sleek vertical freestanding brushed-aluminum welcome banner. The banner uses the exact same brand visual system (${brief.primaryColor}, ${brief.secondaryColor}, ${typoEng}) displaying "${brief.companyName.trim()}", the Polish welcome message (e.g. "WITAJ W ZESPOLE"), and a candid team collaboration photo, with two diverse colleagues casually walking and talking in the softly blurred lobby background.
4. Post na LinkedIn ("linkedinPost") napisz po polsku: konkretny, ludzki, bez patosu i zbędnych emoji, z 3 krótkimi akapitami, wyraźnym CTA i 4 trafnymi hashtagami.
`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: PLAN_MODEL,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                headline: {
                  type: Type.STRING,
                  description:
                    "Krótkie polskie hasło główne kampanii (3-6 słów), mocne i czytelne na billboardzie.",
                },
                subheadline: {
                  type: Type.STRING,
                  description:
                    "Krótki polski podtytuł wspierający (5-10 słów).",
                },
                welcomeMessage: {
                  type: Type.STRING,
                  description:
                    "Krótkie polskie hasło powitalne na baner w biurze (2-4 słowa, np. 'Witaj w zespole').",
                },
                linkedinPost: {
                  type: Type.STRING,
                  description:
                    "Gotowy do publikacji, autentyczny polski post rekrutacyjny / EB na LinkedIn z podziałem na akapity i 4 hashtagami.",
                },
                brandVoiceSummary: {
                  type: Type.STRING,
                  description:
                    "Zwięzłe 2-zdaniowe podsumowanie kierunku wizualnego i tonu komunikacji po polsku.",
                },
                artDirectionLock: {
                  type: Type.STRING,
                  description:
                    "Concise English Brand Visual DNA specification locking HEX colors, typography, natural documentary photography style, diverse candid casting, and architectural mood.",
                },
                prompts: {
                  type: Type.OBJECT,
                  properties: {
                    linkedin: {
                      type: Type.STRING,
                      description:
                        "Detailed English prompt for Nano-Banana generating the 4:3 LinkedIn recruitment post visual.",
                    },
                    billboard: {
                      type: Type.STRING,
                      description:
                        "Detailed English prompt for Nano-Banana generating the 16:9 urban city billboard photograph.",
                    },
                    officeBanner: {
                      type: Type.STRING,
                      description:
                        "Detailed English prompt for Nano-Banana generating the 3:4 modern office reception welcome banner photograph.",
                    },
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
        })
      );

      const rawText = (response.text ?? "").trim();
      if (!rawText) {
        return res.status(502).json({
          code: "EMPTY_PLAN",
          message: "Model nie zwrócił planu kampanii. Spróbuj ponownie.",
        });
      }

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
      } = req.body as {
        medium: "linkedin" | "billboard" | "officeBanner";
        prompt: string;
        aspectRatio: "4:3" | "16:9" | "3:4" | "1:1";
        artDirectionLock?: string;
        referenceImageBase64?: string;
        referenceMimeType?: string;
        refinementNote?: string;
      };

      if (!prompt?.trim()) {
        return res.status(400).json({
          code: "INVALID_PROMPT",
          message: "Brak opisu wizualnego do wygenerowania obrazu.",
        });
      }

      const ai = createGeminiClient();

      const parts: Array<
        | { text: string }
        | { inlineData: { data: string; mimeType: string } }
      > = [];

      let finalPrompt = prompt.trim();

      if (artDirectionLock?.trim()) {
        finalPrompt += `\n\nSTRICT BRAND VISUAL DNA LOCK: ${artDirectionLock.trim()}`;
      }

      finalPrompt +=
        "\n\nANTI-STOCK REALISM DIRECTIVE: Depict authentic, diverse contemporary professionals genuinely absorbed in collaborative work in a real modern office. Natural unposed expressions, subtle 35mm documentary depth and daylight, zero cheesy posed camera smiles or synthetic stock-photo cliches.";

      if (refinementNote?.trim()) {
        finalPrompt += `\n\nUSER CREATIVE ADJUSTMENT FOR THIS MEDIUM: ${refinementNote.trim()}`;
      }

      if (referenceImageBase64 && referenceMimeType) {
        parts.push({
          inlineData: {
            data: referenceImageBase64,
            mimeType: referenceMimeType,
          },
        });
        finalPrompt =
          `BRAND COHESION REFERENCE: The attached image is the master key visual from the SAME employer branding campaign. You MUST strictly preserve its exact brand color palette, graphic identity, typography style, lighting mood, and modern workplace aesthetic while adapting it seamlessly into the new medium (${medium}) described below. Do NOT copy the exact same framing—create the authentic new physical medium environment while keeping unmistakable brand unity.\n\n` +
          finalPrompt;
      }

      parts.push({ text: finalPrompt });

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: IMAGE_MODEL,
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio || "4:3",
            },
          },
        })
      );

      let imageUrl: string | null = null;
      let mimeType = "image/png";
      let base64Data: string | null = null;
      let modelNote = "";

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data;
          mimeType = part.inlineData.mimeType ?? "image/png";
          imageUrl = `data:${mimeType};base64,${base64Data}`;
        } else if (part.text) {
          modelNote += part.text;
        }
      }

      if (!imageUrl || !base64Data) {
        return res.status(502).json({
          code: "NO_IMAGE_RETURNED",
          message:
            "Model Nano-Banana nie zwrócił obrazu dla tego ujęcia. Spróbuj lekko zmodyfikować opis lub wygenerować ujęcie ponownie.",
        });
      }

      res.json({
        imageUrl,
        base64Data,
        mimeType,
        model: IMAGE_MODEL,
        note: modelNote.trim() || undefined,
      });
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json(formatted);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kreator Marki Pracodawcy działa na http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
