import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ErrorState } from "@/components/common/ErrorState";

describe("ErrorState", () => {
  it("announces the title and the description as an alert", () => {
    render(
      <ErrorState title="Something went wrong" description="Try again." />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("Try again.");
  });

  it("shows the reference line its caller words", () => {
    render(
      <ErrorState
        title="Something went wrong"
        description="Try again."
        reference={<>Reference: 1234567890</>}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Reference: 1234567890",
    );
  });

  it("shows no reference line when there is no digest", () => {
    render(<ErrorState title="Not found" description="No such page." />);

    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });

  it("renders the buttons that lead out", () => {
    render(
      <ErrorState title="Not found" description="No such page.">
        <button type="button">Go to the homepage</button>
      </ErrorState>,
    );

    expect(
      screen.getByRole("button", { name: "Go to the homepage" }),
    ).toBeInTheDocument();
  });
});
