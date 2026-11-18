import { describe, expect, it } from "vitest";

import { parseConsent, serializeConsent } from "@/lib/consent";

describe("consent value", () => {
  it("reads back what it stored", () => {
    expect(parseConsent(serializeConsent("granted"))).toBe("granted");
    expect(parseConsent(serializeConsent("denied"))).toBe("denied");
  });

  it("asks again for no answer, an older banner's answer or anything else", () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("0:granted")).toBeNull();
    expect(parseConsent("granted")).toBeNull();
    expect(parseConsent("1:maybe")).toBeNull();
  });
});
