"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveProfileAction } from "@/features/creator-application/actions";
import { failureNotice, fieldError } from "@/features/creator-application/messages";
import type { FailureNotice } from "@/features/creator-application/messages";
import { profileToApi } from "@/features/creator-application/mapping";
import type { PreservedProfile, ProfileForm } from "@/features/creator-application/mapping";
import type { ApplicationOptions } from "@/lib/api/schemas";
import { Field, StepActions, controlClass } from "../apply-ui";

const MAX_NAME = 80;
type Errors = Record<string, string>;

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function ProfileStep({ options, initial, preserved }: { options: ApplicationOptions; initial: ProfileForm; preserved: PreservedProfile }) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileForm>(initial);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false); // set synchronously: state alone cannot stop two submits fired in the same tick
  const [notice, setNotice] = useState<FailureNotice | null>(null);
  const [serverErrors, setServerErrors] = useState<Errors>({});

  const { bioMinLength, bioMaxLength } = options.limits;

  function validate(): Errors {
    const errors: Errors = {};
    // One name is fine — many creators go by a single stage name.
    const name = values.displayName.trim();
    if (name.length < 2) errors.displayName = "Enter your creator name.";
    else if (name.length > MAX_NAME) errors.displayName = `Keep your creator name under ${MAX_NAME} characters.`;
    if (!values.primaryNiche) errors.primaryNiche = "Choose the niche you're known for.";
    if (!values.city) errors.city = "Choose your city.";
    const bio = values.bio.trim().length;
    if (bio < bioMinLength) errors.bio = `Write at least ${bioMinLength} characters so brands get to know you.`;
    else if (bio > bioMaxLength) errors.bio = `Keep it under ${bioMaxLength} characters.`;
    return errors;
  }

  const errors: Errors = attempted ? { ...serverErrors, ...validate() } : serverErrors;
  const set = (key: keyof ProfileForm) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    setServerErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return; // a second click or Enter press while saving must not send a second request
    setAttempted(true);
    setNotice(null);
    if (Object.keys(validate()).length) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const result = await saveProfileAction(profileToApi(values, preserved));
      if (result.ok) {
        router.push("/for-creators/apply/audience");
        return;
      }
      setServerErrors(result.error.kind === "validation" ? result.error.fields : {});
      setNotice(failureNotice(result.error, "/for-creators/apply/profile"));
    } catch {
      setNotice(failureNotice({ kind: "unavailable", requestId: null }, "/for-creators/apply/profile"));
    }
    inFlight.current = false;
    setSaving(false);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary-light text-xl font-bold text-primary" aria-hidden>
          {initialsOf(values.displayName)}
        </span>
        <div>
          <p className="text-sm font-semibold text-heading">Profile photo</p>
          <p className="mt-1 text-xs text-muted">
            Photo upload isn&apos;t available yet, so your profile will show your initials for now. You&apos;ll be able to add a photo later; it
            doesn&apos;t affect your application.
          </p>
        </div>
      </div>

      <Field
        id="apply-displayName"
        label="Creator name"
        hint="Your real name or the name your audience knows you by — one name is fine."
        error={fieldError(errors, "displayName")}
      >
        <input
          id="apply-displayName"
          value={values.displayName}
          onChange={set("displayName")}
          maxLength={MAX_NAME + 20}
          placeholder="e.g. Francis Ngannou or Tenor"
          className={controlClass(Boolean(errors.displayName)) + " h-11"}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="apply-niche" label="Niche" error={fieldError(errors, "primaryNiche")}>
          <select
            id="apply-niche"
            value={values.primaryNiche}
            onChange={set("primaryNiche")}
            className={controlClass(Boolean(errors.primaryNiche)) + " h-11 cursor-pointer"}
          >
            <option value="">Select your niche</option>
            {options.niches.map((niche) => (
              <option key={niche.slug} value={niche.slug}>
                {niche.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="apply-city" label="City" error={fieldError(errors, "city")}>
          <select id="apply-city" value={values.city} onChange={set("city")} className={controlClass(Boolean(errors.city)) + " h-11 cursor-pointer"}>
            <option value="">Select your city</option>
            {options.cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        id="apply-bio"
        label="About you"
        hint={`${values.bio.trim().length} characters — who you are and what your audience loves about you.`}
        error={fieldError(errors, "bio")}
      >
        <textarea
          id="apply-bio"
          rows={4}
          value={values.bio}
          onChange={set("bio")}
          placeholder="e.g. Professional athlete from Douala, known for discipline and resilience…"
          className={controlClass(Boolean(errors.bio)) + " resize-y py-2.5"}
        />
      </Field>

      <StepActions
        submitLabel="Continue →"
        busyLabel="Saving…"
        busy={saving}
        error={notice?.text ?? null}
        {...(notice?.link ? { errorLink: notice.link } : {})}
      />
    </form>
  );
}
