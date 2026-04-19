import { describe, it, expect } from "vitest";
import { normalizeEmail } from "@/lib/email";

describe("normalizeEmail", () => {
  it("lowercases the email", () => {
    expect(normalizeEmail("Alice@Example.COM")).toBe("alice@example.com");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeEmail("  bob@test.io  ")).toBe("bob@test.io");
  });

  it("handles already-normalized email", () => {
    expect(normalizeEmail("user@domain.com")).toBe("user@domain.com");
  });

  it("handles empty string", () => {
    expect(normalizeEmail("")).toBe("");
  });

  it("handles whitespace-only string", () => {
    expect(normalizeEmail("   ")).toBe("");
  });
});
