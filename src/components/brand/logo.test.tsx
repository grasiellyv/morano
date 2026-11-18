import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Logo } from "./logo";

afterEach(cleanup);

describe("Logo", () => {
  it("exposes MORANO as an image with text morano.", () => {
    render(<Logo />);
    const logo = screen.getByRole("img", { name: "MORANO" });
    expect(logo).toBeInTheDocument();
    expect(logo.textContent).toBe("morano.");
  });
});
