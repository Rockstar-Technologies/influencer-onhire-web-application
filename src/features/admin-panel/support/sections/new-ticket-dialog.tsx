"use client";

import { useActionState, useEffect, useRef } from "react";
import { FiCheckCircle, FiChevronDown, FiPlus, FiX } from "react-icons/fi";
import { FieldError, fieldClass, FormLabel } from "@/components/shared/form-field";
import { cn } from "@/lib/utils";
import type { NewTicketField, NewTicketFormState } from "@/types/support";
import { createTicketAction } from "../actions";

const INITIAL_STATE: NewTicketFormState = { status: "idle" };

export function NewTicketDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(createTicketAction, INITIAL_STATE);

  // Close once the ticket is created; the page revalidates and the table shows it.
  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
  }, [state]);

  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : undefined;
  const describe = (field: NewTicketField) =>
    errors[field] ? { "aria-invalid": true, "aria-describedby": `ticket-${field}-error` } : {};

  return (
    <>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-hover"
        >
          <FiPlus aria-hidden />
          New Ticket
        </button>
        <p aria-live="polite" className="text-xs font-medium text-success-strong">
          {state.status === "success" && (
            <span className="inline-flex items-center gap-1.5">
              <FiCheckCircle aria-hidden />
              Ticket #{state.ticket.number} created
            </span>
          )}
        </p>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="new-ticket-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-body shadow-xl backdrop:bg-heading/40"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="new-ticket-title" className="font-display text-lg font-bold text-heading">
            New Ticket
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted hover:bg-surface-alt hover:text-heading"
          >
            <FiX />
          </button>
        </div>

        <form action={formAction} noValidate className="space-y-5 px-6 py-5">
          <div>
            <FormLabel htmlFor="ticket-subject" required>
              Subject
            </FormLabel>
            <input
              id="ticket-subject"
              name="subject"
              maxLength={120}
              defaultValue={values?.subject}
              placeholder="e.g. Payment not received for campaign"
              className={cn(fieldClass(!!errors.subject), "h-11")}
              {...describe("subject")}
            />
            <FieldError id="ticket-subject-error" message={errors.subject} />
          </div>

          <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
            <div>
              <FormLabel htmlFor="ticket-fromName" required>
                From
              </FormLabel>
              <input
                id="ticket-fromName"
                name="fromName"
                maxLength={80}
                defaultValue={values?.fromName}
                placeholder="Influencer or brand name"
                className={cn(fieldClass(!!errors.fromName), "h-11")}
                {...describe("fromName")}
              />
              <FieldError id="ticket-fromName-error" message={errors.fromName} />
            </div>
            <div>
              <FormLabel htmlFor="ticket-fromRole">Type</FormLabel>
              <div className="relative">
                <select
                  id="ticket-fromRole"
                  name="fromRole"
                  defaultValue={values?.fromRole ?? "influencer"}
                  className={cn(fieldClass(!!errors.fromRole), "h-11 appearance-none pr-9")}
                  {...describe("fromRole")}
                >
                  <option value="influencer">Influencer</option>
                  <option value="brand">Brand</option>
                </select>
                <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              </div>
              <FieldError id="ticket-fromRole-error" message={errors.fromRole} />
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-heading">Priority</legend>
            <div className="flex flex-wrap gap-2">
              {(["urgent", "normal", "low"] as const).map((priority) => (
                <label
                  key={priority}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium capitalize text-heading has-checked:border-navy has-checked:bg-info-light has-focus-visible:ring-2 has-focus-visible:ring-navy/20"
                >
                  <input
                    type="radio"
                    name="priority"
                    value={priority}
                    defaultChecked={(values?.priority ?? "normal") === priority}
                    className="accent-navy"
                  />
                  {priority}
                </label>
              ))}
            </div>
            <FieldError id="ticket-priority-error" message={errors.priority} />
          </fieldset>

          <div>
            <FormLabel htmlFor="ticket-message" required>
              Message
            </FormLabel>
            <textarea
              id="ticket-message"
              name="message"
              rows={4}
              maxLength={2000}
              defaultValue={values?.message}
              placeholder="Describe the issue..."
              className={cn(fieldClass(!!errors.message), "resize-y py-3")}
              {...describe("message")}
            />
            <FieldError id="ticket-message-error" message={errors.message} />
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-hover disabled:cursor-wait disabled:opacity-70"
            >
              {pending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
              )}
              {pending ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
