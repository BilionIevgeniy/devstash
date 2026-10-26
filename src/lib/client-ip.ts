import { isIPv4, isIPv6 } from "node:net";

const IPV6_GROUP_COUNT = 8;
const IPV6_PREFIX_GROUPS = 4;
const IPV4_MAPPED_GROUP = 0xffff;
const BYTE_BITS = 8;
const BYTE_MASK = 0xff;

function parseGroups(part: string | undefined): number[] {
  if (!part) return [];
  const groups = part.split(":");
  const last = groups.at(-1) ?? "";
  if (last.includes(".")) {
    const [a, b, c, d] = last.split(".").map(Number);
    groups.splice(
      -1,
      1,
      ((a << BYTE_BITS) | b).toString(16),
      ((c << BYTE_BITS) | d).toString(16),
    );
  }
  return groups.map((group) => parseInt(group, 16));
}

function expandIpv6(address: string): number[] {
  const [head, tail] = address.split("::");
  const headGroups = parseGroups(head);
  if (tail === undefined) return headGroups;

  const tailGroups = parseGroups(tail);
  const missing = IPV6_GROUP_COUNT - headGroups.length - tailGroups.length;
  return [...headGroups, ...new Array<number>(missing).fill(0), ...tailGroups];
}

// One IPv6 client usually owns a whole /64, so counting single addresses would
// let it dodge every limit by rotating through them. IPv4-mapped addresses are
// plain IPv4 clients.
function normalizeIpv6(address: string): string {
  const groups = expandIpv6(address);
  const isMappedIpv4 =
    groups.slice(0, 5).every((group) => group === 0) &&
    groups[5] === IPV4_MAPPED_GROUP;
  if (isMappedIpv4) {
    const [high, low] = groups.slice(6);
    return [high >> BYTE_BITS, high & BYTE_MASK, low >> BYTE_BITS, low & BYTE_MASK].join(".");
  }

  const prefix = groups.slice(0, IPV6_PREFIX_GROUPS);
  return `${prefix.map((group) => group.toString(16)).join(":")}::/64`;
}

function normalizeIp(value: string): string | null {
  const address = value.trim().split("%")[0];
  if (isIPv4(address)) return address;
  if (isIPv6(address)) return normalizeIpv6(address);
  return null;
}

// Only trustworthy behind a platform that overwrites these headers (Vercel
// does); anywhere else a client can send its own value. Null when the request
// carries no usable address.
export function getClientIp(headers: Pick<Headers, "get">): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0];
  const candidate = headers.get("x-real-ip") || forwarded;
  return candidate ? normalizeIp(candidate) : null;
}
