interface TopBarProps {
  onNewCampaign: () => void;
}

export function TopBar({ onNewCampaign }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#F6F7F9]/95 backdrop-blur-sm border-b border-[#E2E6EC]">
      <div className="max-w-[1380px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
        <a
          href="#brief"
          className="font-[family-name:var(--font-display)] text-base sm:text-lg font-bold tracking-tight text-[#111318] whitespace-nowrap shrink-0"
        >
          Kreator Marki Pracodawcy
        </a>

        <nav
          aria-label="Nawigacja główna"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5B6472]"
        >
          <a
            href="#brief"
            className="hover:text-[#111318] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Brief marki
          </a>
          <a
            href="#kampania"
            className="hover:text-[#111318] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Kampania 360°
          </a>
          <a
            href="#ksiega-stylu"
            className="hover:text-[#111318] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Księga stylu
          </a>
          <a
            href="#przyklady"
            className="hover:text-[#111318] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Przykłady
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewCampaign}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            Nowa kampania
          </button>
        </div>
      </div>
    </header>
  );
}
