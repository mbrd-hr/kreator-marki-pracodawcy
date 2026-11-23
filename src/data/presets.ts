import type {
  CampaignBrief,
  CampaignPlan,
  MediaAssetState,
  MediaKind,
} from "../types/campaign";

export interface BrandPalettePreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
}

export const BRAND_PALETTES: BrandPalettePreset[] = [
  {
    id: "nordic-cobalt",
    name: "Skandynawski Kobalt",
    primary: "#1D4ED8",
    secondary: "#D9A441",
  },
  {
    id: "architectural-emerald",
    name: "Architektoniczny Szmaragd",
    primary: "#0F6B54",
    secondary: "#E7DFD1",
  },
  {
    id: "graphite-ochre",
    name: "Grafit i Ciepła Ochra",
    primary: "#1F2937",
    secondary: "#D97706",
  },
  {
    id: "marine-navy",
    name: "Morski Granat",
    primary: "#0F294A",
    secondary: "#38BDF8",
  },
  {
    id: "cinnabar-studio",
    name: "Karmazyn i Piasek",
    primary: "#B91C1C",
    secondary: "#F3EDE2",
  },
];

export const TYPOGRAPHY_STYLES: Array<{
  value: string;
  hint: string;
}> = [
  {
    value: "Nowoczesny Grotesk",
    hint: "Czysta, szwajcarska geometria — technologia i inżynieria",
  },
  {
    value: "Redakcyjny Szeryf",
    hint: "Autorytet i głębia — doradztwo, kultura, badania",
  },
  {
    value: "Techniczny Geometryczny",
    hint: "Precyzyjna siatka modułowa — R&D, produkty cyfrowe",
  },
  {
    value: "Humanistyczny Minimalizm",
    hint: "Otwarty i bliski ludziom — design, zdrowie, edukacja",
  },
];

export const WORKPLACE_VIBES: Array<{
  value: string;
  hint: string;
}> = [
  {
    value: "Studio z drewnem i zielenią",
    hint: "Jasny dąb, szkło, naturalne światło i rośliny",
  },
  {
    value: "Jasne biuro loftowe",
    hint: "Wysokie okna, surowa cegła, przestrzeń warsztatowa",
  },
  {
    value: "Laboratorium R&D ze szkłem",
    hint: "Przeszklone pracownie, prototypy i nowoczesny minimalizm",
  },
  {
    value: "Skandynawski open-space z tarasem",
    hint: "Architektoniczny beton, drewno akustyczne i taras miejski",
  },
];

export interface BriefPreset {
  id: string;
  title: string;
  category: string;
  brief: CampaignBrief;
}

export const BRIEF_PRESETS: BriefPreset[] = [
  {
    id: "nordik-systems",
    title: "Nordik Systems",
    category: "Kultura · CleanTech",
    brief: {
      mode: "culture",
      companyName: "Nordik Systems",
      roleTitle: "",
      description:
        "Projektujemy oprogramowanie sterujące inteligentnymi sieciami energetycznymi i magazynami energii w Europie Północnej i Polsce. Nasza kultura opiera się na realnej sprawczości zespołów interdyscyplinarnych, transparentnej komunikacji bez korporacyjnych warstw oraz spokojnej, głębokiej pracy inżynierskiej w hybrydowym rytmie (2 dni w tygodniu w naszym jasnym biurze w Gdańsku i Warszawie).",
      primaryColor: "#1D4ED8",
      secondaryColor: "#D9A441",
      typographyStyle: "Nowoczesny Grotesk",
      workplaceVibe: "Studio z drewnem i zielenią",
      customHeadline: "Tworzymy energię jutra",
    },
  },
  {
    id: "krakow-biolab",
    title: "Kraków BioLab",
    category: "Propozycja EVP · MedTech",
    brief: {
      mode: "evp",
      companyName: "Kraków BioLab",
      roleTitle: "",
      description:
        "Łączymy diagnostykę molekularną z uczeniem maszynowym, skracając czas wykrywania chorób rzadkich z miesięcy do dni. Nasze EVP: 20% czasu na własne projekty badawcze i publikacje, pełne wsparcie konferencyjne, praca bezpośrednio z klinicystami i biochemikami oraz zróżnicowany międzynarodowy zespół w nowoczesnym centrum R&D w Krakowie.",
      primaryColor: "#0F6B54",
      secondaryColor: "#E7DFD1",
      typographyStyle: "Techniczny Geometryczny",
      workplaceVibe: "Laboratorium R&D ze szkłem",
      customHeadline: "Nauka, która przyspiesza diagnozę",
    },
  },
  {
    id: "atelier-fala",
    title: "Atelier Fala",
    category: "Stanowisko · Product Design",
    brief: {
      mode: "role",
      companyName: "Atelier Fala",
      roleTitle: "Senior Product Designer",
      description:
        "Szukamy Senior Product Designera do zespołu tworzącego europejską platformę do zarządzania mobilnością miejską i transportem publicznym. Będziesz prowadzić badania terenowe z pasażerami, współtworzyć system projektowy razem z inżynierami frontendu i mieć realny wpływ na codzienność milionów mieszkańców miast. Bez mikrozarządzania, z budżetem rozwojowym i pracownią na warszawskim Powiślu.",
      primaryColor: "#1F2937",
      secondaryColor: "#D97706",
      typographyStyle: "Redakcyjny Szeryf",
      workplaceVibe: "Jasne biuro loftowe",
      customHeadline: "Projektuj rytm nowoczesnych miast",
    },
  },
];

