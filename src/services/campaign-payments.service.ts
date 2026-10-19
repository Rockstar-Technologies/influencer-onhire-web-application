import type {
  CampaignPayment,
  EscrowStep,
  EscrowSummary,
  FundCampaignInput,
  PaymentInfluencer,
} from "@/types/payment";
import { MOCK_CAMPAIGN_PAYMENTS, MOCK_ESCROW_STEPS, MOCK_HIREABLE_INFLUENCERS } from "./mock/campaign-payments.mock";

export async function listCampaignPayments(): Promise<CampaignPayment[]> {
  // TODO: replace with `return fetch("/api/brand/payments").then(r => r.json())`
  return [...MOCK_CAMPAIGN_PAYMENTS].sort((a, b) => b.fundedAt.localeCompare(a.fundedAt));
}

export async function getEscrowSummary(): Promise<EscrowSummary> {
  // TODO: replace with `return fetch("/api/brand/payments/summary").then(r => r.json())`
  const sum = (items: CampaignPayment[]) => items.reduce((total, item) => total + item.amount, 0);
  const byStatus = (status: CampaignPayment["status"]) => MOCK_CAMPAIGN_PAYMENTS.filter((p) => p.status === status);

  return {
    totalFunded: sum(MOCK_CAMPAIGN_PAYMENTS),
    inEscrow: sum(byStatus("held")),
    released: sum(byStatus("released")),
    activeCampaigns: MOCK_CAMPAIGN_PAYMENTS.filter((p) => p.status !== "released").length,
  };
}

export async function listEscrowSteps(): Promise<EscrowStep[]> {
  // TODO: replace with `return fetch("/api/escrow/steps").then(r => r.json())`
  return MOCK_ESCROW_STEPS;
}

export async function listHireableInfluencers(): Promise<PaymentInfluencer[]> {
  // TODO: replace with `return fetch("/api/brand/influencers/hired").then(r => r.json())`
  return MOCK_HIREABLE_INFLUENCERS;
}

export async function fundCampaign(input: FundCampaignInput): Promise<CampaignPayment> {
  // TODO: replace with `return fetch("/api/brand/payments", { method: "POST", body: JSON.stringify(input) }).then(r => r.json())`
  const influencer = MOCK_HIREABLE_INFLUENCERS.find((inf) => inf.id === input.influencerId);
  if (!influencer) throw new Error("Unknown influencer");

  const now = new Date();
  const payment: CampaignPayment = {
    id: `pay-${now.getTime()}`,
    reference: `ESC-${now.getFullYear()}-${now.getTime().toString(36).slice(-4).toUpperCase()}`,
    campaignTitle: input.campaignTitle,
    influencer,
    amount: input.amount,
    method: input.method,
    payerPhone: input.payerPhone,
    fundedAt: now.toISOString().slice(0, 10),
    status: "held",
    deliverables: [],
  };
  MOCK_CAMPAIGN_PAYMENTS.push(payment);
  return payment;
}
