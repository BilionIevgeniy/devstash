import { describe, expect, it } from "vitest";

import { refuseCrossSiteJson } from "@/lib/http/same-origin-json";

function request(headers: Record<string, string>) {
  return new Request("http://localhost:3000/api/x", {
    method: "POST",
    headers,
    body: "{}",
  });
}

describe("refuseCrossSiteJson", () => {
  it("lets a JSON request of the same origin through, and one with no fetch metadata", () => {
    expect(
      refuseCrossSiteJson(
        request({
          "content-type": "application/json",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBeNull();
    expect(
      refuseCrossSiteJson(request({ "content-type": "application/json" })),
    ).toBeNull();
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", ""])(
    "refuses the content type %j with 415",
    (contentType) => {
      expect(
        refuseCrossSiteJson(request({ "content-type": contentType }))?.status,
      ).toBe(415);
    },
  );

  it.each(["same-site", "cross-site", "none"])(
    "refuses a browser that says %s with 403",
    (site) => {
      expect(
        refuseCrossSiteJson(
          request({
            "content-type": "application/json",
            "sec-fetch-site": site,
          }),
        )?.status,
      ).toBe(403);
    },
  );
});
