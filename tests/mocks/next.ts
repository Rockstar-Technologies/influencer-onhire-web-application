/** Minimal fakes for the parts of Next.js the server code touches: cookies(), headers(), redirect() and React's cache(). */
export interface CookieWrite {
  name: string;
  value: string;
  options: Record<string, unknown>;
}

export const nextState = {
  cookies: new Map<string, string>(),
  writes: [] as CookieWrite[],
  deletes: [] as string[],
  headers: new Map<string, string>(),
};

export function resetNextState(): void {
  nextState.cookies.clear();
  nextState.writes.length = 0;
  nextState.deletes.length = 0;
  nextState.headers.clear();
}

export const headersModule = {
  cookies: async () => ({
    get: (name: string) => (nextState.cookies.has(name) ? { name, value: nextState.cookies.get(name) as string } : undefined),
    set: (name: string, value: string, options: Record<string, unknown> = {}) => {
      nextState.writes.push({ name, value, options });
      nextState.cookies.set(name, value);
    },
    delete: (name: string) => {
      nextState.deletes.push(name);
      nextState.cookies.delete(name);
    },
  }),
  headers: async () => ({ get: (name: string) => nextState.headers.get(name.toLowerCase()) ?? null }),
};

export class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super("NEXT_REDIRECT");
  }
}

export const navigationModule = {
  redirect: (url: string): never => {
    throw new RedirectSignal(url);
  },
  notFound: (): never => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ replace: () => undefined, push: () => undefined, refresh: () => undefined }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
};

export async function redirectTarget(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url;
    throw error;
  }
}
