// What the dashboard top bar shows for whoever is signed in.
export interface DashboardAccount {
  id: string;
  name: string;
  initials: string;
  accountLabel: string;
}

export type BrandAccount = DashboardAccount;

export interface CreatorAccount extends DashboardAccount {
  niche: string;
  city: string;
}
