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

  it("keeps links, opened in a new tab without the opener", () => {
    render(<MarkdownPreview value="[Docs](https://docs.example.com)" />);

    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("href", "https://docs.example.com");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
