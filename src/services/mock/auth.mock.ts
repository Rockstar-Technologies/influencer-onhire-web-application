import type { UserAccount } from "@/types/auth";

// Existing accounts, so signing up with one of these emails shows the "already registered" path.
export const MOCK_ACCOUNTS: UserAccount[] = [
  {
    id: "usr-lumiere",
    accountType: "brand",
    fullName: "Lumière Cosmetics",
    email: "hello@lumiere.cm",
    phone: "677 123 456",
    createdAt: "2026-01-12T09:00:00.000Z",
  },
  {
    id: "usr-amara",
    accountType: "creator",
    fullName: "Amara Kilonzo",
    email: "amara@influenceronhire.cm",
    phone: "699 456 789",
    createdAt: "2026-02-03T09:00:00.000Z",
  },
];

export const MIN_PASSWORD_LENGTH = 8;

// Mock-only password store (email -> password) so sign-in works against the demo accounts
// and anyone who signs up in this session. A real backend never exposes passwords like this.
export const MOCK_CREDENTIALS: Record<string, string> = {
  "hello@lumiere.cm": "lumiere2026",
  "amara@influenceronhire.cm": "amara2026",
};
