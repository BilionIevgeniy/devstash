import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  forgetConsent,
  setConsent,
} from "@/components/common/hooks/use-consent";

import { forgetSentWebVitals, sendWebVital } from "./send-web-vital";

type Metric = Parameters<typeof sendWebVital>[0];

function metric(overrides: Partial<Metric> = {}): Metric {
  return {
    name: "LCP",
    value: 1800,
    id: "v6-1",
    delta: 1800,
    rating: "good",
    entries: [],
    navigationType: "navigate",
    navigationId: 1,
    navigationURL: "http://localhost/items/snippets/clx123?token=secret",
    navigationStartTime: 0,
    ...overrides,
  } as Metric;
}

const fetchMock = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
  forgetConsent();
  forgetSentWebVitals();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
});

describe("sendWebVital", () => {
  it("sends the metric with the page's group, never its URL, once allowed", () => {
    setConsent("granted");

    sendWebVital(metric());

    expect(fetchMock).toHaveBeenCalledOnce();
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/vitals");
    expect(JSON.parse(init.body)).toEqual({
      name: "LCP",
      value: 1800,
      group: "/items/[type]/[id]",
    });
    expect(init.body).not.toContain("clx123");
  });

  it("sends nothing without an answer, and nothing after a withdrawal", () => {
    sendWebVital(metric());
    setConsent("granted");
    setConsent("denied");
    sendWebVital(metric({ name: "CLS", value: 0.01 }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a measurement reported twice (a second reporter) once", () => {
    setConsent("granted");

    sendWebVital(metric());
    sendWebVital(metric({ id: "v6-2" }));

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("sends a value that grew, as web-vitals reports a later INP or CLS", () => {
    setConsent("granted");

    sendWebVital(metric({ name: "CLS", value: 0.01 }));
    sendWebVital(metric({ name: "CLS", value: 0.2 }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("leaves out the metrics other than LCP, INP and CLS", () => {
    setConsent("granted");

    sendWebVital(metric({ name: "TTFB" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
