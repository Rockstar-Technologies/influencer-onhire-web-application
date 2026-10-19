import type { CreatorCampaignEarning, EarningsSummary, WithdrawInput, Withdrawal } from "@/types/earnings";
import type { EscrowStep } from "@/types/payment";
import {
  MIN_WITHDRAWAL,
  MOCK_CREATOR_BALANCE,
  MOCK_CREATOR_CAMPAIGN_EARNINGS,
  MOCK_CREATOR_ESCROW_STEPS,
  MOCK_WITHDRAWALS,
} from "./mock/earnings.mock";

export async function getEarningsSummary(): Promise<EarningsSummary> {
  // TODO: replace with `return fetch("/api/creator/earnings/summary").then(r => r.json())`
  const sum = (status: CreatorCampaignEarning["status"]) =>
    MOCK_CREATOR_CAMPAIGN_EARNINGS.filter((item) => item.status === status).reduce((total, item) => total + item.amount, 0);

  return {
    availableBalance: MOCK_CREATOR_BALANCE.available,
    inEscrow: sum("held"),
    pendingPayout: sum("requested"),
    totalEarned: MOCK_CREATOR_BALANCE.lifetimeEarned,
  };
}

export async function listCreatorCampaignEarnings(): Promise<CreatorCampaignEarning[]> {
  // TODO: replace with `return fetch("/api/creator/earnings/campaigns").then(r => r.json())`
  return MOCK_CREATOR_CAMPAIGN_EARNINGS.map((item) => ({ ...item }));
}

export async function listWithdrawals(): Promise<Withdrawal[]> {
  // TODO: replace with `return fetch("/api/creator/withdrawals").then(r => r.json())`
  return [...MOCK_WITHDRAWALS].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export async function listCreatorEscrowSteps(): Promise<EscrowStep[]> {
  // TODO: replace with `return fetch("/api/escrow/steps?for=creator").then(r => r.json())`
  return MOCK_CREATOR_ESCROW_STEPS;
}

export async function getMinimumWithdrawal(): Promise<number> {
  // TODO: replace with `return fetch("/api/creator/withdrawals/limits").then(r => r.json()).then(l => l.min)`
  return MIN_WITHDRAWAL;
}

export async function requestPayout(earningId: string): Promise<CreatorCampaignEarning> {
  // TODO: replace with `return fetch(`/api/creator/earnings/${earningId}/payout-request`, { method: "POST" }).then(r => r.json())`
  const earning = MOCK_CREATOR_CAMPAIGN_EARNINGS.find((item) => item.id === earningId);
  if (!earning || earning.status !== "held") throw new Error("Payout can't be requested for this campaign");
  earning.status = "requested";
  earning.payoutRequestedAt = new Date().toISOString().slice(0, 10);
  return { ...earning };
}

export async function withdrawFunds(input: WithdrawInput): Promise<Withdrawal> {
  // TODO: replace with `return fetch("/api/creator/withdrawals", { method: "POST", body: JSON.stringify(input) }).then(r => r.json())`
  if (input.amount < MIN_WITHDRAWAL || input.amount > MOCK_CREATOR_BALANCE.available) {
    throw new Error("Invalid withdrawal amount");
  }
  MOCK_CREATOR_BALANCE.available -= input.amount;
  const withdrawal: Withdrawal = {
    id: `wd-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    amount: input.amount,
    method: input.method,
    phone: input.phone,
    status: "processing",
  };
  MOCK_WITHDRAWALS.push(withdrawal);
  return withdrawal;
}
