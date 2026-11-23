import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type {
  CampaignBrief,
  CampaignPlan,
  MediaAssetState,
  MediaKind,
} from "../types/campaign";

interface BrandCohesionSheetProps {
  brief: CampaignBrief;
  plan: CampaignPlan;
  assets: Record<MediaKind, MediaAssetState>;
}

export function BrandCohesionSheet({
  brief,
  plan,
  assets,
}: BrandCohesionSheetProps) {
  const [showPrompts, setShowPrompts] = useState(false);

  return (
    <section
      id="ksiega-stylu"
      aria-labelledby="cohesion-heading"
      className="bg-white border border-[#E2E6EC] rounded-xl p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E8ECF2]">
        <div>
          <p className="text-xs font-medium text-[#5B6472] mb-1">
            03. Księga spójności wizualnej
          </p>
          <h2
            id="cohesion-heading"
            className="text-xl font-bold tracking-tight text-[#111318]"
          >
            DNA wizualne kampanii — {brief.companyName || "Twoja marka"}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowPrompts((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline underline-offset-4 whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <span>
            {showPrompts
              ? "Ukryj prompty Nano-Banana"
              : "Pokaż prompty Nano-Banana"}
          </span>
          {showPrompts ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 4-column Brand DNA grid separated cleanly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
        {/* Swatches */}
        <div>
          <p className="text-xs text-[#5B6472] mb-2.5">Paleta kolorów</p>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span
                className="w-8 h-8 rounded-md border border-black/10 shrink-0"
                style={{ backgroundColor: brief.primaryColor }}
              />
              <div>
                <p className="text-xs font-semibold text-[#111318]">
                  Kolor główny
                </p>
                <p className="text-xs font-mono text-[#5B6472] uppercase tabular-nums">
                  {brief.primaryColor}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="w-8 h-8 rounded-md border border-black/10 shrink-0"
                style={{ backgroundColor: brief.secondaryColor }}
              />
              <div>
                <p className="text-xs font-semibold text-[#111318]">
                  Kolor akcentowy
                </p>
                <p className="text-xs font-mono text-[#5B6472] uppercase tabular-nums">
                  {brief.secondaryColor}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Typography & Tone */}
        <div>
          <p className="text-xs text-[#5B6472] mb-2">Typografia i komunikacja</p>
          <p className="text-sm font-bold text-[#111318]">
            {brief.typographyStyle}
          </p>
          <p className="text-xs text-[#5B6472] leading-relaxed mt-1.5">
            {plan.brandVoiceSummary}
          </p>
        </div>

        {/* Workplace Atmosphere */}
        <div>
          <p className="text-xs text-[#5B6472] mb-2">Środowisko pracy</p>
          <p className="text-sm font-bold text-[#111318]">
            {brief.workplaceVibe}
          </p>
          <p className="text-xs text-[#5B6472] leading-relaxed mt-1.5">
            Naturalne światło dzienne, autentyczne detale biurowe i spójna
            architektura na wszystkich 3 nośnikach.
          </p>
        </div>

        {/* Anti-Stock Photography Direction */}
        <div>
          <p className="text-xs text-[#5B6472] mb-2">Kierunek fotografii</p>
          <p className="text-sm font-bold text-[#111318]">
            Dokumentalna 35mm · Bez póz stockowych
          </p>
          <p className="text-xs text-[#5B6472] leading-relaxed mt-1.5">
            Autentyczni, zróżnicowani profesjonaliści uchwyceni w naturalnej
            współpracy przy rzeczywistych projektach.
          </p>
        </div>
      </div>

      {/* Expandable Prompts Drawer */}
      {showPrompts && (
        <div className="mt-6 pt-6 border-t border-[#E8ECF2] space-y-5">
          <div>
            <p className="text-xs font-semibold text-[#111318] mb-1">
              Blokada spójności wizualnej (Art Direction Lock)
            </p>
            <p className="text-xs font-mono text-[#475161] leading-relaxed bg-[#FAFBFD] border border-[#E8ECF2] rounded-lg p-3.5">
              {plan.artDirectionLock}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(["linkedin", "billboard", "officeBanner"] as MediaKind[]).map(
              (kind) => (
                <div
                  key={kind}
                  className="bg-[#FAFBFD] border border-[#E8ECF2] rounded-lg p-3.5"
                >
                  <p className="text-xs font-semibold text-[#111318] mb-1.5">
                    {assets[kind].label} ({assets[kind].aspectRatio})
                  </p>
                  <p className="text-xs text-[#5B6472] leading-relaxed">
                    {assets[kind].prompt}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}
