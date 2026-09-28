export interface CampaignDuration {
  value: string;
  label: string;
  days: number;
}

export interface HireRequestInput {
  influencerId: string;
  fullName: string;
  location: string;
  socialHandle?: string;
  promotion?: string;
  paymentMethod: string;
  duration: string;
}

export interface HireRequest extends HireRequestInput {
  id: string;
  reference: string;
  status: "pending";
  createdAt: string;
}

// --- hire form state (shared by the server action and the client form) ---

export type HireFormField = "fullName" | "location" | "socialHandle" | "promotion" | "paymentMethod" | "duration";

export type HireFormValues = Record<HireFormField, string>;

export type HireFormState =
  | { status: "idle"; values: HireFormValues }
  | { status: "error"; values: HireFormValues; errors: Partial<Record<HireFormField, string>>; message: string }
  | { status: "success"; values: HireFormValues; request: HireRequest };
