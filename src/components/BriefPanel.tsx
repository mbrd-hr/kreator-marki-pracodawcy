import type { FormEvent } from "react";
import { Loader2, Wand2 } from "lucide-react";
import {
  BRAND_PALETTES,
  TYPOGRAPHY_STYLES,
  WORKPLACE_VIBES,
} from "../data/presets";
import type { BriefMode, CampaignBrief } from "../types/campaign";

interface BriefPanelProps {
  brief: CampaignBrief;
  onChange: (next: CampaignBrief) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generationStep: string | null;
  companyInputRef?: React.RefObject<HTMLInputElement | null>;
}

const MODE_OPTIONS: Array<{ value: BriefMode; label: string }> = [
  { value: "culture", label: "Kultura firmy" },
  { value: "evp", label: "Propozycja EVP" },
  { value: "role", label: "Stanowisko" },
];

const DESCRIPTION_PLACEHOLDERS: Record<BriefMode, string> = {
  culture:
    "Opisz codzienną kulturę pracy, wartości zespołu, sposób podejmowania decyzji i styl współpracy w firmie...",
  evp: "Opisz propozycję wartości dla pracownika (EVP): unikalne korzyści, rozwój, elastyczność, misję i realny wpływ...",
  role: "Opisz zakres wyzwań na tym stanowisku, zespół, w którym będzie pracować kandydat, oraz kulturę współpracy...",
};

