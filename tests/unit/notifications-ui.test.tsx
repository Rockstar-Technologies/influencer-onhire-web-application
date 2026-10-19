// @vitest-environment jsdom
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NOTIFICATION_ID, notificationView } from "../helpers";
import { RedirectSignal } from "../mocks/next";

const refresh = vi.fn();
const markRead = vi.fn();
const markAll = vi.fn();
const loadNotifications = vi.fn();
const loadUnreadCount = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));
vi.mock("@/features/notifications/actions", () => ({
  markNotificationReadAction: (...a: unknown[]) => markRead(...a),
  markAllNotificationsReadAction: (...a: unknown[]) => markAll(...a),
}));
vi.mock("@/features/notifications/server", async (original) => ({
  ...(await original<typeof import("@/features/notifications/server")>()),
  loadNotifications: (...a: unknown[]) => loadNotifications(...a),
  loadUnreadCount: (...a: unknown[]) => loadUnreadCount(...a),
}));

const { NotificationsPage } = await import("@/features/notifications/notifications-page");
const { NotificationBell } = await import("@/features/notifications/notification-bell");

const page = (items: unknown[], over: Record<string, unknown> = {}) => ({ items, nextCursor: null, unreadOnly: false, unread: items.filter((i) => (i as { readAt: unknown }).readAt === null).length, ...over });
const OTHER = "77777777-7777-4777-8777-777777777777";

beforeEach(() => {
  for (const mock of [refresh, markRead, markAll, loadNotifications, loadUnreadCount]) mock.mockReset();
});

