import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, RotateCcw, X } from "lucide-react";
import { GoogleGenAI, Type } from "@google/genai";
import { BrandCohesionSheet } from "./components/BrandCohesionSheet";
import { BriefPanel } from "./components/BriefPanel";
import { CampaignStage } from "./components/CampaignStage";
import { LightboxModal } from "./components/LightboxModal";
import { TopBar } from "./components/TopBar";
import {
  BRIEF_PRESETS,
  createStarterAssets,
  STARTER_BRIEF,
  STARTER_PLAN,
} from "./data/presets";
import type {
  CampaignBrief,
  CampaignPlan,
  MediaAssetState,
  MediaKind,
  SavedCampaignSummary,
  StageView,
} from "./types/campaign";

const STORAGE_KEY = "kreator_marki_pracodawcy_history_v1";
const PLAN_MODEL = "gemini-3.5-flash-lite";
const IMAGE_MODEL = "gemini-2.5-flash-image";

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

function getGeminiClient(): GoogleGenAI {
  const apiKey = (
    import.meta.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ""
  ).trim();

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "Brak klucza API. Upewnij się, że w ustawieniach Vercel (Environment Variables) dodałaś zmienną VITE_GEMINI_API_KEY lub GEMINI_API_KEY i zrobiłaś Redeploy."
    );
  }
  return new GoogleGenAI({ apiKey });
}

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTemporary =
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("high demand") ||
        msg.includes("429");
      if (!isTemporary || i === retries) throw err;
      await new Promise((r) => setTimeout(r, 2500 * (i + 1)));
    }
  }
  throw new Error("Przekroczono limit ponownych prób połączenia.");
}

