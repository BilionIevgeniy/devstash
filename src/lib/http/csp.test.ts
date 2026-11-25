import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  cspDirectives,
  type CspInput,
} from "@/lib/http/csp";

const PRODUCTION: CspInput = {
  sentryDsn: "https://key@o123.ingest.de.sentry.io/456",
  r2: { accountId: "account", bucket: "devstash", endpoint: undefined },
  dev: false,
  preview: false,
};

describe("cspDirectives", () => {
  it("lets the browser reach the bucket's own host, where the SDK signs URLs", () => {
    const directives = cspDirectives(PRODUCTION);
    const bucket = "https://devstash.account.r2.cloudflarestorage.com";
    expect(directives["connect-src"]).toContain(bucket);
    expect(directives["img-src"]).toContain(bucket);
    expect(directives["connect-src"]).not.toContain(
      "https://account.r2.cloudflarestorage.com",
    );
  });

  it("names exact origins, never a wildcard", () => {
    const policy = buildContentSecurityPolicy(PRODUCTION);
    expect(policy).not.toMatch(/\*/);
    expect(policy).not.toMatch(/(^|\s)https:(\s|;|$)/);
  });

  it("posts to the origin of the DSN, not to its path or key", () => {
    expect(cspDirectives(PRODUCTION)["connect-src"]).toContain(
      "https://o123.ingest.de.sentry.io",
    );
  });

  it("leaves out a DSN the SDK would refuse, and an empty one", () => {
    const foreign = cspDirectives({
      ...PRODUCTION,
      sentryDsn: "https://key@o1.ingest.us.sentry.io/2",
    });
    expect(foreign["connect-src"].join(" ")).not.toContain("sentry");
    expect(
      cspDirectives({ ...PRODUCTION, sentryDsn: "" })["connect-src"],
    ).toEqual(["'self'", "https://devstash.account.r2.cloudflarestorage.com"]);
  });

  it("takes the end-to-end stand-ins on localhost", () => {
    const directives = cspDirectives({
      sentryDsn: "http://key@localhost:3104/1",
      r2: {
        accountId: "dummy",
        bucket: "dummy",
        endpoint: "http://localhost:3102",
      },
      dev: false,
      preview: false,
    });
    expect(directives["connect-src"]).toEqual([
      "'self'",
      "http://localhost:3102",
      "http://localhost:3104",
    ]);
  });

  it("allows eval and the HMR socket in next dev only", () => {
    expect(cspDirectives(PRODUCTION)["script-src"]).not.toContain(
      "'unsafe-eval'",
    );
    const dev = cspDirectives({ ...PRODUCTION, dev: true });
    expect(dev["script-src"]).toContain("'unsafe-eval'");
    expect(dev["connect-src"]).toContain("ws:");
  });

  it("keeps the framing, plugin and base rules of the old header", () => {
    const policy = buildContentSecurityPolicy(PRODUCTION);
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).not.toContain("form-action");
  });

  it("lets the Vercel Toolbar in on a preview, and only there", () => {
    const preview = cspDirectives({ ...PRODUCTION, preview: true });
    expect(preview["script-src"]).toContain("https://vercel.live");
    expect(preview["connect-src"]).toContain("wss://ws-us3.pusher.com");
    expect(preview["frame-src"]).toEqual(["https://vercel.live"]);
    expect(buildContentSecurityPolicy(PRODUCTION)).not.toContain("vercel");
  });
});

describe("the R2 origin", () => {
  it.each([{ accountId: undefined }, { bucket: undefined }])(
    "is left out without %j",
    (missing) => {
      const directives = cspDirectives({
        ...PRODUCTION,
        r2: { ...PRODUCTION.r2, ...missing },
      });
      expect(directives["connect-src"].join(" ")).not.toContain("cloudflare");
    },
  );
});