describe("header bell", () => {
  it("links to the person's own notifications and shows the API's unread count", async () => {
    loadUnreadCount.mockResolvedValue(3);
    render(await NotificationBell({ area: "brand" }));
    expect(screen.getByRole("link", { name: "Notifications, 3 unread" })).toHaveAttribute("href", "/brand/notifications");
    expect(screen.getByTestId("unread-badge")).toHaveTextContent("3");
  });

  it("goes to the creator's page for a creator, caps the badge at 99+, and shows no badge for zero", async () => {
    loadUnreadCount.mockResolvedValue(250);
    const { unmount } = render(await NotificationBell({ area: "creator" }));
    expect(screen.getByRole("link")).toHaveAttribute("href", "/creator/notifications");
    expect(screen.getByTestId("unread-badge")).toHaveTextContent("99+");
    unmount();
    loadUnreadCount.mockResolvedValue(0);
    render(await NotificationBell({ area: "creator" }));
    expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument();
  });

  it("when the count can't be loaded the link stays and no number is invented", async () => {
    loadUnreadCount.mockResolvedValue(null);
    render(await NotificationBell({ area: "brand" }));
    expect(screen.getByRole("link", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument();
  });
});

describe("notifications page", () => {
  it("shows the API's title, body, kind and read state, and says it is in-app only", async () => {
    loadNotifications.mockResolvedValue(page([notificationView(), notificationView({ id: OTHER, type: "payment_released", title: "Payment released", body: "Your payment was released.", readAt: "2026-10-19T10:00:00.000Z", links: { campaignId: null, offerId: null, paymentId: "x".padStart(36, "0"), withdrawalId: null } })]));
    render(await NotificationsPage({ area: "creator" }));
    expect(loadNotifications).toHaveBeenCalledWith("creator", {});
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("New hire request");
    expect(items[0]).toHaveTextContent("Hire request");
    expect(items[0]).toHaveTextContent("New");
    expect(within(items[0]!).getByRole("link", { name: "View requests" })).toHaveAttribute("href", "/creator/requests");
    expect(within(items[0]!).getByRole("button", { name: "Mark as read" })).toBeInTheDocument();
    expect(items[1]).toHaveTextContent("Your payment was released.");
    expect(within(items[1]!).queryByRole("button", { name: "Mark as read" })).not.toBeInTheDocument();
    expect(within(items[1]!).getByRole("link", { name: "View payments" })).toHaveAttribute("href", "/creator/payments");
    expect(screen.getByText(/nothing is sent by e-mail or SMS/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeInTheDocument();
  });

  it("an unknown kind is shown neutrally with its own text", async () => {
    loadNotifications.mockResolvedValue(page([notificationView({ type: "brand_new_kind", title: "Something new", body: "Details.", links: { campaignId: null, offerId: null, paymentId: null, withdrawalId: null } })]));
    render(await NotificationsPage({ area: "brand" }));
    expect(screen.getByText("Notification")).toBeInTheDocument();
    expect(screen.getByText("Something new")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /View/ })).not.toBeInTheDocument();
  });

  it("filters to unread, pages by cursor, and shows honest empty states", async () => {
    loadNotifications.mockResolvedValue(page([notificationView()], { nextCursor: "abc", unreadOnly: true }));
    const { unmount } = render(await NotificationsPage({ area: "brand", unread: true }));
    expect(loadNotifications).toHaveBeenCalledWith("brand", { unread: true });
    expect(screen.getByRole("link", { name: /Unread/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Show more" })).toHaveAttribute("href", "/brand/notifications?unread=true&cursor=abc");
    unmount();
    loadNotifications.mockResolvedValue(page([], { unreadOnly: true }));
    const second = render(await NotificationsPage({ area: "brand", unread: true }));
    expect(screen.getByText("You have no unread notifications.")).toBeInTheDocument();
    second.unmount();
    loadNotifications.mockResolvedValue(page([]));
    render(await NotificationsPage({ area: "brand" }));
    expect(screen.getByText("You have no notifications yet.")).toBeInTheDocument();
  });

  it("with everything read there is no 'Mark all as read' button", async () => {
    loadNotifications.mockResolvedValue(page([notificationView({ readAt: "2026-10-19T10:00:00.000Z" })]));
    render(await NotificationsPage({ area: "brand" }));
    expect(screen.queryByRole("button", { name: "Mark all as read" })).not.toBeInTheDocument();
  });

  it("marking one read sends its id, then refreshes to what the API holds", async () => {
    loadNotifications.mockResolvedValue(page([notificationView()]));
    markRead.mockResolvedValue({ ok: true, notification: notificationView({ readAt: "2026-10-19T12:00:00.000Z" }) });
    const user = userEvent.setup();
    render(await NotificationsPage({ area: "brand" }));
    await user.click(screen.getByRole("button", { name: "Mark as read" }));
    await waitFor(() => expect(markRead).toHaveBeenCalledWith({ id: NOTIFICATION_ID }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("marking all read refreshes only after the API confirmed", async () => {
    loadNotifications.mockResolvedValue(page([notificationView(), notificationView({ id: OTHER })]));
    markAll.mockResolvedValue({ ok: true, updated: 2 });
    const user = userEvent.setup();
    render(await NotificationsPage({ area: "brand" }));
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    await waitFor(() => expect(markAll).toHaveBeenCalledWith({}));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("a refused change shows nothing as read and says nothing was changed", async () => {
    loadNotifications.mockResolvedValue(page([notificationView()]));
    markRead.mockResolvedValue({ ok: false, error: { kind: "unavailable", requestId: "req-1" } });
    const user = userEvent.setup();
    render(await NotificationsPage({ area: "brand" }));
    await user.click(screen.getByRole("button", { name: "Mark as read" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was changed");
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Mark as read" })).toBeEnabled(); // retryable
  });

  it("an ended session offers sign-in with a way back", async () => {
    loadNotifications.mockResolvedValue(page([notificationView()]));
    markAll.mockResolvedValue({ ok: false, error: { kind: "unauthenticated" } });
    const user = userEvent.setup();
    render(await NotificationsPage({ area: "creator" }));
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", "/sign-in?next=%2Fcreator%2Fnotifications&expired=1");
  });

  it("a notification that no longer exists is explained and the page refreshes to the real list", async () => {
    loadNotifications.mockResolvedValue(page([notificationView()]));
    markRead.mockResolvedValue({ ok: false, error: { kind: "not_found" } });
    const user = userEvent.setup();
    render(await NotificationsPage({ area: "brand" }));
    await user.click(screen.getByRole("button", { name: "Mark as read" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't find that notification");
    expect(refresh).toHaveBeenCalled();
  });

  it("a network failure is retryable, and a double click sends one request", async () => {
    loadNotifications.mockResolvedValue(page([notificationView()]));
    let finish: (value: unknown) => void = () => undefined;
    markRead.mockRejectedValueOnce(new Error("network")).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(await NotificationsPage({ area: "brand" }));
    await user.click(screen.getByRole("button", { name: "Mark as read" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was changed");
    await user.dblClick(screen.getByRole("button", { name: "Mark as read" }));
    expect(markRead).toHaveBeenCalledTimes(2);
    finish({ ok: true, notification: notificationView({ readAt: "2026-10-19T12:00:00.000Z" }) });
  });

  it("two clicks in the same instant (before the button is disabled) send one request", async () => {
    loadNotifications.mockResolvedValue(page([notificationView()]));
    markRead.mockReturnValue(new Promise(() => undefined));
    render(await NotificationsPage({ area: "brand" }));
    const button = screen.getByRole("button", { name: "Mark as read" });
    act(() => {
      button.click();
      button.click();
    });
    expect(markRead).toHaveBeenCalledTimes(1);
  });

  it("an API failure while loading is thrown to the error page, not shown as an empty inbox", async () => {
    loadNotifications.mockRejectedValue(new Error("boom"));
    await expect(NotificationsPage({ area: "brand" })).rejects.toThrow("boom");
  });
});