export function BriefPanel({
  brief,
  onChange,
  onGenerate,
  isGenerating,
  generationStep,
  companyInputRef,
}: BriefPanelProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isGenerating) {
      onGenerate();
    }
  };

  const updateField = <K extends keyof CampaignBrief>(
    key: K,
    value: CampaignBrief[K]
  ) => {
    onChange({ ...brief, [key]: value });
  };

  const canSubmit =
    brief.companyName.trim().length > 0 && brief.description.trim().length >= 15;

  return (
    <section
      id="brief"
      aria-labelledby="brief-heading"
      className="bg-white border border-[#E2E6EC] rounded-xl p-6 sm:p-7"
    >
      <div className="mb-6">
        <p className="text-xs font-medium text-[#5B6472] mb-1">
          01. Parametry briefu
        </p>
        <h2
          id="brief-heading"
          className="text-xl font-bold tracking-tight text-[#111318]"
        >
          Opisz markę pracodawcy
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mode Segmented Control */}
        <div>
          <label className="block text-sm font-semibold text-[#111318] mb-2">
            Punkt wyjścia kampanii
          </label>
          <div
            role="tablist"
            aria-label="Tryb briefu"
            className="grid grid-cols-3 gap-1 p-1 bg-[#F1F3F7] rounded-lg"
          >
            {MODE_OPTIONS.map((opt) => {
              const active = brief.mode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => updateField("mode", opt.value)}
                  className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                    active
                      ? "bg-white text-[#111318] shadow-xs font-semibold"
                      : "text-[#5B6472] hover:text-[#111318]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Company Name & Optional Role */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="company-name"
              className="block text-sm font-semibold text-[#111318] mb-1.5"
            >
              Nazwa firmy
            </label>
            <input
              ref={companyInputRef}
              id="company-name"
              type="text"
              required
              value={brief.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              placeholder="np. Nordik Systems"
              className="w-full px-3.5 py-2.5 text-sm text-[#111318] bg-[#FAFBFD] border border-[#D7DCE4] rounded-lg focus:bg-white focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 transition-colors"
            />
          </div>

          {brief.mode === "role" && (
            <div>
              <label
                htmlFor="role-title"
                className="block text-sm font-semibold text-[#111318] mb-1.5"
              >
                Nazwa stanowiska
              </label>
              <input
                id="role-title"
                type="text"
                value={brief.roleTitle}
                onChange={(e) => updateField("roleTitle", e.target.value)}
                placeholder="np. Senior Product Designer"
                className="w-full px-3.5 py-2.5 text-sm text-[#111318] bg-[#FAFBFD] border border-[#D7DCE4] rounded-lg focus:bg-white focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 transition-colors"
              />
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label
                htmlFor="brand-description"
                className="block text-sm font-semibold text-[#111318]"
              >
                {brief.mode === "culture"
                  ? "Opis kultury i wartości"
                  : brief.mode === "evp"
                    ? "Propozycja wartości (EVP)"
                    : "Opis roli i zespołu"}
              </label>
              <span className="text-xs text-[#5B6472] font-mono tabular-nums">
                {brief.description.length} znaków
              </span>
            </div>
            <textarea
              id="brand-description"
              rows={4}
              required
              value={brief.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={DESCRIPTION_PLACEHOLDERS[brief.mode]}
              className="w-full px-3.5 py-2.5 text-sm leading-relaxed text-[#111318] bg-[#FAFBFD] border border-[#D7DCE4] rounded-lg focus:bg-white focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 transition-colors resize-y"
            />
          </div>

          <div>
            <label
              htmlFor="custom-headline"
              className="block text-sm font-semibold text-[#111318] mb-1.5"
            >
              Hasło przewodnie{" "}
              <span className="font-normal text-[#5B6472]">(opcjonalnie)</span>
            </label>
            <input
              id="custom-headline"
              type="text"
              value={brief.customHeadline}
              onChange={(e) => updateField("customHeadline", e.target.value)}
              placeholder="Pozostaw puste, aby wygenerować automatycznie"
              className="w-full px-3.5 py-2.5 text-sm text-[#111318] bg-[#FAFBFD] border border-[#D7DCE4] rounded-lg focus:bg-white focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 transition-colors"
            />
          </div>
        </div>

        <hr className="border-[#E8ECF2]" />

        {/* Brand Visual Identity Controls */}
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-[#5B6472] mb-1">
              02. Spójność wizualna marki
            </p>
            <p className="text-xs text-[#5B6472]">
              Te parametry zostaną zachowane na każdym nośniku kampanii.
            </p>
          </div>

          {/* Brand Color Palette */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[#111318]">
              Paleta kolorów marki
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 px-3 py-2 bg-[#FAFBFD] border border-[#D7DCE4] rounded-lg cursor-pointer hover:border-[#9CA6B8] transition-colors">
                <input
                  type="color"
                  value={brief.primaryColor}
                  onChange={(e) => updateField("primaryColor", e.target.value)}
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer shrink-0"
                  aria-label="Kolor główny marki"
                />
                <div className="min-w-0">
                  <span className="block text-xs text-[#5B6472]">Główny</span>
                  <span className="block text-xs font-mono font-medium text-[#111318] uppercase tabular-nums">
                    {brief.primaryColor}
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 px-3 py-2 bg-[#FAFBFD] border border-[#D7DCE4] rounded-lg cursor-pointer hover:border-[#9CA6B8] transition-colors">
                <input
                  type="color"
                  value={brief.secondaryColor}
                  onChange={(e) =>
                    updateField("secondaryColor", e.target.value)
                  }
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer shrink-0"
                  aria-label="Kolor akcentowy marki"
                />
                <div className="min-w-0">
                  <span className="block text-xs text-[#5B6472]">Akcent</span>
                  <span className="block text-xs font-mono font-medium text-[#111318] uppercase tabular-nums">
                    {brief.secondaryColor}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              {BRAND_PALETTES.map((palette) => {
                const isSelected =
                  brief.primaryColor.toLowerCase() ===
                    palette.primary.toLowerCase() &&
                  brief.secondaryColor.toLowerCase() ===
                    palette.secondary.toLowerCase();
                return (
                  <button
                    key={palette.id}
                    type="button"
                    title={palette.name}
                    aria-label={`Wybierz paletę: ${palette.name}`}
                    onClick={() =>
                      onChange({
                        ...brief,
                        primaryColor: palette.primary,
                        secondaryColor: palette.secondary,
                      })
                    }
                    className={`flex items-center p-1 rounded-md border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#1D4ED8] ring-2 ring-[#1D4ED8]/20 bg-white"
                        : "border-[#E2E6EC] hover:border-[#9CA6B8] bg-[#FAFBFD]"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-l-[3px]"
                      style={{ backgroundColor: palette.primary }}
                    />
                    <span
                      className="w-4 h-4 rounded-r-[3px]"
                      style={{ backgroundColor: palette.secondary }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Typography Style */}
          <div>
            <label
              htmlFor="typography-style"
              className="block text-sm font-semibold text-[#111318] mb-1.5"
            >
              Styl typografii
            </label>
            <select
              id="typography-style"
              value={brief.typographyStyle}
              onChange={(e) => updateField("typographyStyle", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm text-[#111318] bg-[#FAFBFD] border border-[#D7DCE4] rounded-lg focus:bg-white focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 transition-colors cursor-pointer"
            >
              {TYPOGRAPHY_STYLES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-[#5B6472]">
              {
                TYPOGRAPHY_STYLES.find((t) => t.value === brief.typographyStyle)
                  ?.hint
              }
            </p>
          </div>

          {/* Workplace Vibe */}
          <div>
            <label
              htmlFor="workplace-vibe"
              className="block text-sm font-semibold text-[#111318] mb-1.5"
            >
              Klimat miejsca pracy
            </label>
            <select
              id="workplace-vibe"
              value={brief.workplaceVibe}
              onChange={(e) => updateField("workplaceVibe", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm text-[#111318] bg-[#FAFBFD] border border-[#D7DCE4] rounded-lg focus:bg-white focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 transition-colors cursor-pointer"
            >
              {WORKPLACE_VIBES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-[#5B6472]">
              {
                WORKPLACE_VIBES.find((w) => w.value === brief.workplaceVibe)
                  ?.hint
              }
            </p>
          </div>
        </div>

        {/* Primary Submit Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!canSubmit || isGenerating}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] disabled:bg-[#94A3B8] disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">
                  {generationStep || "Generowanie kampanii..."}
                </span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 shrink-0" />
                <span>Generuj kampanię 360°</span>
              </>
            )}
          </button>
          <p className="mt-2.5 text-xs text-[#5B6472] text-center">
            Obrazy powstają w modelu Nano-Banana z blokadą spójności marki.
          </p>
        </div>
      </form>
    </section>
  );
}
