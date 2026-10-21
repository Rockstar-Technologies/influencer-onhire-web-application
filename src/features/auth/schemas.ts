import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/rules";

/** Server-side validation of what the browser sends to the auth Server Actions (Server Actions are reachable by direct POST). */
const email = z.string().trim().toLowerCase().min(3).max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address.");

export const signInInputSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX_LENGTH),
  remember: z.boolean().default(false),
});

export const signUpInputSchema = z.object({
  accountType: z.enum(["brand", "creator"]),
  fullName: z.string().trim().min(2, "Enter your name.").max(120),
  email,
  phone: z.string().trim().min(6).max(24),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
    .max(PASSWORD_MAX_LENGTH)
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Mix letters and at least one number."),
  acceptTerms: z.literal(true, { error: "Please accept the terms to continue." }),
});

export type SignInInput = z.input<typeof signInInputSchema>;
export type SignUpInput = z.input<typeof signUpInputSchema>;

export type SignUpAccountType = "brand" | "creator";
