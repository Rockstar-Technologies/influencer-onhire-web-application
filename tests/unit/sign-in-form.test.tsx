// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const refresh = vi.fn();
const signInAction = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh, push: vi.fn() }), usePathname: () => "/sign-in", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/auth/actions", () => ({ signInAction: (...args: unknown[]) => signInAction(...args), signUpAction: vi.fn(), signOutAction: vi.fn() }));

const { SignInForm } = await import("@/features/public/sign-in/sections/sign-in-form");

async function fill(email = "me@example.com", password = "Passw0rdtest") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  return user;
}

beforeEach(() => {
  replace.mockReset();
  refresh.mockReset();
  signInAction.mockReset();
});

describe("SignInForm", () => {
  it("validates before calling the server and shows field errors", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);
    await user.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText("Enter the email you signed up with.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(signInAction).not.toHaveBeenCalled();
  });

  it("prefills the e-mail from the link and submits trimmed credentials, 'remember' and the requested page", async () => {
    signInAction.mockResolvedValue({ ok: true, redirectTo: "/campaigns/new" });
    const user = userEvent.setup();
    render(<SignInForm initialEmail="me@example.com" next="/campaigns/new" />);
    expect(screen.getByLabelText("Email")).toHaveValue("me@example.com");
    await user.type(screen.getByLabelText("Password"), "Passw0rdtest");
    await user.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() => expect(signInAction).toHaveBeenCalledWith({ email: "me@example.com", password: "Passw0rdtest", remember: true }, "/campaigns/new"));
  });

  it("navigates to the server-chosen page and refreshes so every server component sees the new session", async () => {
    signInAction.mockResolvedValue({ ok: true, redirectTo: "/brand/payments" });
    render(<SignInForm />);
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/brand/payments"));
    expect(refresh).toHaveBeenCalled();
  });

  it("shows 'Logging in…' and blocks a second submit while the request is running", async () => {
    let finish: (value: unknown) => void = () => undefined;
    signInAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<SignInForm />);
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Login" }));
    const busy = await screen.findByRole("button", { name: "Logging in…" });
    expect(busy).toBeDisabled();
    finish({ ok: false, error: { kind: "invalid_credentials" } });
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Login" })).toBeEnabled();
    expect(signInAction).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ kind: "invalid_credentials" }, /Email or password is incorrect/],
    [{ kind: "rate_limited", retryAfterSeconds: 840 }, /Too many attempts\. Please try again in about 14 minutes/],
    [{ kind: "rate_limited", retryAfterSeconds: null }, /Too many attempts/],
    [{ kind: "account_blocked", message: "This account has been suspended. Please contact support." }, /suspended/],
    [{ kind: "unavailable", requestId: "req-123" }, /couldn't reach the service.*req-123/],
    [{ kind: "unavailable", requestId: null }, /couldn't reach the service/],
  ])("shows a clear message for %j", async (error, message) => {
    signInAction.mockResolvedValue({ ok: false, error });
    render(<SignInForm />);
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(replace).not.toHaveBeenCalled();
  });

  it("falls back to a network-error message if the action itself throws", async () => {
    signInAction.mockRejectedValue(new Error("network down"));
    render(<SignInForm />);
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't reach the service/);
  });

  it("never displays the password in an error message", async () => {
    signInAction.mockResolvedValue({ ok: false, error: { kind: "invalid_credentials" } });
    render(<SignInForm />);
    const user = await fill("me@example.com", "Sup3rSecretPw1");
    await user.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByRole("alert");
    expect(document.body.textContent).not.toContain("Sup3rSecretPw1");
  });
});
