import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the env before importing
vi.stubEnv("ALLOWED_EMAILS", "alice@example.com, BOB@example.com , charlie@test.io");
vi.stubEnv("KV_REST_API_URL", "https://fake.upstash.io");
vi.stubEnv("KV_REST_API_TOKEN", "fake-token");
vi.stubEnv("AUTH_SECRET", "test-secret");

// Hoist mocks to top level to avoid warnings
vi.mock("@/lib/redis", () => ({ redis: {} }));
vi.mock("next-auth", () => ({
  default: () => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));
vi.mock("next-auth/providers/google", () => ({ default: vi.fn(() => ({})) }));
vi.mock("next-auth/providers/github", () => ({ default: vi.fn(() => ({})) }));
vi.mock("next-auth/providers/resend", () => ({ default: vi.fn(() => ({})) }));
vi.mock("@auth/upstash-redis-adapter", () => ({
  UpstashRedisAdapter: vi.fn(() => ({})),
}));
// Don't mock @/lib/email — we want the real normalizeEmail

let isEmailAllowed: (email: string) => boolean;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("@/auth");
  isEmailAllowed = mod.isEmailAllowed;
});

describe("isEmailAllowed", () => {
  it("allows an email in the allowlist", () => {
    expect(isEmailAllowed("alice@example.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isEmailAllowed("ALICE@EXAMPLE.COM")).toBe(true);
    expect(isEmailAllowed("bob@example.com")).toBe(true);
  });

  it("trims whitespace", () => {
    expect(isEmailAllowed("  alice@example.com  ")).toBe(true);
  });

  it("rejects emails not in the allowlist", () => {
    expect(isEmailAllowed("unknown@evil.com")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isEmailAllowed("")).toBe(false);
  });
});
