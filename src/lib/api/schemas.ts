import { z } from "zod";

/** Shapes of the Express API's responses (see backend docs/AUTHENTICATION.md). Unknown extra fields are ignored, not trusted. */
export const userSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  fullName: z.string(),
  phone: z.string().nullable(),
  role: z.enum(["brand", "creator", "admin"]),
  status: z.enum(["pending", "active", "suspended", "rejected"]),
  restricted: z.boolean(),
  createdAt: z.string(),
});
export type ApiUser = z.infer<typeof userSchema>;

export const authUserDataSchema = z.object({ user: userSchema });

export const meDataSchema = z.object({
  user: userSchema,
  permissions: z.array(z.string()).optional(),
  session: z.object({ expiresAt: z.string() }).optional(),
});
export type MeData = z.infer<typeof meDataSchema>;

export const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z
      .array(z.object({ path: z.string(), message: z.string(), code: z.string().optional() }))
      .optional(),
  }),
});

export const emptyDataSchema = z.unknown();
