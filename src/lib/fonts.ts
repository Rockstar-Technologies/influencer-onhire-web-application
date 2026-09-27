import { Inter, Plus_Jakarta_Sans } from "next/font/google";

// Admin panel typography: Plus Jakarta Sans for headings and numbers, Inter for UI text.
// Exposed as CSS variables and mapped to `font-display` / `font-body` in globals.css.
export const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
