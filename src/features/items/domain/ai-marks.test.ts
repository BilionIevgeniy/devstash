import { describe, expect, it } from "vitest";

import {
  acceptedAiClaims,
  nextAiMarks,
  NO_AI_CLAIMS,
  NOTHING_ACCEPTED,
  type StoredAiFields,
} from "@/features/items/domain/ai-marks";

const marked: StoredAiFields = {
  description: "A hook that debounces a value.",
  content: "You are a reviewer.\nList the bugs.",
  descriptionAiGenerated: true,
  contentAiGenerated: true,
  aiTags: ["react", "hooks"],
};

describe("nextAiMarks", () => {
  it("marks a new item's claimed fields that hold a value", () => {
    expect(
      nextAiMarks(
        null,
        { description: "Summary", content: null, tags: ["react", "mine"] },
        { description: true, content: true, tags: ["react"] },
      ),
    ).toEqual({
      descriptionAiGenerated: true,
      contentAiGenerated: false,
      aiTags: ["react"],
    });
  });

  it("does not mark a claimed field the type does not store", () => {
    // A link keeps no content: the service leaves it undefined.
    expect(
      nextAiMarks(null, { tags: [] }, { ...NO_AI_CLAIMS, content: true })
        .contentAiGenerated,
    ).toBe(false);
  });

  it("keeps the marks when the values are unchanged", () => {
    expect(
      nextAiMarks(
        marked,
        {
          description: marked.description,
          content: marked.content,
          tags: ["react", "hooks"],
        },
        NO_AI_CLAIMS,
      ),
    ).toEqual({
      descriptionAiGenerated: true,
      contentAiGenerated: true,
      aiTags: ["react", "hooks"],
    });
  });

  it("clears the mark of an edited field only", () => {
    const next = nextAiMarks(
      marked,
      { description: "My own words.", content: marked.content, tags: [] },
      NO_AI_CLAIMS,
    );
    expect(next.descriptionAiGenerated).toBe(false);
    expect(next.contentAiGenerated).toBe(true);
  });

  it("treats a change of line endings as an edit", () => {
    const next = nextAiMarks(
      marked,
      { content: "You are a reviewer.\r\nList the bugs.", tags: [] },
      NO_AI_CLAIMS,
    );
    expect(next.contentAiGenerated).toBe(false);
  });

  it("does not mark the stored text for a claim on a field the save leaves out", () => {
    const own = { ...marked, contentAiGenerated: false };
    expect(
      nextAiMarks(own, { tags: [] }, { ...NO_AI_CLAIMS, content: true })
        .contentAiGenerated,
    ).toBe(false);
  });

  it("keeps the mark of a field the save leaves out", () => {
    expect(
      nextAiMarks(marked, { tags: [] }, NO_AI_CLAIMS).contentAiGenerated,
    ).toBe(true);
  });

  it("clears the mark of a cleared field even when claimed", () => {
    expect(
      nextAiMarks(
        marked,
        { description: null, tags: [] },
        { ...NO_AI_CLAIMS, description: true },
      ).descriptionAiGenerated,
    ).toBe(false);
  });

  it("drops the mark of a removed tag and of one retyped in another case", () => {
    expect(
      nextAiMarks(marked, { tags: ["react", "Hooks", "mine"] }, NO_AI_CLAIMS)
        .aiTags,
    ).toEqual(["react"]);
  });
});

describe("acceptedAiClaims", () => {
  it("claims the description while it holds the accepted summary", () => {
    expect(
      acceptedAiClaims(
        { description: "  A summary. ", tags: "" },
        { description: "A summary.", tags: [] },
      ).description,
    ).toBe(true);
  });

  it("does not claim a summary the user changed afterwards", () => {
    expect(
      acceptedAiClaims(
        { description: "A summary, edited.", tags: "" },
        { description: "A summary.", tags: [] },
      ).description,
    ).toBe(false);
  });

  it("claims nothing when nothing was accepted", () => {
    expect(
      acceptedAiClaims({ description: "x", tags: "react" }, NOTHING_ACCEPTED),
    ).toEqual(NO_AI_CLAIMS);
  });

  it("claims the accepted tags still in the field, spelled as accepted", () => {
    expect(
      acceptedAiClaims(
        { description: "", tags: "react, Hooks, mine" },
        { description: null, tags: ["react", "hooks"] },
      ).tags,
    ).toEqual(["react"]);
  });
});

describe("acceptedAiClaims and blanks", () => {
  it("claims the accepted summary with blanks around it, and no blank field", () => {
    const claims = (description: string, accepted: string) =>
      acceptedAiClaims(
        { description, tags: "" },
        { description: accepted, tags: [] },
      ).description;
    expect(claims(" A summary. ", "A summary.")).toBe(true);
    expect(claims("A summary.", " A summary. ")).toBe(true);
    expect(claims("  ", "  ")).toBe(false);
  });
});
