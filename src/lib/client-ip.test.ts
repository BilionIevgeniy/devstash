import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/client-ip";

function ipFrom(headers: Record<string, string>): string | null {
  return getClientIp(new Headers(headers));
}

describe("getClientIp: which header wins", () => {
  it("is null when the request carries no address", () => {
    expect(ipFrom({})).toBeNull();
  });

  it("reads x-real-ip", () => {
    expect(ipFrom({ "x-real-ip": "203.0.113.7" })).toBe("203.0.113.7");
  });

  it("reads x-forwarded-for when there is no x-real-ip", () => {
    expect(ipFrom({ "x-forwarded-for": "203.0.113.7" })).toBe("203.0.113.7");
  });

  it("prefers x-real-ip over x-forwarded-for", () => {
    expect(
      ipFrom({ "x-real-ip": "198.51.100.1", "x-forwarded-for": "203.0.113.7" }),
    ).toBe("198.51.100.1");
  });

  it("takes the first address of an x-forwarded-for chain", () => {
    expect(
      ipFrom({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" }),
    ).toBe("203.0.113.7");
  });

  it("falls back to x-forwarded-for when x-real-ip is empty", () => {
    expect(
      ipFrom({ "x-real-ip": "", "x-forwarded-for": "203.0.113.7" }),
    ).toBe("203.0.113.7");
  });

  it("is null when x-forwarded-for is empty", () => {
    expect(ipFrom({ "x-forwarded-for": "" })).toBeNull();
  });

  it("works with any object that has a get method", () => {
    const headers = { get: (name: string) => (name === "x-real-ip" ? "203.0.113.7" : null) };
    expect(getClientIp(headers)).toBe("203.0.113.7");
  });
});

describe("getClientIp: values that are not an address", () => {
  it.each(["not-an-ip", "999.1.1.1", "203.0.113", "1.2.3.4.5", "gggg::1"])(
    "is null for %s",
    (value) => {
      expect(ipFrom({ "x-real-ip": value })).toBeNull();
    },
  );
});

// One IPv6 client usually owns a whole /64, so every address in it has to count
// as the same client or a limit can be dodged by rotating through them.
describe("getClientIp: IPv6", () => {
  it("reduces an address to its /64 prefix", () => {
    expect(ipFrom({ "x-real-ip": "2001:db8:85a3:8d3:1319:8a2e:370:7348" })).toBe(
      "2001:db8:85a3:8d3::/64",
    );
  });

  it("gives every address in one /64 the same result", () => {
    const results = [
      "2001:db8:1:2:aaaa:bbbb:cccc:dddd",
      "2001:db8:1:2::1",
      "2001:db8:1:2:0:0:0:ffff",
    ].map((address) => ipFrom({ "x-real-ip": address }));
    expect(new Set(results)).toEqual(new Set(["2001:db8:1:2::/64"]));
  });

  it("tells two different /64 prefixes apart", () => {
    expect(ipFrom({ "x-real-ip": "2001:db8:1:2::1" })).not.toBe(
      ipFrom({ "x-real-ip": "2001:db8:1:3::1" }),
    );
  });

  it("expands :: at the start, the middle and the end", () => {
    expect(ipFrom({ "x-real-ip": "::1" })).toBe("0:0:0:0::/64");
    expect(ipFrom({ "x-real-ip": "2001:db8::1" })).toBe("2001:db8:0:0::/64");
    expect(ipFrom({ "x-real-ip": "2001:db8::" })).toBe("2001:db8:0:0::/64");
  });

  it("ignores letter case in the address", () => {
    expect(ipFrom({ "x-real-ip": "2001:DB8:1:2::1" })).toBe(
      ipFrom({ "x-real-ip": "2001:db8:1:2::1" }),
    );
  });

  it("drops a zone identifier", () => {
    expect(ipFrom({ "x-real-ip": "fe80::1%eth0" })).toBe("fe80:0:0:0::/64");
  });

  it("reads the first address of a chain", () => {
    expect(
      ipFrom({ "x-forwarded-for": "2001:db8:1:2::1, 203.0.113.7" }),
    ).toBe("2001:db8:1:2::/64");
  });
});

describe("getClientIp: IPv4-mapped IPv6", () => {
  it("treats ::ffff:a.b.c.d as the plain IPv4 client", () => {
    expect(ipFrom({ "x-real-ip": "::ffff:203.0.113.7" })).toBe("203.0.113.7");
  });

  it("treats the hex form as the plain IPv4 client", () => {
    expect(ipFrom({ "x-real-ip": "::ffff:cb00:7107" })).toBe("203.0.113.7");
  });

  it("treats the fully written form as the plain IPv4 client", () => {
    expect(ipFrom({ "x-real-ip": "0:0:0:0:0:ffff:cb00:7107" })).toBe(
      "203.0.113.7",
    );
  });

  it("counts a mapped address and its IPv4 form as one client", () => {
    expect(ipFrom({ "x-real-ip": "::ffff:203.0.113.7" })).toBe(
      ipFrom({ "x-real-ip": "203.0.113.7" }),
    );
  });
});