function loadSavedHistory(): SavedCampaignSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [brief, setBrief] = useState<CampaignBrief>(STARTER_BRIEF);
  const [plan, setPlan] = useState<CampaignPlan>(STARTER_PLAN);
  const [assets, setAssets] = useState<Record<MediaKind, MediaAssetState>>(() =>
    createStarterAssets()
  );
  const [activeView, setActiveView] = useState<StageView>("overview");
  const [isStarterPreview, setIsStarterPreview] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [inspectedAsset, setInspectedAsset] =
    useState<MediaAssetState | null>(null);
  const [savedCampaigns, setSavedCampaigns] = useState<SavedCampaignSummary[]>(
    () => loadSavedHistory()
  );

  const companyInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCampaigns));
    } catch {
      // Ignore storage quota issues safely
    }
  }, [savedCampaigns]);

  const requestMediumImage = async (params: {
    kind: MediaKind;
    prompt: string;
    aspectRatio: "4:3" | "16:9" | "3:4";
    artDirectionLock: string;
    referenceImageBase64?: string | null;
    referenceMimeType?: string;
    refinementNote?: string;
  }) => {
    setAssets((prev) => ({
      ...prev,
      [params.kind]: {
        ...prev[params.kind],
        status: "generating",
        errorMessage: undefined,
        prompt: params.prompt,
      },
    }));

    try {
      const ai = getGeminiClient();
      const parts: Array<
        { text: string } | { inlineData: { data: string; mimeType: string } }
      > = [];

      let finalPrompt = params.prompt.trim();
      if (params.artDirectionLock?.trim()) {
        finalPrompt += `\n\nSTRICT BRAND VISUAL DNA LOCK: ${params.artDirectionLock.trim()}`;
      }
      finalPrompt +=
        "\n\nANTI-STOCK REALISM DIRECTIVE: Depict authentic, diverse contemporary professionals genuinely absorbed in collaborative work in a real modern office. Natural unposed expressions, subtle 35mm documentary depth and daylight, zero cheesy posed camera smiles.";

      if (params.refinementNote?.trim()) {
        finalPrompt += `\n\nUSER CREATIVE ADJUSTMENT: ${params.refinementNote.trim()}`;
      }

      if (params.referenceImageBase64 && params.referenceMimeType) {
        parts.push({
          inlineData: {
            data: params.referenceImageBase64,
            mimeType: params.referenceMimeType,
          },
        });
        finalPrompt =
          `BRAND COHESION REFERENCE: Preserve the exact brand color palette, graphic identity, typography style, and workplace aesthetic from the attached master visual while adapting it to the new medium (${params.kind}).\n\n` +
          finalPrompt;
      }

      parts.push({ text: finalPrompt });

      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: IMAGE_MODEL,
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: params.aspectRatio || "4:3",
            },
          },
        })
      );

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
        throw new Error(
          "Model obrazowy nie zwrócił grafiki dla tego ujęcia. Spróbuj ponownie."
        );
      }

      setAssets((prev) => ({
        ...prev,
        [params.kind]: {
          ...prev[params.kind],
          imageUrl,
          base64Data,
          mimeType,
          status: "ready",
          errorMessage: undefined,
          prompt: params.prompt,
          isStarterAsset: false,
        },
      }));

      return { imageUrl, base64Data, mimeType };
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : "Nie udało się wygenerować obrazu w modelu AI.";
      setAssets((prev) => ({
        ...prev,
        [params.kind]: {
          ...prev[params.kind],
          status: "error",
          errorMessage: errMsg,
        },
      }));
      throw new Error(errMsg);
    }
  };

  const handleGenerateCampaign = async () => {
    setGlobalError(null);
    setIsGenerating(true);
    setGenerationStep("1/4 · Opracowywanie strategii i DNA marki...");

    try {
      if (!brief?.companyName?.trim() || !brief?.description?.trim()) {
        throw new Error(
          "Podaj nazwę firmy oraz opis kultury, propozycji EVP lub stanowiska."
        );
      }

      const ai = getGeminiClient();
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
1. Wszystkie 3 prompty obrazowe (linkedin, billboard, officeBanner) MUSZĄ być napisane po ANGIELSKU, ale cytowane napisy na kreacjach (nazwa firmy "${brief.companyName.trim()}", hasło główne, powitanie w biurze) MUSZĄ być dokładnie po POLSKU z poprawnymi polskimi znakami.
2. Wszystkie 3 obrazy muszą wyglądać jak jedna kampania tej samej marki: paleta ${brief.primaryColor} i ${brief.secondaryColor}, styl typografii ${typoEng}, klimat ${workplaceEng}, autentyczna fotografia dokumentalna 35mm, naturalne światło dzienne, zróżnicowani profesjonaliści przy prawdziwej pracy, zero sztucznych póz stockowych.
3. Specyfika mediów:
  - "linkedin": Editorial recruitment campaign graphic (4:3) for LinkedIn feed with brand framing in ${brief.primaryColor}, displaying "${brief.companyName.trim()}" and Polish headline.
  - "billboard": Wide architectural street-level photograph (16:9) of a modern urban city billboard along a sunlit European boulevard displaying the cohesive campaign creative.
  - "officeBanner": Architectural interior photograph (3:4) of a sunlit modern reception lobby featuring a tall freestanding welcome banner displaying "${brief.companyName.trim()}" and Polish welcome message.
4. Post na LinkedIn ("linkedinPost") napisz po polsku: konkretny, ludzki, z 3 krótkimi akapitami, wyraźnym CTA i 4 trafnymi hashtagami.
`;

      const planResponse = await callWithRetry(() =>
        ai.models.generateContent({
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
        })
      );

      const rawText = (planResponse.text ?? "").trim();
      if (!rawText) {
        throw new Error("Model nie zwrócił planu kampanii. Spróbuj ponownie.");
      }

      const nextPlan: CampaignPlan = JSON.parse(rawText);
      setPlan(nextPlan);
      setIsStarterPreview(false);

      const record: SavedCampaignSummary = {
        id: `${Date.now()}`,
        createdAt: new Date().toLocaleDateString("pl-PL", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        brief: { ...brief },
        plan: nextPlan,
      };
      setSavedCampaigns((prev) => [record, ...prev].slice(0, 6));

      setAssets((prev) => ({
        linkedin: {
          ...prev.linkedin,
          status: "generating",
          errorMessage: undefined,
          prompt: nextPlan.prompts.linkedin,
        },
        billboard: {
          ...prev.billboard,
          status: "generating",
          errorMessage: undefined,
          prompt: nextPlan.prompts.billboard,
        },
        officeBanner: {
          ...prev.officeBanner,
          status: "generating",
          errorMessage: undefined,
          prompt: nextPlan.prompts.officeBanner,
        },
      }));

      setGenerationStep("2/4 · Nano-Banana: post na LinkedIn...");
      let anchorRef: { base64Data: string; mimeType: string } | null = null;
      try {
        const linkedinResult = await requestMediumImage({
          kind: "linkedin",
          prompt: nextPlan.prompts.linkedin,
          aspectRatio: "4:3",
          artDirectionLock: nextPlan.artDirectionLock,
        });
        anchorRef = {
          base64Data: linkedinResult.base64Data,
          mimeType: linkedinResult.mimeType,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setGlobalError(msg);
        setAssets((prev) => ({
          ...prev,
          billboard: {
            ...prev.billboard,
            status: "error",
            errorMessage: msg,
          },
          officeBanner: {
            ...prev.officeBanner,
            status: "error",
            errorMessage: msg,
          },
        }));
        return;
      }

      setGenerationStep("3/4 · Nano-Banana: billboard miejski...");
      try {
        await requestMediumImage({
          kind: "billboard",
          prompt: nextPlan.prompts.billboard,
          aspectRatio: "16:9",
          artDirectionLock: nextPlan.artDirectionLock,
          referenceImageBase64: anchorRef?.base64Data,
          referenceMimeType: anchorRef?.mimeType,
        });
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : String(err));
      }

      setGenerationStep("4/4 · Nano-Banana: baner powitalny w biurze...");
      try {
        await requestMediumImage({
          kind: "officeBanner",
          prompt: nextPlan.prompts.officeBanner,
          aspectRatio: "3:4",
          artDirectionLock: nextPlan.artDirectionLock,
          referenceImageBase64: anchorRef?.base64Data,
          referenceMimeType: anchorRef?.mimeType,
        });
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : String(err));
      }
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : "Wystąpił nieoczekiwany błąd podczas generowania kampanii."
      );
    } finally {
      setIsGenerating(false);
      setGenerationStep(null);
    }
  };

  const handleRegenerateSingleAsset = async (
    kind: MediaKind,
    refinementNote?: string
  ) => {
    setGlobalError(null);
    const targetAsset = assets[kind];
    const anchorAsset =
      kind !== "linkedin" && assets.linkedin.base64Data
        ? assets.linkedin
        : null;

    try {
      setIsStarterPreview(false);
      await requestMediumImage({
        kind,
        prompt: targetAsset.prompt || plan.prompts[kind],
        aspectRatio: targetAsset.aspectRatio,
        artDirectionLock: plan.artDirectionLock,
        referenceImageBase64: anchorAsset?.base64Data ?? null,
        referenceMimeType: anchorAsset?.mimeType,
        refinementNote,
      });
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : "Nie udało się ponownie wygenerować ujęcia."
      );
    }
  };

  const handleDownloadAsset = (asset: MediaAssetState) => {
    if (!asset.imageUrl) return;
    const safeCompany = (brief.companyName || "kampania")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-");
    const link = document.createElement("a");
    link.href = asset.imageUrl;
    link.download = `${safeCompany}-${asset.kind}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNewCampaign = () => {
    setGlobalError(null);
    setBrief({
      mode: "culture",
      companyName: "",
      roleTitle: "",
      description: "",
      primaryColor: "#1D4ED8",
      secondaryColor: "#D9A441",
      typographyStyle: "Nowoczesny Grotesk",
      workplaceVibe: "Studio z drewnem i zielenią",
      customHeadline: "",
    });
    const briefEl = document.getElementById("brief");
    briefEl?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => companyInputRef.current?.focus(), 250);
  };

  const handleLoadPreset = (presetId: string) => {
    const found = BRIEF_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setGlobalError(null);
    setBrief({ ...found.brief });
    if (presetId === "nordik-systems") {
      setPlan(STARTER_PLAN);
      setAssets(createStarterAssets());
      setIsStarterPreview(true);
    }
    const briefEl = document.getElementById("brief");
    briefEl?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLoadSaved = (saved: SavedCampaignSummary) => {
    setGlobalError(null);
    setBrief({ ...saved.brief });
    setPlan({ ...saved.plan });
    setIsStarterPreview(false);
    setAssets((prev) => ({
      linkedin: {
        ...prev.linkedin,
        prompt: saved.plan.prompts.linkedin,
        imageUrl: null,
        base64Data: null,
        status: "idle",
      },
      billboard: {
        ...prev.billboard,
        prompt: saved.plan.prompts.billboard,
        imageUrl: null,
        base64Data: null,
        status: "idle",
      },
      officeBanner: {
        ...prev.officeBanner,
        prompt: saved.plan.prompts.officeBanner,
        imageUrl: null,
        base64Data: null,
        status: "idle",
      },
    }));
    document.getElementById("brief")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-[#111318]">
      <TopBar onNewCampaign={handleNewCampaign} />

      <main className="flex-1 max-w-[1380px] w-full mx-auto px-6 lg:px-10 py-8 lg:py-10 space-y-10">
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#5B6472] mb-2">
              Studio Employer Brandingu · Post LinkedIn · Billboard miejski ·
              Baner w biurze
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111318] leading-[1.15]">
              Spójna kampania marki pracodawcy na każdym nośniku
            </h1>
            <p className="text-sm sm:text-base text-[#5B6472] mt-3 leading-relaxed">
              Opisz kulturę firmy, propozycję wartości (EVP) lub wybrane
              stanowisko. Narzędzie przełoży brief na jednolitą identyfikację
              wizualną i wygeneruje realistyczne ujęcia w modelu Nano-Banana —
              bez sztucznych póz stockowych.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs text-[#5B6472] mr-1">
              Wczytaj brief:
            </span>
            {BRIEF_PRESETS.map((preset) => {
              const active = brief.companyName === preset.brief.companyName;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleLoadPreset(preset.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-[#111318] text-white border-[#111318]"
                      : "bg-white text-[#111318] border-[#D7DCE4] hover:border-[#9CA6B8]"
                  }`}
                >
                  {preset.title}
                </button>
              );
            })}
          </div>
        </section>

        {globalError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-4 bg-[#FDF2F2] border border-[#F5C2C7] text-[#7F1D1D] rounded-xl px-5 py-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <p className="font-semibold text-[#991B1B]">
                  Komunikat z silnika generowania
                </p>
                <p className="mt-0.5">{globalError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGlobalError(null)}
              aria-label="Zamknij komunikat błędu"
              className="p-1 text-[#991B1B] hover:bg-[#FEE2E2] rounded-md transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-22">
            <BriefPanel
              brief={brief}
              onChange={setBrief}
              onGenerate={handleGenerateCampaign}
              isGenerating={isGenerating}
              generationStep={generationStep}
              companyInputRef={companyInputRef}
            />
          </div>

          <div className="lg:col-span-8 space-y-7">
            <CampaignStage
              brief={brief}
              plan={plan}
              assets={assets}
              activeView={activeView}
              onViewChange={setActiveView}
              onRegenerateAsset={handleRegenerateSingleAsset}
              onInspectAsset={setInspectedAsset}
              onDownloadAsset={handleDownloadAsset}
              isStarterPreview={isStarterPreview}
            />

            <BrandCohesionSheet brief={brief} plan={plan} assets={assets} />
          </div>
        </div>

        <section
          id="przyklady"
          aria-labelledby="examples-heading"
          className="pt-4 border-t border-[#E2E6EC]"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-medium text-[#5B6472] mb-1">
                04. Scenariusze i historia
              </p>
              <h2
                id="examples-heading"
                className="text-xl font-bold tracking-tight text-[#111318]"
              >
                Gotowe punkty wyjścia dla różnych marek
              </h2>
            </div>
            {!isStarterPreview && (
              <button
                type="button"
                onClick={() => handleLoadPreset("nordik-systems")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B6472] hover:text-[#111318] transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Przywróć przykład Nordik Systems</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BRIEF_PRESETS.map((preset) => (
              <article
                key={preset.id}
                className="bg-white border border-[#E2E6EC] rounded-xl p-6 flex flex-col justify-between hover:border-[#B9C3D3] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-xs text-[#5B6472]">{preset.category}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className="w-3.5 h-3.5 rounded-xs border border-black/10"
                        style={{ backgroundColor: preset.brief.primaryColor }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-xs border border-black/10"
                        style={{ backgroundColor: preset.brief.secondaryColor }}
                      />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-[#111318]">
                    {preset.title}
                  </h3>
                  <p className="text-xs font-medium text-[#1D4ED8] mt-1">
                    „{preset.brief.customHeadline}”
                  </p>
                  <p className="text-sm text-[#5B6472] leading-relaxed mt-2.5 line-clamp-3">
                    {preset.brief.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#E8ECF2] flex items-center justify-between gap-2">
                  <span className="text-xs text-[#5B6472] truncate">
                    {preset.brief.typographyStyle}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset(preset.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#111318] hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Użyj briefu</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>

          {savedCampaigns.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[#E2E6EC]">
              <h3 className="text-sm font-bold text-[#111318] mb-3">
                Ostatnio utworzone strategie ({savedCampaigns.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedCampaigns.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleLoadSaved(item)}
                    className="text-left bg-white border border-[#E2E6EC] rounded-lg px-4 py-3.5 hover:border-[#1D4ED8] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#111318] truncate">
                        {item.brief.companyName}
                      </span>
                      <span className="text-xs font-mono text-[#5B6472] tabular-nums shrink-0">
                        {item.createdAt}
                      </span>
                    </div>
                    <p className="text-xs text-[#5B6472] mt-1 truncate">
                      {item.plan.headline} · {item.brief.typographyStyle}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-[#E2E6EC] bg-white mt-12">
        <div className="max-w-[1380px] mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5B6472]">
          <p>Kreator Marki Pracodawcy · Spójne kampanie employer brandingowe</p>
          <p>Post na LinkedIn · Billboard miejski · Baner powitalny w biurze</p>
        </div>
      </footer>

      <LightboxModal
        asset={inspectedAsset}
        companyName={brief.companyName || "Kampania"}
        onClose={() => setInspectedAsset(null)}
        onDownload={handleDownloadAsset}
      />
    </div>
  );
}
