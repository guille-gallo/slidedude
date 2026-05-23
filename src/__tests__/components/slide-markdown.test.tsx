import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SlideMarkdown } from "@/components/slide-markdown";

describe("SlideMarkdown", () => {
  it("renders single newlines inside paragraphs as line breaks", () => {
    const { container } = render(<SlideMarkdown source={"Line one\nLine two"} />);

    expect(container.querySelector("br")).not.toBeNull();
  });
});