import { isIP } from "node:net";

/**
 * Works out the real client address from an `X-Forwarded-For` value, given how many trusted reverse proxies sit in front of this
 * server. Each trusted proxy appends the address of the peer it received the request from, so with N trusted proxies the real
 * client is the Nth entry from the RIGHT. Anything to the left was supplied by the client and is ignored.
 *
 *  - hops = 0: nothing in front of this server is trusted, so the header is attacker-controlled; return null (no address is
 *    forwarded and the API sees this server's own address).
 *  - fewer entries than hops, or an entry that is not an IP address: return null. Failing to a shared address is safe; forwarding a
 *    forged one would let a client dodge the API's per-address login limit.
 *
 * The API must be configured with a matching TRUST_PROXY (a number of hops) to honour the value this application forwards.
 */
export function resolveClientIp(forwardedFor: string | null | undefined, trustedHops: number): string | null {
  if (!forwardedFor || !Number.isInteger(trustedHops) || trustedHops < 1) return null;
  const entries = forwardedFor.split(",").map((part) => part.trim());
  if (entries.length < trustedHops) return null;
  const candidate = entries[entries.length - trustedHops];
  return candidate && isIP(candidate) !== 0 ? candidate : null;
}
