// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const refresh = vi.fn();
const signUpAction = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh, push: vi.fn() }), usePathname: () => "/sign-up", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/auth/actions", () => ({ signUpAction: (...args: unknown[]) => signUpAction(...args), signInAction: vi.fn(), signOutAction: vi.fn() }));

const { SignUpForm } = await import("@/features/public/sign-up/sections/sign-up-form");

async function fillValid(user: ReturnType<typeof userEvent.setup>, accept = true) {
  await user.type(screen.getByLabelText(/business name|full name|your name/i), "Test Brand");
  await user.type(screen.getByLabelText("Email"), "brand@example.com");
  await user.type(screen.getByLabelText(/mobile number/i), "670000001");
  await user.type(screen.getByLabelText("Password"), "Passw0rdtest");
  if (accept) await user.click(screen.getByRole("checkbox"));
}

beforeEach(() => {
  replace.mockReset();
  refresh.mockReset();
  signUpAction.mockReset();
});

describe("SignUpForm", () => {
  it("requires the terms and valid details before calling the server", async () => {
    const user = userEvent.setup();
    render(<SignUpForm minPasswordLength={8} />);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("Please accept the terms to continue.")).toBeInTheDocument();
    expect(signUpAction).not.toHaveBeenCalled();
  });

  it("submits the account type, details and the accepted terms, then goes where the server says", async () => {
    signUpAction.mockResolvedValue({ ok: true, redirectTo: "/campaigns/new" });
    const user = userEvent.setup();
    render(<SignUpForm minPasswordLength={8} />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(signUpAction).toHaveBeenCalledTimes(1));
    expect(signUpAction.mock.calls[0]![0]).toMatchObject({ accountType: "brand", fullName: "Test Brand", email: "brand@example.com", password: "Passw0rdtest", acceptTerms: true });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/campaigns/new"));
    expect(refresh).toHaveBeenCalled();
  });

  it("can register as a creator", async () => {
    signUpAction.mockResolvedValue({ ok: true, redirectTo: "/for-creators/apply/profile" });
    const user = userEvent.setup();
    render(<SignUpForm minPasswordLength={8} />);
    await user.click(screen.getByLabelText(/I'm a Creator/i));
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(signUpAction.mock.calls[0]![0]).toMatchObject({ accountType: "creator" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/for-creators/apply/profile"));
  });

  it("offers a sign-in link on the canonical /sign-in route when the e-mail is already taken", async () => {
    signUpAction.mockResolvedValue({ ok: false, error: { kind: "email_taken" } });
    const user = userEvent.setup();
    render(<SignUpForm minPasswordLength={8} />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    const link = await screen.findByRole("link", { name: /login instead/i });
    expect(link).toHaveAttribute("href", "/sign-in?email=brand%40example.com");
  });

  it.each([
    [{ kind: "rate_limited", retryAfterSeconds: 60 }, /Too many attempts/],
    [{ kind: "validation", fieldErrors: { phone: "must be a 9-digit Cameroon mobile number" } }, /9-digit/],
    [{ kind: "unavailable", requestId: null }, /couldn't reach the service/],
  ])("shows %j", async (error, message) => {
    signUpAction.mockResolvedValue({ ok: false, error });
    const user = userEvent.setup();
    render(<SignUpForm minPasswordLength={8} />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(replace).not.toHaveBeenCalled();
  });

  it("links to /sign-in, not the old /login", () => {
    render(<SignUpForm minPasswordLength={8} />);
    for (const link of screen.getAllByRole("link")) expect(link.getAttribute("href")).not.toBe("/login");
    expect(screen.getAllByRole("link").some((link) => link.getAttribute("href") === "/sign-in")).toBe(true);
  });
});
