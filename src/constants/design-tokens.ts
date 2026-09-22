export interface NavLink {
  label: string;
  href: string;
}

// Real destinations only exist for Home, About and Contact (used as a stand-in
// for "Help & Support"). Everything else routes to the generic coming-soon
// page since those features aren't built yet.
export const NAV_LINKS: NavLink[] = [
  { label: "Browse Influencers", href: "/coming-soon?title=Browse+Influencers" },
  { label: "Post a Campaign", href: "/coming-soon?title=Post+a+Campaign" },
  { label: "For Creators", href: "/coming-soon?title=For+Creators" },
  { label: "For Brands", href: "/coming-soon?title=For+Brands" },
];

export const FOOTER_LINKS: NavLink[] = [
  { label: "About Us", href: "/about" },
  { label: "Post a Campaign", href: "/coming-soon?title=Post+a+Campaign" },
  { label: "For Creators", href: "/coming-soon?title=For+Creators" },
  { label: "Payments & Escrow", href: "/coming-soon?title=Payments+%26+Escrow" },
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
