import { describe, expect, it } from "vitest";

import { aiMarkProps } from "@/features/ai/domain/marking";

describe("aiMarkProps", () => {
  it("sets the attribute on a marked value only", () => {
    expect(aiMarkProps(true)).toEqual({ "data-ai-generated": "true" });
    expect(aiMarkProps(false)).toEqual({});
  });
});
