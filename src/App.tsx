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

const TYPOGRAPHY_POLISH_MAP: Record<string, string> = {
  "Nowoczesny Grotesk":
    "wyrazista, geometryczna typografia bezszeryfowa w szwajcarskim stylu neogroteskowym, czyste światło między znakami, pewna architektoniczna hierarchia",
  "Redakcyjny Szeryf":
    "szlachetna, kontrastowa nowoczesna typografia szeryfowa w nagłówkach połączona z czytelnym humanistycznym krojem bezszeryfowym",
  "Techniczny Geometryczny":
    "ostry, modułowy geometryczny krój bezszeryfowy oparty na uporządkowanej siatce szwajcarskiej i precyzyjnych odstępach",
  "Humanistyczny Minimalizm":
    "ciepła, przystępna minimalistyczna humanistyczna typografia bezszeryfowa z dużą ilością białej przestrzeni i wysoką czytelnością",
};

const WORKPLACE_POLISH_MAP: Record<string, string> = {
  "Jasne biuro loftowe":
    "jasne, współczesne europejskie biuro w stylu industrialnego loftu z wysokimi oknami w stalowych ramach, ciepłą cegłą, dębowymi stołami i roślinami doniczkowymi",
  "Studio z drewnem i zielenią":
    "jasne studio w stylu skandynawskim z lamelami z jasnego dębu, przeszklonymi salkami spotkań, bujną zielenią i miękkim naturalnym światłem dziennym",
  "Laboratorium R&D ze szkłem":
    "nowoczesne centrum innowacji i R&D z czystymi szklanymi przegrodami, detalami ze szczotkowanego aluminium, minimalistycznymi stanowiskami i naturalnym światłem",
  "Skandynawski open-space z tarasem":
    "przestronne, minimalistyczne nowoczesne biuro otwierające się na zielony miejski taras, naturalne betonowe posadzki, drewniane panele akustyczne i ciepłe popołudniowe światło",
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

  const preparePromptCard = (params: {
    kind: MediaKind;
    prompt: string;
    artDirectionLock: string;
    refinementNote?: string;
  }) => {
    let fullPrompt = params.prompt.trim();
    if (
      params.artDirectionLock?.trim() &&
      !fullPrompt.includes("Spójność wizualna marki:")
    ) {
      fullPrompt += `\n\nSpójność wizualna marki: ${params.artDirectionLock.trim()}`;
    }
    if (params.refinementNote?.trim()) {
      fullPrompt += `\n\nDodatkowa uwaga: ${params.refinementNote.trim()}`;
    }

    setAssets((prev) => ({
      ...prev,
      [params.kind]: {
        ...prev[params.kind],
        imageUrl: null,
        base64Data: null,
        status: "error",
        errorMessage:
          "Darmowy klucz API Google ogranicza automatyczne generowanie obrazów (limit: 0). Gotowy prompt po polsku z pełną identyfikacją wizualną znajduje się w sekcji spójności marki poniżej — skopiuj go i wklej bezpośrednio w czacie Gemini.",
        prompt: fullPrompt,
        isStarterAsset: false,
      },
    }));
  };

  const handleGenerateCampaign = async () => {
    setGlobalError(null);
    setIsGenerating(true);
    setGenerationStep("1/2 · Opracowywanie strategii, haseł i posta...");

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

      const typoDesc =
        TYPOGRAPHY_POLISH_MAP[brief.typographyStyle] ??
        TYPOGRAPHY_POLISH_MAP["Nowoczesny Grotesk"];
      const workplaceDesc =
        WORKPLACE_POLISH_MAP[brief.workplaceVibe] ??
        WORKPLACE_POLISH_MAP["Studio z drewnem i zielenią"];

      const prompt = `
Jesteś dyrektorem kreatywnym i strategiem employer brandingu (EB) w topowym europejskim studiu projektowym.
Przygotuj spójny koncept kampanii employer brandingowej dla polskiej firmy na podstawie briefu:

- Nazwa firmy: ${brief.companyName.trim()}
- Punkt wyjścia: ${modeLabel}
${brief.roleTitle ? `- Stanowisko: ${brief.roleTitle.trim()}` : ""}
- Opis kultury / EVP / stanowiska: ${brief.description.trim()}
- Główny kolor marki (HEX): ${brief.primaryColor}
- Kolor uzupełniający / akcent (HEX): ${brief.secondaryColor}
- Styl typografii: ${brief.typographyStyle} (${typoDesc})
- Klimat miejsca pracy: ${brief.workplaceVibe} (${workplaceDesc})
${brief.customHeadline?.trim() ? `- Preferowane hasło użytkownika (użyj go jako headline): ${brief.customHeadline.trim()}` : "- Brak narzuconego hasła — stwórz krótkie, autentyczne polskie hasło (maks. 5 słów), zero korporacyjnych klisz typu 'dynamiczny zespół'."}

ZASADY KRYTYCZNE DLA CAŁEJ ODPOWIEDZI:
1. Cała odpowiedź — w tym "artDirectionLock" oraz wszystkie 3 prompty obrazowe ("linkedin", "billboard", "officeBanner") — MUSI być napisana w całości po POLSKU, naturalnym, precyzyjnym językiem dyrektora artystycznego, gotowym do skopiowania i wklejenia do generatora obrazów Gemini.
2. Wszystkie 3 obrazy muszą wyglądać jak jedna kampania tej samej marki:
  - Paleta kolorów: kolor główny ${brief.primaryColor}, kolor uzupełniający ${brief.secondaryColor}, jasne neutralne tła.
  - Typografia: ${typoDesc}.
  - Klimat wnętrza: ${workplaceDesc}.
  - Styl fotografii: autentyczna fotografia dokumentalna 35mm, miękkie naturalne światło dzienne, zróżnicowani profesjonaliści pochłonięci prawdziwą współpracą przy laptopach i notatkach — zero sztucznych uśmiechów i póz rodem z banków zdjęć.
3. Specyfika 3 nośników (wszystkie napisy widoczne na kreacjach muszą być po polsku z poprawnymi polskimi znakami):
  - "linkedin": Grafika rekrutacyjna (format 4:3) na LinkedIn z oprawą marki w kolorze ${brief.primaryColor}, wyświetlająca nazwę "${brief.companyName.trim()}" oraz polskie hasło główne${brief.roleTitle ? ` i nazwę stanowiska "${brief.roleTitle.trim()}"` : ""}.
  - "billboard": Szeroki architektoniczny kadr uliczny (format 16:9) przedstawiający nowoczesny wielkoformatowy billboard miejski przy słonecznej europejskiej alei, na którym widnieje ta sama spójna kreacja kampanii z nazwą "${brief.companyName.trim()}" i polskim hasłem głównym.
  - "officeBanner": Architektoniczne zdjęcie wnętrza (format 3:4) jasnej recepcji biurowej w opisanym klimacie, z wolnostojącym pionowym banerem powitalnym w kolorach marki, wyświetlającym nazwę "${brief.companyName.trim()}" oraz polskie hasło powitalne (np. "Witaj w zespole").
4. Post na LinkedIn ("linkedinPost") napisz po polsku: konkretny, ludzki, bez patosu i zbędnych emoji, z 3 krótkimi akapitami, wyraźnym CTA i 4 trafnymi hashtagami.
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
                artDirectionLock: {
                  type: Type.STRING,
                  description:
                    "Zwięzła specyfikacja DNA wizualnego marki po polsku (kolory HEX, typografia, styl fotografii dokumentalnej i klimat biura).",
                },
                prompts: {
                  type: Type.OBJECT,
                  properties: {
                    linkedin: {
                      type: Type.STRING,
                      description:
                        "Szczegółowy prompt po polsku do wygenerowania grafiki rekrutacyjnej 4:3 na LinkedIn.",
                    },
                    billboard: {
                      type: Type.STRING,
                      description:
                        "Szczegółowy prompt po polsku do wygenerowania zdjęcia 16:9 z billboardem miejskim.",
                    },
                    officeBanner: {
                      type: Type.STRING,
                      description:
                        "Szczegółowy prompt po polsku do wygenerowania zdjęcia 3:4 z banerem powitalnym w recepcji biura.",
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

      setGenerationStep("2/2 · Przygotowywanie promptów wizualnych...");

      preparePromptCard({
        kind: "linkedin",
        prompt: nextPlan.prompts.linkedin,
        artDirectionLock: nextPlan.artDirectionLock,
      });

      preparePromptCard({
        kind: "billboard",
        prompt: nextPlan.prompts.billboard,
        artDirectionLock: nextPlan.artDirectionLock,
      });

      preparePromptCard({
        kind: "officeBanner",
        prompt: nextPlan.prompts.officeBanner,
        artDirectionLock: nextPlan.artDirectionLock,
      });
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
    setIsStarterPreview(false);

    preparePromptCard({
      kind,
      prompt: plan.prompts[kind],
      artDirectionLock: plan.artDirectionLock,
      refinementNote,
    });
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
              wizualną, gotowy post na LinkedIn oraz precyzyjne prompty
              graficzne dla każdego kanału.
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
