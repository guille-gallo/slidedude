import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContentSlideEditor } from "@/components/content-slide-editor";
import type { ContentSlide } from "@/types";
import { MAX_IMAGES_PER_SLIDE } from "@/lib/constants";

// ---- Mocks ----------------------------------------------------------------

// next/image renders a plain <img> in tests; strip next/image-only props
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// react-resizable-panels just renders children
vi.mock("react-resizable-panels", () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelResizeHandle: () => null,
}));

// Compression returns a predictable value
vi.mock("@/utils/compress-image", () => ({
  compressImage: async (file: File) => `data:image/webp;base64,compressed-${file.name}`,
  compressImageFromDataUrl: async (url: string) => `data:image/webp;base64,compressed-url-${url.slice(-6)}`,
}));

// ---- Helpers ---------------------------------------------------------------

function makeSlide(overrides: Partial<ContentSlide> = {}): ContentSlide {
  return {
    id: "s1",
    type: "content",
    title: "Test",
    body: "Body",
    fontSize: 32,
    imageDataUrls: [],
    ...overrides,
  };
}

function makeFile(name: string, type = "image/png"): File {
  return new File(["data"], name, { type });
}

// ---- Tests -----------------------------------------------------------------

describe("ContentSlideEditor", () => {
  let onChange: (patch: Partial<ContentSlide>) => void;

  beforeEach(() => {
    onChange = vi.fn() as (patch: Partial<ContentSlide>) => void;
    vi.clearAllMocks();
  });

  it("renders the drop zone when no images are present", () => {
    render(<ContentSlideEditor slide={makeSlide()} onChange={onChange} />);
    expect(screen.getByText(/drop images or click to upload/i)).toBeInTheDocument();
  });

  it("shows existing thumbnails", () => {
    const slide = makeSlide({ imageDataUrls: ["data:image/webp;base64,AAA", "data:image/webp;base64,BBB"] });
    render(<ContentSlideEditor slide={slide} onChange={onChange} />);
    expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(2);
  });

  it("uploads a single file and appends it", async () => {
    render(<ContentSlideEditor slide={makeSlide()} onChange={onChange} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const file = makeFile("photo.png");
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        imageDataUrls: ["data:image/webp;base64,compressed-photo.png"],
      });
    });
  });

  it("appends to existing images on upload", async () => {
    const existing = "data:image/webp;base64,existing";
    const slide = makeSlide({ imageDataUrls: [existing] });
    render(<ContentSlideEditor slide={slide} onChange={onChange} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("new.png")] } });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        imageDataUrls: [existing, "data:image/webp;base64,compressed-new.png"],
      });
    });
  });

  it("enforces the MAX_IMAGES_PER_SLIDE cap", async () => {
    const full = Array.from({ length: MAX_IMAGES_PER_SLIDE }, (_, i) => `data:image/webp;base64,img${i}`);
    const slide = makeSlide({ imageDataUrls: full });
    render(<ContentSlideEditor slide={slide} onChange={onChange} />);
    // Drop zone should not be visible when at cap
    expect(screen.queryByText(/drop images/i)).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(`maximum ${MAX_IMAGES_PER_SLIDE}`, "i"))).toBeInTheDocument();
  });

  it("rejects files with unsupported MIME types and shows an error", async () => {
    render(<ContentSlideEditor slide={makeSlide()} onChange={onChange} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("virus.svg", "image/svg+xml")] } });
    await waitFor(() => {
      expect(screen.getByText(/unsupported type/i)).toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it("removes an image when the X button is clicked", async () => {
    const slide = makeSlide({ imageDataUrls: ["data:image/webp;base64,AAA", "data:image/webp;base64,BBB"] });
    render(<ContentSlideEditor slide={slide} onChange={onChange} />);
    const removeButtons = screen.getAllByRole("button", { name: /remove image/i });
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith({ imageDataUrls: ["data:image/webp;base64,BBB"] });
  });

  it("shows 'add more' text when images exist and cap is not reached", () => {
    const slide = makeSlide({ imageDataUrls: ["data:image/webp;base64,AAA"] });
    render(<ContentSlideEditor slide={slide} onChange={onChange} />);
    expect(screen.getByText(/add more/i)).toBeInTheDocument();
  });
});
