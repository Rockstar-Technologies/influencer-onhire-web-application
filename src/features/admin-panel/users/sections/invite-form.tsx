"use client";

import { useActionState } from "react";
import { FiCheckCircle, FiChevronDown } from "react-icons/fi";
import { FieldError, fieldClass, FormLabel } from "@/components/shared/form-field";
import { cn } from "@/lib/utils";
import { TEAM_ROLES, type InviteField, type InviteFormState } from "@/types/user-management";
import { inviteTeamMemberAction } from "../actions";

const INITIAL_STATE: InviteFormState = { status: "idle" };

const ROLE_HINTS: Record<(typeof TEAM_ROLES)[number], string> = {
  "Super Admin": "Full access, including team and payouts.",
  "Campaign Manager": "Approves users and moderates campaigns.",
  Finance: "Manages wallets, escrow and refunds.",
  "Support Agent": "Answers tickets and messages users.",
};

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteTeamMemberAction, INITIAL_STATE);
  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : undefined;
  const describe = (field: InviteField) =>
    errors[field] ? { "aria-invalid": true, "aria-describedby": `invite-${field}-error` } : {};

  return (
    <section id="invite" aria-labelledby="invite-heading" className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 id="invite-heading" className="font-display text-base font-bold text-heading">
        Invite New Admin
      </h2>
      <p className="mt-1 text-sm text-muted">They&apos;ll get an email with a link to set a password.</p>

      {/* The key resets the inputs after each successful invite. */}
      <form key={state.status === "success" ? state.member.id : "form"} action={formAction} noValidate className="mt-5 space-y-4">
        <div>
          <FormLabel htmlFor="invite-name" required>
            Full name
          </FormLabel>
          <input id="invite-name" name="name" maxLength={80} defaultValue={values?.name} placeholder="e.g. Jane Doe" className={cn(fieldClass(!!errors.name), "h-11")} {...describe("name")} />
          <FieldError id="invite-name-error" message={errors.name} />
        </div>
        <div>
          <FormLabel htmlFor="invite-email" required>
            Email address
          </FormLabel>
          <input
            id="invite-email"
            name="email"
            type="email"
            maxLength={120}
            defaultValue={values?.email}
            placeholder="name@company.com"
            className={cn(fieldClass(!!errors.email), "h-11")}
            {...describe("email")}
          />
          <FieldError id="invite-email-error" message={errors.email} />
        </div>
        <div>
          <FormLabel htmlFor="invite-role">Role</FormLabel>
          <div className="relative">
            <select id="invite-role" name="role" defaultValue={values?.role ?? "Support Agent"} className={cn(fieldClass(!!errors.role), "h-11 appearance-none pr-9")} {...describe("role")}>
              {TEAM_ROLES.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <FieldError id="invite-role-error" message={errors.role} />
          <ul className="mt-3 space-y-1.5 rounded-lg bg-surface-alt p-3 text-xs text-body">
            {TEAM_ROLES.map((role) => (
              <li key={role}>
                <span className="font-semibold text-heading">{role}:</span> {ROLE_HINTS[role]}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-hover disabled:cursor-wait disabled:opacity-70"
        >
          {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
          {pending ? "Sending..." : "Send Invite"}
        </button>
        <p aria-live="polite" className="text-xs font-medium text-success-strong">
          {state.status === "success" && (
            <span className="inline-flex items-center gap-1.5">
              <FiCheckCircle aria-hidden />
              Invite sent to {state.member.email}
            </span>
          )}
        </p>
      </form>
    </section>
  );
}
