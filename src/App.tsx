import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, RotateCcw, X } from "lucide-react";
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

    const response = await fetch("/api/campaign/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medium: params.kind,
        prompt: params.prompt,
        aspectRatio: params.aspectRatio,
        artDirectionLock: params.artDirectionLock,
        referenceImageBase64: params.referenceImageBase64 || undefined,
        referenceMimeType: params.referenceMimeType || undefined,
        refinementNote: params.refinementNote || undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg =
        data?.message ||
        "Nie udało się wygenerować obrazu w modelu Nano-Banana.";
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

    setAssets((prev) => ({
      ...prev,
      [params.kind]: {
        ...prev[params.kind],
        imageUrl: data.imageUrl,
        base64Data: data.base64Data,
        mimeType: data.mimeType,
        status: "ready",
        errorMessage: undefined,
        prompt: params.prompt,
        isStarterAsset: false,
      },
    }));

    return {
      imageUrl: data.imageUrl as string,
      base64Data: data.base64Data as string,
      mimeType: data.mimeType as string,
    };
  };

  const handleGenerateCampaign = async () => {
    setGlobalError(null);
    setIsGenerating(true);
    setGenerationStep("1/4 · Opracowywanie strategii i DNA marki...");

    try {
      // Step 1: Plan coherent campaign strategy, Polish copy & locked art-direction prompts
      const planRes = await fetch("/api/campaign/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });
      const planData = await planRes.json().catch(() => ({}));

      if (!planRes.ok || !planData?.plan) {
        throw new Error(
          planData?.message ||
            "Nie udało się przygotować strategii kampanii. Sprawdź klucz API i spróbuj ponownie."
        );
      }

      const nextPlan: CampaignPlan = planData.plan;
      setPlan(nextPlan);
      setIsStarterPreview(false);

      // Save campaign brief & strategy to history
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

      // Mark all 3 media slots as generating
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

      // Step 2: Generate LinkedIn key visual first with Nano-Banana (anchors brand visual cohesion!)
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
        // Record error on LinkedIn card and stop remaining calls if it's an API key/quota error
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

      // Step 3: Generate Urban City Billboard anchored to LinkedIn key visual
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

      // Step 4: Generate Modern Office Welcome Banner anchored to LinkedIn key visual
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

    // If regenerating billboard or officeBanner, pass LinkedIn image as consistency reference if available in memory
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
        {/* Compact Editorial Header */}
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

          {/* Quick Scenario Selector Strip */}
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

        {/* Actionable Error Alert Banner (transparent propagation, zero silent mocks) */}
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

        {/* Primary 2-Column Studio Workspace */}
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

        {/* Curated Scenarios & Saved Drafts */}
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

          {/* Saved User Campaigns History */}
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
