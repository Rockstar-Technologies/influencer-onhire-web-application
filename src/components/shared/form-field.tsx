import type { ReactNode } from "react";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-md border bg-surface px-4 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20";

export function fieldClass(hasError: boolean) {
  return cn(inputClass, hasError ? "border-danger focus:border-danger" : "border-border focus:border-primary");
}

interface FormLabelProps {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
  // Shows a green check, used to confirm a required field is filled in correctly.
  complete?: boolean;
}

export function FormLabel({ htmlFor, children, required, optional, complete }: FormLabelProps) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-center gap-2 text-sm font-semibold text-heading">
      <span>
        {children}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </span>
      {optional && (
        <span className="rounded-full bg-border-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
          Optional
        </span>
      )}
      {complete && <FiCheckCircle className="text-success" aria-label="Completed" />}
    </label>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
      <FiAlertCircle className="shrink-0" />
      {message}
    </p>
  );
}
