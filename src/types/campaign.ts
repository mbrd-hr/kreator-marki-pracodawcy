export type BriefMode = "culture" | "evp" | "role";

export type MediaKind = "linkedin" | "billboard" | "officeBanner";

export type StageView = "overview" | MediaKind;

export interface CampaignBrief {
  mode: BriefMode;
  companyName: string;
  roleTitle: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  typographyStyle: string;
  workplaceVibe: string;
  customHeadline: string;
}

export interface CampaignPlan {
  headline: string;
  subheadline: string;
  welcomeMessage: string;
  linkedinPost: string;
  brandVoiceSummary: string;
  artDirectionLock: string;
  prompts: Record<MediaKind, string>;
}

export interface MediaAssetState {
  kind: MediaKind;
  label: string;
  mediumNote: string;
  aspectRatio: "4:3" | "16:9" | "3:4";
  dimensionsLabel: string;
  imageUrl: string | null;
  base64Data?: string | null;
  mimeType?: string;
  status: "idle" | "generating" | "ready" | "error";
  errorMessage?: string;
  prompt: string;
  isStarterAsset?: boolean;
}

export interface SavedCampaignSummary {
  id: string;
  createdAt: string;
  brief: CampaignBrief;
  plan: CampaignPlan;
  isStarter?: boolean;
}
