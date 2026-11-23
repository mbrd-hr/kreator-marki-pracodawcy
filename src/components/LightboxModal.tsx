import { useEffect } from "react";
import { Download, X } from "lucide-react";
import type { MediaAssetState } from "../types/campaign";

interface LightboxModalProps {
  asset: MediaAssetState | null;
  companyName: string;
  onClose: () => void;
  onDownload: (asset: MediaAssetState) => void;
}

export function LightboxModal({
  asset,
  companyName,
  onClose,
  onDownload,
}: LightboxModalProps) {
  useEffect(() => {
    if (!asset) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [asset, onClose]);

  if (!asset || !asset.imageUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Podgląd pełnoekranowy: ${asset.label}`}
      className="fixed inset-0 z-50 bg-[#0B0D12]/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-white rounded-xl overflow-hidden shadow-2xl border border-[#2A303C]/20 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#E2E6EC]">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#111318] truncate">
              {asset.label}
            </h3>
            <p className="text-xs text-[#5B6472] mt-0.5 truncate">
              {companyName} · {asset.dimensionsLabel} · {asset.mediumNote}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onDownload(asset)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pobierz obraz</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zamknij podgląd"
              className="p-2 text-[#5B6472] hover:text-[#111318] hover:bg-[#F1F3F7] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#111318] flex items-center justify-center p-4 sm:p-6">
          <img
            src={asset.imageUrl}
            alt={`${companyName} — ${asset.label}`}
            referrerPolicy="no-referrer"
            className="max-h-[68vh] w-auto max-w-full object-contain rounded"
          />
        </div>

        {asset.prompt && (
          <div className="px-6 py-3.5 bg-[#FAFBFD] border-t border-[#E2E6EC]">
            <p className="text-xs font-semibold text-[#111318] mb-1">
              Kierunek wizualny (Nano-Banana)
            </p>
            <p className="text-xs text-[#5B6472] leading-relaxed line-clamp-3">
              {asset.prompt}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
