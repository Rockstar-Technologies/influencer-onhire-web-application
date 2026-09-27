"use client";

import { useEffect, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import { fieldClass, FormLabel } from "@/components/shared/form-field";
import { cn } from "@/lib/utils";
import { messageUsersAction } from "../actions";
import { useAdminAction } from "../use-admin-action";
import { ResultMessage } from "./result-message";

// `recipients` null means closed; the dialog opens whenever a list is passed in.
export function MessageDialog({
  recipients,
  onClose,
  onSent,
}: {
  recipients: { id: string; name: string }[] | null;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { pending, result, run, clear } = useAdminAction();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (recipients && !dialog.open) dialog.showModal();
    if (!recipients && dialog.open) dialog.close();
  }, [recipients]);

  function close() {
    clear();
    onClose();
  }

  function send() {
    if (!recipients) return;
    run(
      () => messageUsersAction(recipients.map((recipient) => recipient.id), subject, body),
      () => {
        setSubject("");
        setBody("");
        onSent(`Message sent to ${recipients.length === 1 ? recipients[0].name : `${recipients.length} users`}.`);
        close();
      },
    );
  }

  const names = recipients?.map((recipient) => recipient.name) ?? [];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="message-title"
      onClose={close}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-body shadow-xl backdrop:bg-heading/40"
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 id="message-title" className="font-display text-lg font-bold text-heading">
          Send Message
        </h2>
        <button type="button" onClick={close} aria-label="Close" className="rounded-md p-1.5 text-muted hover:bg-surface-alt hover:text-heading">
          <FiX />
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="space-y-5 px-6 py-5"
      >
        <div>
          <p className="mb-2 text-sm font-semibold text-heading">To</p>
          <p className="rounded-md bg-surface-alt px-3 py-2 text-sm text-body">
            {names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`}
          </p>
        </div>
        <div>
          <FormLabel htmlFor="message-subject" required>
            Subject
          </FormLabel>
          <input
            id="message-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={120}
            placeholder="e.g. Action needed on your profile"
            className={cn(fieldClass(false), "h-11")}
          />
        </div>
        <div>
          <FormLabel htmlFor="message-body" required>
            Message
          </FormLabel>
          <textarea
            id="message-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Write your message..."
            className={cn(fieldClass(false), "resize-y py-3")}
          />
          <p className="mt-1.5 text-xs text-muted">Delivered as an in-app notification and email.</p>
        </div>

        <ResultMessage result={result?.ok ? null : result} />

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <button type="button" onClick={close} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt">
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-hover disabled:cursor-wait disabled:opacity-70"
          >
            {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
            {pending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