export const STARTER_BRIEF: CampaignBrief = BRIEF_PRESETS[0].brief;

export const STARTER_PLAN: CampaignPlan = {
  headline: "Tworzymy energię jutra",
  subheadline: "Dołącz do zespołów budujących czyste sieci energetyczne w Europie.",
  welcomeMessage: "Witaj w zespole",
  linkedinPost: `W Nordik Systems nie tworzymy prezentacji o transformacji energetycznej — piszemy kod, który każdego dnia bilansuje zieloną energię w tysiącach domów i zakładów.

Pracujemy w małych, samodzielnych zespołach, gdzie inżynierowie danych, projektanci systemów i architekci chmury siedzą przy jednym stole. Cenimy spokojne skupienie, szczery feedback i wpływ, który widać w realnych megawatach.

Szukasz miejsca, w którym technologia służy konkretnemu celowi, a współpraca jest naturalna i pozbawiona sztucznej hierarchii? Sprawdź otwarte role w naszych studiach w Gdańsku i Warszawie.

#NordikSystems #EmployerBranding #CleanTechPolska #KarieraWInżynierii`,
  brandVoiceSummary:
    "Spokojny, rzeczowy ton inżynierskiego rzemiosła połączony z nordycką przejrzystością. Dominujący kobalt i ciepłe naturalne drewno budują spójny, rozpoznawalny język marki na każdym nośniku.",
  artDirectionLock:
    "Deep cobalt blue (#1D4ED8) primary brand surfaces paired with warm ochre (#D9A441) highlights, crisp white architectural framing, and natural pale oak wood tones. Bold Swiss neo-grotesque typography with generous spacing. Authentic 35mm documentary photography in sunlit Scandinavian timber-and-glass workspaces, showing diverse contemporary professionals engaged in real collaboration with zero staged stock poses.",
  prompts: {
    linkedin:
      "Authentic 35mm documentary editorial photograph inside a sunlit modern Scandinavian architectural tech office with light oak timber tables, glass partitions, and indoor greenery. Diverse professionals in smart-casual attire genuinely collaborating over architectural sketches and laptops, paired with a crisp deep cobalt blue (#1D4ED8) employer-branding graphic framing.",
    billboard:
      "Wide architectural street-level photograph of a prominent large-format modern urban city billboard mounted along a contemporary European avenue in golden late-afternoon sunlight, displaying the cohesive Nordik Systems employer-branding campaign in deep cobalt blue (#1D4ED8), crisp white grotesque typography reading 'NORDIK SYSTEMS' and 'TWORZYMY ENERGIĘ JUTRA', paired with candid collaborating professionals.",
    officeBanner:
      "Architectural interior photograph of a sunlit modern European tech office reception lobby with pale oak slats, concrete floors, and lush greenery. A tall sleek freestanding vertical welcome banner in deep cobalt blue (#1D4ED8) and crisp white grotesque typography reading 'NORDIK SYSTEMS' and 'WITAJ W ZESPOLE', with candid team collaboration photography and colleagues walking naturally in the background.",
  },
};

export function createStarterAssets(): Record<MediaKind, MediaAssetState> {
  return {
    linkedin: {
      kind: "linkedin",
      label: "Post rekrutacyjny na LinkedIn",
      mediumNote: "Format feed · Media społecznościowe",
      aspectRatio: "4:3",
      dimensionsLabel: "4:3 · Cyfrowy",
      imageUrl: "/src/assets/images/showcase_linkedin_post_1795426564362.jpg",
      status: "ready",
      prompt: STARTER_PLAN.prompts.linkedin,
      isStarterAsset: true,
    },
    billboard: {
      kind: "billboard",
      label: "Billboard miejski",
      mediumNote: "Wielki format OOH · Przestrzeń miejska",
      aspectRatio: "16:9",
      dimensionsLabel: "16:9 · Outdoor",
      imageUrl: "/src/assets/images/showcase_city_billboard_1795426565821.jpg",
      status: "ready",
      prompt: STARTER_PLAN.prompts.billboard,
      isStarterAsset: true,
    },
    officeBanner: {
      kind: "officeBanner",
      label: "Baner powitalny w biurze",
      mediumNote: "Ekspozycja recepcyjna · Onboarding",
      aspectRatio: "3:4",
      dimensionsLabel: "3:4 · Wnętrze",
      imageUrl: "/src/assets/images/showcase_office_banner_1795426565812.jpg",
      status: "ready",
      prompt: STARTER_PLAN.prompts.officeBanner,
      isStarterAsset: true,
    },
  };
}
