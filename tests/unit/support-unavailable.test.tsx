// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const { SupportPage } = await import("@/features/admin-panel/support/support-page");

const SRC = path.resolve(__dirname, "../../src");
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("support tickets are honestly unavailable (the API has no support route)", () => {
  it("shows no tickets, counts, filters, table or form, and says nothing is sample data", () => {
    const { container } = render(<SupportPage />);
    expect(screen.getByRole("heading", { name: "Support tickets are not available yet" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Nothing on this page is sample data/);
    expect(container.querySelector("table, form, input, textarea, select, button")).toBeNull();
    expect(container.textContent).not.toMatch(/Open Tickets|Avg\. Response|Resolved This Week|#\d+/);
  });

  it("the mock support and user-messaging code is gone, so no screen can fake a ticket or a message", () => {
    for (const gone of ["services/support.service.ts", "services/mock/support.mock.ts", "services/user-management.service.ts", "services/mock/user-management.mock.ts", "types/support.ts", "types/user-management.ts", "features/admin-panel/support/actions.ts", "features/admin-panel/support/sections"]) {
      expect(existsSync(path.join(SRC, gone)), gone).toBe(false);
    }
    const offenders = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && /Sample data:|nothing here is real|sendUserMessage|createSupportTicket/.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
