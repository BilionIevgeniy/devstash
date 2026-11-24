import { describe, expect, it } from "vitest";
import { r2BrowserOrigin, r2Endpoint } from "@/lib/vendors/r2-endpoint";

describe("r2Endpoint", () => {
  it("is the account's endpoint when no override is set", () => {
    expect(r2Endpoint("account", undefined)).toEqual({
      endpoint: "https://account.r2.cloudflarestorage.com",
      forcePathStyle: false,
    });
    expect(r2Endpoint("account", "").forcePathStyle).toBe(false);
  });

  it("takes a loopback stand-in, path-style", () => {
    expect(r2Endpoint("account", "http://localhost:3102")).toEqual({
      endpoint: "http://localhost:3102",
      forcePathStyle: true,
    });
    expect(r2Endpoint("account", "http://127.0.0.1:3102").forcePathStyle).toBe(
      true,
    );
  });

  it("refuses any other host", () => {
    expect(() => r2Endpoint("account", "https://evil.example.com")).toThrow(
      "R2_ENDPOINT must point at localhost",
    );
    expect(() =>
      r2Endpoint("account", "https://localhost.example.com"),
    ).toThrow();
  });
});

describe("r2BrowserOrigin", () => {
  it("is the bucket's subdomain of the account endpoint, as the SDK signs it", () => {
    expect(r2BrowserOrigin("account", "bucket", undefined)).toBe(
      "https://bucket.account.r2.cloudflarestorage.com",
    );
  });

  it("is the stand-in's origin, path-style", () => {
    expect(r2BrowserOrigin("account", "bucket", "http://localhost:3102/")).toBe(
      "http://localhost:3102",
    );
  });
});
