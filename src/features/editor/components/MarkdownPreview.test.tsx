import { describe, expect, it } from "vitest";
import { render, screen } from "../../../../test/intl";
import { MarkdownPreview } from "@/features/editor/components/MarkdownPreview";

describe("MarkdownPreview", () => {
  it("shows the alt text of an image instead of loading it (ADR 0036)", () => {
    const { container } = render(
      <MarkdownPreview value="![Release diagram](https://docs.example.com/flow.png)" />,
    );

    expect(screen.getByText("Release diagram")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("names the boxes of a task list, and lets the keyboard reach long code", () => {
    const { container } = render(
      <MarkdownPreview value={"- [x] Ship\n- [ ] Rest\n\n```\ncode\n```"} />,
    );

    expect(screen.getByRole("checkbox", { name: "Done" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Not done" }),
    ).not.toBeChecked();
    expect(container.querySelector("pre")).toHaveAttribute("tabindex", "0");
  });

  it("keeps links, opened in a new tab without the opener", () => {
    render(<MarkdownPreview value="[Docs](https://docs.example.com)" />);

    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("href", "https://docs.example.com");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
