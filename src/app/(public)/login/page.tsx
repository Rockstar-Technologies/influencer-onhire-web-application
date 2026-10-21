import { redirect } from "next/navigation";

type SearchParams = Promise<{ email?: string | string[]; next?: string | string[] }>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Compatibility route: `/login` keeps working and sends people to the canonical `/sign-in`, keeping only `email` and `next`. */
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  const email = first(params.email);
  const next = first(params.next);
  if (email) query.set("email", email.slice(0, 254));
  if (next) query.set("next", next.slice(0, 200)); // re-validated on /sign-in against the user's role
  const text = query.toString();
  redirect(text ? `/sign-in?${text}` : "/sign-in");
}
