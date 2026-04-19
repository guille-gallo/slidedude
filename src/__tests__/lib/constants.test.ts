import { describe, it, expect } from "vitest";
import {
  SAVE_DEBOUNCE_MS,
  MAX_IMAGE_WIDTH,
  COMPRESSION_QUALITY,
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
});
