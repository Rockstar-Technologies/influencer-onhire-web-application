export interface NavLink {
  label: string;
  href: string;
}

// Real destinations only exist for Home, Browse Influencers, About and Contact (used as a stand-in
// for "Help & Support"). Everything else routes to the generic coming-soon
// page since those features aren't built yet.
export const NAV_LINKS: NavLink[] = [
  { label: "Browse Influencers", href: "//influencers" },
  { label: "Post a Campaign", href: "/campaigns" },
  { label: "For Creators", href: "/for-creators" },
  { label: "For Brands", href: "/coming-soon?title=For+Brands" },
];

export const FOOTER_LINKS: NavLink[] = [
  { label: "About Us", href: "/about" },
  { label: "Post a Campaign", href: "/campaigns" },
  { label: "For Creators", href: "/for-creators" },
  { label: "Payments & Escrow", href: "/brand/payments" },
  { label: "Help & Support", href: "/contact" },
];

export const SOCIAL_LINKS: NavLink[] = [
  { label: "Facebook", href: "/coming-soon?title=Facebook" },
  { label: "Instagram", href: "/coming-soon?title=Instagram" },
  { label: "TikTok", href: "/coming-soon?title=TikTok" },
  { label: "YouTube", href: "/coming-soon?title=YouTube" },
];

export const LEGAL_LINKS: NavLink[] = [
  { label: "Terms", href: "/coming-soon?title=Terms+of+Service" },
  { label: "Privacy", href: "/coming-soon?title=Privacy+Policy" },
  { label: "Escrow Policy", href: "/coming-soon?title=Escrow+Policy" },
];

// Focused, single-task pages (e.g. confirmations) show only the slim legal bar
// instead of the full footer.
export const COMPACT_FOOTER_PATHS: string[] = ["/campaigns/posted", "/campaigns/preview"];

export interface DashboardNavSection {
  label: string;
  links: (NavLink & { icon: "wallet" | "user" | "home" | "message" })[];
}

export const BRAND_DASHBOARD_NAV: DashboardNavSection[] = [
  {
    label: "Brand Account",
    links: [{ label: "Payments & Escrow", href: "/brand/payments", icon: "wallet" }],
  },
  {
    label: "Discover",
    links: [
      { label: "Browse Influencers", href: "/coming-soon?title=Browse+Influencers", icon: "user" },
      { label: "Influencer On Hire Home", href: "/", icon: "home" },
    ],
  },
];

export const CREATOR_DASHBOARD_NAV: DashboardNavSection[] = [
  {
    label: "Creator Account",
    links: [
      { label: "Campaign Requests", href: "/creator/requests", icon: "message" },
      { label: "Earnings & Payouts", href: "/creator/earnings", icon: "wallet" },
    ],
  },
  {
    label: "Discover",
    links: [
      { label: "My Creator Profile", href: "/coming-soon?title=My+Creator+Profile", icon: "user" },
      { label: "Influencer On Hire Home", href: "/", icon: "home" },
    ],
  },
];
