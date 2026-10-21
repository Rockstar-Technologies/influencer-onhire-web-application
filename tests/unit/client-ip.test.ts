import { describe, expect, it } from "vitest";
import { resolveClientIp } from "@/lib/api/client-ip";

describe("resolveClientIp", () => {
  it("forwards nothing when no proxy is trusted: the header would be attacker-controlled", () => {
    expect(resolveClientIp("203.0.113.9", 0)).toBeNull();
    expect(resolveClientIp("6.6.6.6, 203.0.113.9", 0)).toBeNull();
  });

  it("takes the entry appended by the single trusted proxy (the rightmost)", () => {
    expect(resolveClientIp("203.0.113.9", 1)).toBe("203.0.113.9");
  });

  it("ignores entries a client put to the left of the trusted proxy's entry", () => {
    // client sent "6.6.6.6"; the trusted proxy appended the real peer
    expect(resolveClientIp("6.6.6.6, 203.0.113.9", 1)).toBe("203.0.113.9");
  });

  it("counts N entries from the right for N trusted proxies", () => {
    // forged, client, proxy1 (appended by proxy2)
    expect(resolveClientIp("6.6.6.6, 203.0.113.9, 10.0.0.1", 2)).toBe("203.0.113.9");
    expect(resolveClientIp("203.0.113.9, 10.0.0.1", 2)).toBe("203.0.113.9");
  });

  it("fails closed when there are fewer entries than trusted hops", () => {
    expect(resolveClientIp("203.0.113.9", 2)).toBeNull();
  });

  it("supports IPv6 and refuses anything that is not an IP address", () => {
    expect(resolveClientIp("2001:db8::1", 1)).toBe("2001:db8::1");
    expect(resolveClientIp("not-an-ip", 1)).toBeNull();
    expect(resolveClientIp("203.0.113.9:8080", 1)).toBeNull();
    expect(resolveClientIp("203.0.113.9\r\nX-Evil: 1", 1)).toBeNull();
  });

  it("returns null for missing headers and invalid hop counts", () => {
    expect(resolveClientIp(null, 1)).toBeNull();
    expect(resolveClientIp("", 1)).toBeNull();
    expect(resolveClientIp("203.0.113.9", -1)).toBeNull();
    expect(resolveClientIp("203.0.113.9", 1.5)).toBeNull();
  });
});
