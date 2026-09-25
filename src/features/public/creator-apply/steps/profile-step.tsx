"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getCreatorApplicationDraft, saveCreatorBasics } from "@/services/creator-application.service";
import type { CreatorApplicationOptions, CreatorProfileBasics } from "@/types/creator-application";
import { Field, StepActions, controlClass } from "../apply-ui";

const EMPTY: CreatorProfileBasics = { fullName: "", niche: "", city: "", bio: "" };
const MIN_BIO = 40;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

type Errors = Partial<Record<keyof CreatorProfileBasics, string>>;

function validate(values: CreatorProfileBasics): Errors {
  const errors: Errors = {};
  if (values.fullName.trim().split(/\s+/).length < 2) errors.fullName = "Enter your first and last name.";
  if (!values.niche) errors.niche = "Choose the niche you're known for.";
  if (!values.city) errors.city = "Choose your city.";
  if (values.bio.trim().length < MIN_BIO) errors.bio = `Write at least ${MIN_BIO} characters so brands get to know you.`;
  return errors;
}

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

export function ProfileStep({ options }: { options: CreatorApplicationOptions }) {
  const router = useRouter();
  const [values, setValues] = useState<CreatorProfileBasics>(EMPTY);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    getCreatorApplicationDraft().then((draft) => {
      if (draft.basics) setValues(draft.basics);
    });
  }, []);

  const errors = attempted ? validate(values) : {};
  const set = (key: keyof CreatorProfileBasics) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhotoError("Choose an image file (JPG or PNG).");
    if (file.size > MAX_PHOTO_BYTES) return setPhotoError("Choose a photo under 3 MB.");
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => setValues((current) => ({ ...current, photoDataUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(validate(values)).length) return;
    setSaving(true);
    await saveCreatorBasics({ ...values, fullName: values.fullName.trim(), bio: values.bio.trim() });
    router.push("/for-creators/apply/audience");
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        {values.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of an unsaved upload
          <img src={values.photoDataUrl} alt="Your profile photo" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light text-xl font-bold text-primary">
            {initialsOf(values.fullName)}
          </span>
        )}
        <div>
          <label
            htmlFor="apply-photo"
            className="inline-flex cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-semibold text-heading hover:bg-surface-alt"
          >
            {values.photoDataUrl ? "Change photo" : "Upload photo"}
          </label>
          <input id="apply-photo" type="file" accept="image/*" onChange={handlePhoto} className="sr-only" />
          <p className={photoError ? "mt-1.5 text-xs font-medium text-danger" : "mt-1.5 text-xs text-muted"}>
            {photoError ?? "Optional — profiles with a clear photo get more requests."}
          </p>
        </div>
      </div>

      <Field id="apply-fullName" label="Full name" error={errors.fullName}>
        <input id="apply-fullName" value={values.fullName} onChange={set("fullName")} placeholder="e.g. Francis Ngannou" className={controlClass(Boolean(errors.fullName)) + " h-11"} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="apply-niche" label="Niche" error={errors.niche}>
          <select id="apply-niche" value={values.niche} onChange={set("niche")} className={controlClass(Boolean(errors.niche)) + " h-11 cursor-pointer"}>
            <option value="">Select your niche</option>
            {options.niches.map((niche) => (
              <option key={niche}>{niche}</option>
            ))}
          </select>
        </Field>
        <Field id="apply-city" label="City" error={errors.city}>
          <select id="apply-city" value={values.city} onChange={set("city")} className={controlClass(Boolean(errors.city)) + " h-11 cursor-pointer"}>
            <option value="">Select your city</option>
            {options.cities.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        id="apply-bio"
        label="About you"
        hint={`${values.bio.trim().length} characters — who you are and what your audience loves about you.`}
        error={errors.bio}
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

      <StepActions submitLabel="Continue →" busyLabel="Saving…" busy={saving} />
    </form>
  );
}
