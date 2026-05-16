import { describe, it, expect } from "vitest";
import {
  SAVE_DEBOUNCE_MS,
  MAX_IMAGE_WIDTH,
  COMPRESSION_QUALITY,
  MAX_IMAGES_PER_SLIDE,
  MAX_IMAGE_BYTES,
  ALLOWED_IMAGE_MIME,
} from "@/lib/constants";

describe("constants", () => {
  it("SAVE_DEBOUNCE_MS is a positive number", () => {
    expect(SAVE_DEBOUNCE_MS).toBeGreaterThan(0);
    expect(typeof SAVE_DEBOUNCE_MS).toBe("number");
  });

  it("MAX_IMAGE_WIDTH is a positive number", () => {
    expect(MAX_IMAGE_WIDTH).toBeGreaterThan(0);
    expect(typeof MAX_IMAGE_WIDTH).toBe("number");
  });

  it("COMPRESSION_QUALITY is between 0 and 1", () => {
    expect(COMPRESSION_QUALITY).toBeGreaterThan(0);
    expect(COMPRESSION_QUALITY).toBeLessThanOrEqual(1);
  });

  it("MAX_IMAGES_PER_SLIDE is a positive integer", () => {
    expect(MAX_IMAGES_PER_SLIDE).toBe(8);
  });

  it("MAX_IMAGE_BYTES is 600 KB", () => {
    expect(MAX_IMAGE_BYTES).toBe(600 * 1024);
  });

  it("ALLOWED_IMAGE_MIME contains expected types without SVG", () => {
    expect(ALLOWED_IMAGE_MIME).toContain("image/webp");
    expect(ALLOWED_IMAGE_MIME).toContain("image/png");
    expect(ALLOWED_IMAGE_MIME).toContain("image/jpeg");
    expect(ALLOWED_IMAGE_MIME).toContain("image/gif");
    expect(ALLOWED_IMAGE_MIME).not.toContain("image/svg+xml");
  });
});
