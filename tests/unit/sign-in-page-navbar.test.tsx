// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/access";
import { apiUser } from "../helpers";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/auth/actions", () => ({ signInAction: vi.fn(), signUpAction: vi.fn(), signOutAction: vi.fn() }));

const { SignInPage } = await import("@/features/public/sign-in/sign-in-page");
const { Navbar } = await import("@/components/shared/navbar");

const session = (overrides: Record<string, unknown> = {}): Session => ({ user: apiUser(overrides) as Session["user"], permissions: [], expiresAt: null });

describe("SignInPage", () => {
  it("shows the real email/password form (not an account picker)", () => {
    render(<SignInPage session={null} />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByText(/Pick an account|demo/i)).not.toBeInTheDocument();
  });

  it("tells people their session has ended", () => {
    render(<SignInPage session={null} expired />);
    expect(screen.getByRole("status")).toHaveTextContent("Your session has ended");
  });

  it("when a signed-in user is turned away, explains why and offers their own home and a sign-out", () => {
    render(<SignInPage session={session({ role: "brand" })} denied="admin" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/only for administrators/i);
    expect(screen.getByRole("alert")).toHaveTextContent("Test User");
    expect(screen.getByRole("link", { name: "Go to my account" })).toHaveAttribute("href", "/brand/payments");
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });
});

describe("Navbar", () => {
  it("shows Login (to /sign-in) and Become a Creator to visitors", () => {
    render(<Navbar />);
    expect(screen.getAllByRole("link", { name: "Login" })[0]).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("shows the dashboard link and Sign out instead of Login to a signed-in user", () => {
    render(<Navbar account={{ name: "Test User", homeHref: "/brand/payments", homeLabel: "My dashboard" }} />);
    expect(screen.getAllByRole("link", { name: "My dashboard" })[0]).toHaveAttribute("href", "/brand/payments");
    expect(screen.getAllByRole("button", { name: "Sign out" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });
});
