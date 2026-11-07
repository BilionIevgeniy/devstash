import { describe, expect, it } from "vitest";

import {
  readStreamText,
  STREAM_END_MARK,
} from "@/features/ai/domain/text-stream";

describe("readStreamText", () => {
  it("strips the end mark of a stream that finished", () => {
    expect(readStreamText(`It reads.${STREAM_END_MARK}`)).toEqual({
      text: "It reads.",
      complete: true,
    });
  });

  it("says a stream with no end mark did not finish", () => {
    expect(readStreamText("It rea")).toEqual({
      text: "It rea",
      complete: false,
    });
  });
});
