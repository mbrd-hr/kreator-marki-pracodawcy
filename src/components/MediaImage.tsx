import { useState } from "react";
import { AlertCircle, ImageOff, Loader2, RefreshCw } from "lucide-react";

interface MediaImageProps {
  src: string | null;
  alt: string;
  aspectClass: string;
  status: "idle" | "generating" | "ready" | "error";
  errorMessage?: string;
  label: string;
  primaryColor: string;
  onRetry?: () => void;
  onClick?: () => void;
}

export function MediaImage({
  src,
  alt,
  aspectClass,
  status,
  errorMessage,
  label,
  primaryColor,
  onRetry,
  onClick,
}: MediaImageProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  if (status === "generating") {
    return (
      <div
        className={`relative w-full ${aspectClass} rounded-lg overflow-hidden bg-[#EEF1F6] border border-[#E2E6EC] flex flex-col items-center justify-center p-6 text-center`}
      >
        <Loader2 className="w-6 h-6 text-[#1D4ED8] animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#111318]">{label}</p>
        <p className="text-xs text-[#5B6472] mt-1">
          Nano-Banana renderuje spójne ujęcie...
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className={`relative w-full ${aspectClass} rounded-lg overflow-hidden bg-[#FDF2F2] border border-[#F5C2C7] flex flex-col items-center justify-center p-6 text-center`}
      >
        <AlertCircle className="w-6 h-6 text-[#B91C1C] mb-2.5" />
        <p className="text-sm font-semibold text-[#111318] mb-1">
          Nie udało się wygenerować ujęcia
        </p>
        <p className="text-xs text-[#7F1D1D] max-w-md leading-relaxed mb-4">
          {errorMessage || "Wystąpił błąd podczas generowania obrazu."}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#111318] bg-white border border-[#D7DCE4] rounded-lg hover:bg-[#F6F7F9] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Spróbuj ponownie</span>
          </button>
        )}
      </div>
    );
  }

  if (!src || loadFailed) {
    return (
      <div
        className={`relative w-full ${aspectClass} rounded-lg overflow-hidden border border-[#E2E6EC] flex flex-col items-center justify-center p-6 text-center`}
        style={{
          background: `linear-gradient(135deg, ${primaryColor}14 0%, #F1F4F8 100%)`,
        }}
      >
        <ImageOff className="w-6 h-6 text-[#5B6472] mb-2" />
        <p className="text-sm font-semibold text-[#111318]">{label}</p>
        <p className="text-xs text-[#5B6472] mt-1">
          Ujęcie gotowe do wygenerowania po przesłaniu briefu.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`group relative w-full ${aspectClass} rounded-lg overflow-hidden bg-[#E9EDF3] border border-[#E2E6EC] ${
        onClick ? "cursor-zoom-in" : ""
      }`}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setLoadFailed(true)}
        className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.015]"
      />
    </div>
  );
}
