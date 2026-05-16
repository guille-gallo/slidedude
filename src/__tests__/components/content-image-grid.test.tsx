/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentImageGrid } from "@/components/content-image-grid";

// Render next/image as a plain <img>
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

const IMGS = Array.from({ length: 8 }, (_, i) => `data:image/webp;base64,img${i}`);

describe("ContentImageGrid", () => {
  it("renders nothing when images is empty", () => {
    const { container } = render(<ContentImageGrid images={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("1 image → grid-cols-1", () => {
    const { container } = render(<ContentImageGrid images={IMGS.slice(0, 1)} />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("grid-cols-1");
    expect(screen.getAllByRole("button", { name: /zoom image/i })).toHaveLength(1);
  });

  it("2 images → grid-cols-2", () => {
    const { container } = render(<ContentImageGrid images={IMGS.slice(0, 2)} />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("grid-cols-2");
  });

  it("3 images → grid-cols-3 (1 row, no wasted cell)", () => {
    const { container } = render(<ContentImageGrid images={IMGS.slice(0, 3)} />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("grid-cols-3");
    expect(screen.getAllByRole("button", { name: /zoom image/i })).toHaveLength(3);
  });

  it("4 images → grid-cols-2", () => {
    const { container } = render(<ContentImageGrid images={IMGS.slice(0, 4)} />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("grid-cols-2");
  });

  it("6 images → grid-cols-3", () => {
    const { container } = render(<ContentImageGrid images={IMGS.slice(0, 6)} />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("grid-cols-3");
  });

  it("8 images → grid-cols-4", () => {
    const { container } = render(<ContentImageGrid images={IMGS.slice(0, 8)} />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("grid-cols-4");
  });

  describe("lightbox", () => {
    beforeEach(() => {
      render(<ContentImageGrid images={IMGS.slice(0, 3)} />);
    });

    it("opens a dialog when a zoom button is clicked", () => {
      expect(screen.queryByRole("dialog")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Zoom image 2" }));
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    it("closes the dialog when the close button is clicked", () => {
      fireEvent.click(screen.getByRole("button", { name: "Zoom image 1" }));
      expect(screen.getByRole("dialog")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Close image zoom" }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("closes the dialog when Escape is pressed", () => {
      fireEvent.click(screen.getByRole("button", { name: "Zoom image 1" }));
      expect(screen.getByRole("dialog")).toBeTruthy();
      fireEvent.keyDown(window, { key: "Escape", bubbles: true });
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("cycles to next image via ArrowRight", () => {
      fireEvent.click(screen.getByRole("button", { name: "Zoom image 1" }));
      // initial dialog shows "1 / 3"
      expect(screen.getByText("1 / 3")).toBeTruthy();
      fireEvent.keyDown(window, { key: "ArrowRight", bubbles: true });
      expect(screen.getByText("2 / 3")).toBeTruthy();
    });

    it("cycles to previous image via ArrowLeft", () => {
      fireEvent.click(screen.getByRole("button", { name: "Zoom image 2" }));
      expect(screen.getByText("2 / 3")).toBeTruthy();
      fireEvent.keyDown(window, { key: "ArrowLeft", bubbles: true });
      expect(screen.getByText("1 / 3")).toBeTruthy();
    });
  });
});
