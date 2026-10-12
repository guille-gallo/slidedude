import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const isEmailAllowedMock = vi.fn();
const getRecipientMock = vi.fn();
const limitMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/auth", () => ({
  isEmailAllowed: (email: string) => isEmailAllowedMock(email),
  getAccessRequestRecipient: () => getRecipientMock(),
}));

vi.mock("@/lib/rate-limit", () => ({
  accessRequestRateLimit: { limit: (identifier: string) => limitMock(identifier) },
}));

import { POST } from "@/app/api/auth/request-access/route";

function req(body: unknown) {
  return new Request("http://localhost/api/auth/request-access", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

beforeEach(() => {
  isEmailAllowedMock.mockReset().mockReturnValue(false);
  getRecipientMock.mockReset().mockReturnValue("owner@example.com");
  limitMock.mockReset().mockResolvedValue({ success: true });
  fetchMock.mockReset().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("AUTH_RESEND_KEY", "re_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/auth/request-access", () => {
  it("returns 400 on invalid JSON", async () => {
    expect((await POST(req("not json"))).status).toBe(400);
  });

  it("returns 400 on an invalid email", async () => {
    expect((await POST(req({ email: "nope" }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the message is too long", async () => {
    const res = await POST(req({ email: "a@b.co", message: "x".repeat(501) }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate-limited", async () => {
    limitMock.mockResolvedValueOnce({ success: false });
    const res = await POST(req({ email: "a@b.co" }));
    expect(res.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 409 when the email already has access", async () => {
    isEmailAllowedMock.mockReturnValueOnce(true);
    const res = await POST(req({ email: "a@b.co" }));
    expect(res.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 when no recipient is configured", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getRecipientMock.mockReturnValueOnce(null);
    const res = await POST(req({ email: "a@b.co" }));
    expect(res.status).toBe(503);
    errSpy.mockRestore();
  });

  it("emails the owner with the requester as reply-to", async () => {
    const res = await POST(req({ email: " New@User.com ", message: "Let me in please" }));
    expect(res.status).toBe(200);
    expect(limitMock).toHaveBeenCalledWith("ip:1.2.3.4");
    expect(limitMock).toHaveBeenCalledWith("email:new@user.com");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    const sent = JSON.parse(init.body);
    expect(sent.to).toEqual(["owner@example.com"]);
    expect(sent.reply_to).toBe("new@user.com");
    expect(sent.text).toContain("Let me in please");
  });

  it("returns 502 when the email provider fails", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => "boom" });
    const res = await POST(req({ email: "a@b.co" }));
    expect(res.status).toBe(502);
    errSpy.mockRestore();
  });
});
