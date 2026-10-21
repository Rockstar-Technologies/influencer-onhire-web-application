import { z } from "zod";

/** What the browser may send to the notification Server Actions: an id only. Never a user id, a read time or any content. */
export const markReadInputSchema = z.strictObject({ id: z.uuid() });
export const markAllReadInputSchema = z.strictObject({});
