import { getAccessRequestRecipient, isEmailAllowed } from "@/auth";
import { accessRequestRateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 500;

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { email, message } = (body ?? {}) as { email?: unknown; message?: unknown };
  if (typeof email !== "string" || (message !== undefined && typeof message !== "string")) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);
  const trimmedMessage = (message ?? "").trim();
  if (
    normalizedEmail.length > MAX_EMAIL_LENGTH ||
    !EMAIL_REGEX.test(normalizedEmail) ||
    trimmedMessage.length > MAX_MESSAGE_LENGTH
  ) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const ipLimit = await accessRequestRateLimit.limit(`ip:${getClientIp(request)}`);
  const emailLimit = await accessRequestRateLimit.limit(`email:${normalizedEmail}`);
  if (!ipLimit.success || !emailLimit.success) {
    return Response.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  if (isEmailAllowed(normalizedEmail)) {
    return Response.json({ error: "This email already has access. Sign in above." }, { status: 409 });
  }

  const recipient = getAccessRequestRecipient();
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!recipient || !apiKey) {
    console.error("Access requests are not configured (missing recipient or AUTH_RESEND_KEY)");
    return Response.json({ error: "Access requests are not available right now." }, { status: 503 });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL_FROM ?? "slidedude <noreply@slidedude.io>",
        to: [recipient],
        reply_to: normalizedEmail,
        subject: `slidedude access request: ${normalizedEmail}`,
        text: [
          `${normalizedEmail} is requesting access to slidedude.`,
          "",
          trimmedMessage ? `Message:\n${trimmedMessage}` : "No message was included.",
          "",
          "To grant access, add this email to ALLOWED_EMAILS and redeploy.",
        ].join("\n"),
      }),
    });
    if (!res.ok) {
      console.error("Failed to send access request:", res.status, await res.text());
      return Response.json({ error: "Could not send the request. Try again later." }, { status: 502 });
    }
  } catch (e) {
    console.error("Failed to send access request:", e);
    return Response.json({ error: "Could not send the request. Try again later." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
