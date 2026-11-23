import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  Maximize2,
  RefreshCw,
  Send,
} from "lucide-react";
import type {
  CampaignBrief,
  CampaignPlan,
  MediaAssetState,
  MediaKind,
  StageView,
} from "../types/campaign";
import { MediaImage } from "./MediaImage";

interface CampaignStageProps {
  brief: CampaignBrief;
  plan: CampaignPlan;
  assets: Record<MediaKind, MediaAssetState>;
  activeView: StageView;
  onViewChange: (view: StageView) => void;
  onRegenerateAsset: (kind: MediaKind, refinementNote?: string) => void;
  onInspectAsset: (asset: MediaAssetState) => void;
  onDownloadAsset: (asset: MediaAssetState) => void;
  isStarterPreview: boolean;
}

const VIEW_TABS: Array<{ value: StageView; label: string }> = [
  { value: "overview", label: "Przegląd 360°" },
  { value: "linkedin", label: "Post na LinkedIn" },
  { value: "billboard", label: "Billboard miejski" },
  { value: "officeBanner", label: "Baner w biurze" },
];

export function CampaignStage({
  brief,
  plan,
  assets,
  activeView,
  onViewChange,
  onRegenerateAsset,
  onInspectAsset,
  onDownloadAsset,
  isStarterPreview,
}: CampaignStageProps) {
  const [copiedPost, setCopiedPost] = useState(false);
  const [refinementInputs, setRefinementInputs] = useState<
    Record<MediaKind, string>
  >({
    linkedin: "",
    billboard: "",
    officeBanner: "",
  });

  const handleCopyPost = async () => {
    try {
      await navigator.clipboard.writeText(plan.linkedinPost);
      setCopiedPost(true);
      setTimeout(() => setCopiedPost(false), 2000);
    } catch {
      // Fallback ignored gracefully if clipboard unavailable
    }
  };

  const handleRefineSubmit = (kind: MediaKind) => {
    const note = refinementInputs[kind].trim();
    onRegenerateAsset(kind, note || undefined);
    setRefinementInputs((prev) => ({ ...prev, [kind]: "" }));
  };

  const companyInitials = brief.companyName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || "MP";

  const renderAssetToolbar = (asset: MediaAssetState) => (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-[#111318] truncate">
          {asset.label}
        </h3>
        <p className="text-xs text-[#5B6472] mt-0.5 truncate">
          {asset.dimensionsLabel} · {asset.mediumNote}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {asset.status === "ready" && asset.imageUrl && (
          <>
            <button
              type="button"
              onClick={() => onInspectAsset(asset)}
              title="Powiększ podgląd"
              aria-label={`Powiększ: ${asset.label}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#111318] bg-[#F6F7F9] border border-[#E2E6EC] rounded-md hover:bg-[#EBEEF4] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Powiększ</span>
            </button>
            <button
              type="button"
              onClick={() => onDownloadAsset(asset)}
              title="Pobierz obraz"
              aria-label={`Pobierz: ${asset.label}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#111318] bg-[#F6F7F9] border border-[#E2E6EC] rounded-md hover:bg-[#EBEEF4] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pobierz</span>
            </button>
          </>
        )}
        <button
          type="button"
          disabled={asset.status === "generating"}
          onClick={() => onRegenerateAsset(asset.kind)}
          title="Wygeneruj ponownie w Nano-Banana"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#1D4ED8] bg-[#1D4ED8]/8 border border-[#1D4ED8]/20 rounded-md hover:bg-[#1D4ED8]/14 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              asset.status === "generating" ? "animate-spin" : ""
            }`}
          />
          <span>Nowa wersja</span>
        </button>
      </div>
    </div>
  );

  const renderRefinementBar = (kind: MediaKind, placeholder: string) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleRefineSubmit(kind);
      }}
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-4 mt-4 border-t border-[#E8ECF2]"
    >
      <input
        type="text"
        value={refinementInputs[kind]}
        onChange={(e) =>
          setRefinementInputs((prev) => ({ ...prev, [kind]: e.target.value }))
        }
        placeholder={placeholder}
        className="flex-1 px-3.5 py-2 text-sm text-[#111318] bg-[#FAFBFD] border border-[#D7DCE4] rounded-lg focus:bg-white focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 transition-colors"
      />
      <button
        type="submit"
        disabled={assets[kind].status === "generating"}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#111318] rounded-lg hover:bg-[#242933] disabled:bg-[#94A3B8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Send className="w-3.5 h-3.5" />
        <span>Przelicz ujęcie w Nano-Banana</span>
      </button>
    </form>
  );

  return (
    <section
      id="kampania"
      aria-labelledby="stage-heading"
      className="bg-white border border-[#E2E6EC] rounded-xl p-6 sm:p-7"
    >
      {/* Header & View Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-6 border-b border-[#E8ECF2]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5B6472] mb-1">
            <span>{brief.companyName || "Nowa marka"}</span>
            <span aria-hidden="true">·</span>
            <span>{brief.typographyStyle}</span>
            <span aria-hidden="true">·</span>
            <span>
              {isStarterPreview
                ? "Przykładowa kampania pokazowa"
                : "Kampania wygenerowana w Nano-Banana"}
            </span>
          </div>
          <h2
            id="stage-heading"
            className="text-xl sm:text-2xl font-bold tracking-tight text-[#111318]"
          >
            {plan.headline}
          </h2>
          <p className="text-sm text-[#5B6472] mt-1">{plan.subheadline}</p>
        </div>

        <div
          role="tablist"
          aria-label="Widok nośników kampanii"
          className="inline-flex items-center gap-1 p-1 bg-[#F1F3F7] rounded-lg overflow-x-auto max-w-full shrink-0"
        >
          {VIEW_TABS.map((tab) => {
            const active = activeView === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onViewChange(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? "bg-white text-[#111318] shadow-xs font-semibold"
                    : "text-[#5B6472] hover:text-[#111318]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: 360° OVERVIEW */}
      {activeView === "overview" && (
        <div className="pt-6 space-y-8">
          {/* Primary Wide Focal Anchor: Urban City Billboard */}
          <div>
            <MediaImage
              src={assets.billboard.imageUrl}
              alt={`${brief.companyName} — Billboard miejski`}
              aspectClass="aspect-[16/9]"
              status={assets.billboard.status}
              errorMessage={assets.billboard.errorMessage}
              label={assets.billboard.label}
              primaryColor={brief.primaryColor}
              onRetry={() => onRegenerateAsset("billboard")}
              onClick={
                assets.billboard.imageUrl
                  ? () => onInspectAsset(assets.billboard)
                  : undefined
              }
            />
            {renderAssetToolbar(assets.billboard)}
          </div>

          <hr className="border-[#E8ECF2]" />

          {/* Secondary Asymmetric Split: LinkedIn 4:3 + Office Welcome Banner 3:4 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-7 items-start">
            <div className="md:col-span-7 flex flex-col">
              <MediaImage
                src={assets.linkedin.imageUrl}
                alt={`${brief.companyName} — Post rekrutacyjny na LinkedIn`}
                aspectClass="aspect-[4/3]"
                status={assets.linkedin.status}
                errorMessage={assets.linkedin.errorMessage}
                label={assets.linkedin.label}
                primaryColor={brief.primaryColor}
                onRetry={() => onRegenerateAsset("linkedin")}
                onClick={
                  assets.linkedin.imageUrl
                    ? () => onInspectAsset(assets.linkedin)
                    : undefined
                }
              />
              {renderAssetToolbar(assets.linkedin)}

              {/* Quick Preview of LinkedIn Copy */}
              <div className="mt-5 pt-4 border-t border-[#E8ECF2]">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-semibold text-[#111318]">
                    Proponowana treść posta na LinkedIn
                  </span>
                  <button
                    type="button"
                    onClick={() => onViewChange("linkedin")}
                    className="text-xs font-semibold text-[#1D4ED8] hover:underline underline-offset-4 whitespace-nowrap cursor-pointer"
                  >
                    Otwórz makietę posta
                  </button>
                </div>
                <p className="text-sm text-[#3F4754] leading-relaxed line-clamp-3 whitespace-pre-line">
                  {plan.linkedinPost}
                </p>
              </div>
            </div>

            <div className="md:col-span-5 flex flex-col">
              <MediaImage
                src={assets.officeBanner.imageUrl}
                alt={`${brief.companyName} — Baner powitalny w biurze`}
                aspectClass="aspect-[3/4]"
                status={assets.officeBanner.status}
                errorMessage={assets.officeBanner.errorMessage}
                label={assets.officeBanner.label}
                primaryColor={brief.primaryColor}
                onRetry={() => onRegenerateAsset("officeBanner")}
                onClick={
                  assets.officeBanner.imageUrl
                    ? () => onInspectAsset(assets.officeBanner)
                    : undefined
                }
              />
              {renderAssetToolbar(assets.officeBanner)}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: LINKEDIN POST MOCKUP */}
      {activeView === "linkedin" && (
        <div className="pt-6">
          <div className="max-w-2xl mx-auto border border-[#DDE2EA] rounded-xl bg-[#FAFBFD] overflow-hidden">
            {/* Realistic LinkedIn Post Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 bg-white border-b border-[#E8ECF2]">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0 font-[family-name:var(--font-display)]"
                  style={{ backgroundColor: brief.primaryColor }}
                >
                  {companyInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111318] truncate">
                    {brief.companyName || "Twoja Firma"}
                  </p>
                  <p className="text-xs text-[#5B6472] truncate">
                    {brief.mode === "role" && brief.roleTitle
                      ? `Rekrutacja · ${brief.roleTitle}`
                      : "Marka pracodawcy · Kultura i Kariera"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyPost}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#111318] bg-[#F6F7F9] border border-[#D7DCE4] rounded-md hover:bg-[#EBEEF4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedPost ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#15803D]" />
                    <span>Skopiowano</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopiuj treść</span>
                  </>
                )}
              </button>
            </div>

            {/* Post Body Copy */}
            <div className="px-5 py-4 bg-white text-sm text-[#1F242D] leading-relaxed whitespace-pre-line">
              {plan.linkedinPost}
            </div>

            {/* Post Visual */}
            <div className="px-5 pb-5 bg-white">
              <MediaImage
                src={assets.linkedin.imageUrl}
                alt={`${brief.companyName} — Post rekrutacyjny na LinkedIn`}
                aspectClass="aspect-[4/3]"
                status={assets.linkedin.status}
                errorMessage={assets.linkedin.errorMessage}
                label={assets.linkedin.label}
                primaryColor={brief.primaryColor}
                onRetry={() => onRegenerateAsset("linkedin")}
                onClick={
                  assets.linkedin.imageUrl
                    ? () => onInspectAsset(assets.linkedin)
                    : undefined
                }
              />
              {renderAssetToolbar(assets.linkedin)}
            </div>
          </div>

          {renderRefinementBar(
            "linkedin",
            "Opcjonalna korekta ujęcia, np. 'pokaż zespół przy tablicy warsztatowej z większą ilością światła'..."
          )}
        </div>
      )}

      {/* VIEW 3: URBAN CITY BILLBOARD */}
      {activeView === "billboard" && (
        <div className="pt-6">
          <MediaImage
            src={assets.billboard.imageUrl}
            alt={`${brief.companyName} — Billboard miejski`}
            aspectClass="aspect-[16/9]"
            status={assets.billboard.status}
            errorMessage={assets.billboard.errorMessage}
            label={assets.billboard.label}
            primaryColor={brief.primaryColor}
            onRetry={() => onRegenerateAsset("billboard")}
            onClick={
              assets.billboard.imageUrl
                ? () => onInspectAsset(assets.billboard)
                : undefined
            }
          />
          {renderAssetToolbar(assets.billboard)}

          <div className="mt-5 pt-4 border-t border-[#E8ECF2] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="font-semibold text-[#111318]">Hasło na nośniku</p>
              <p className="text-[#5B6472] mt-1">{plan.headline}</p>
            </div>
            <div>
              <p className="font-semibold text-[#111318]">Zastosowanie OOH</p>
              <p className="text-[#5B6472] mt-1">
                Główne arterie biznesowe, okolice uczelni technicznych i dzielnic
                biurowych.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#111318]">Spójność z kampanią</p>
              <p className="text-[#5B6472] mt-1">
                Powiązane wizualnie z ujęciem LinkedIn poprzez kolor{" "}
                <span className="font-mono uppercase">{brief.primaryColor}</span>{" "}
                i typografię {brief.typographyStyle}.
              </p>
            </div>
          </div>

          {renderRefinementBar(
            "billboard",
            "Opcjonalna korekta ujęcia, np. 'zmień porę dnia na wieczór z podświetleniem billboardu'..."
          )}
        </div>
      )}

      {/* VIEW 4: OFFICE WELCOME BANNER */}
      {activeView === "officeBanner" && (
        <div className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-7 items-start">
            <div className="md:col-span-6">
              <MediaImage
                src={assets.officeBanner.imageUrl}
                alt={`${brief.companyName} — Baner powitalny w biurze`}
                aspectClass="aspect-[3/4]"
                status={assets.officeBanner.status}
                errorMessage={assets.officeBanner.errorMessage}
                label={assets.officeBanner.label}
                primaryColor={brief.primaryColor}
                onRetry={() => onRegenerateAsset("officeBanner")}
                onClick={
                  assets.officeBanner.imageUrl
                    ? () => onInspectAsset(assets.officeBanner)
                    : undefined
                }
              />
            </div>

            <div className="md:col-span-6 flex flex-col justify-between space-y-6">
              <div>
                <p className="text-xs font-medium text-[#5B6472] mb-1">
                  Ekspozycja recepcyjna i onboarding
                </p>
                <h3 className="text-lg font-bold text-[#111318]">
                  {plan.welcomeMessage}
                </h3>
                <p className="text-sm text-[#5B6472] leading-relaxed mt-2">
                  Nowoczesny, wolnostojący baner powitalny zaprojektowany dla
                  strefy wejściowej biura. Wita kandydatów na rozmowach
                  rekrutacyjnych oraz nowe osoby pierwszego dnia pracy,
                  przenosząc język wizualny kampanii z internetu i ulicy prosto
                  do przestrzeni biurowej.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-[#E8ECF2] text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-[#5B6472]">Klimat wnętrza</span>
                  <span className="font-semibold text-[#111318] text-right">
                    {brief.workplaceVibe}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#5B6472]">Styl typografii</span>
                  <span className="font-semibold text-[#111318] text-right">
                    {brief.typographyStyle}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#5B6472]">Format ekspozycji</span>
                  <span className="font-mono text-[#111318] tabular-nums">
                    3:4 · Pionowy 100×200 cm
                  </span>
                </div>
              </div>

              {renderAssetToolbar(assets.officeBanner)}
            </div>
          </div>

          {renderRefinementBar(
            "officeBanner",
            "Opcjonalna korekta ujęcia, np. 'dodaj nowoczesną strefę kawową w tle recepcji'..."
          )}
        </div>
      )}
    </section>
  );
}
