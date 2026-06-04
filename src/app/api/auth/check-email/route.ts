import { isEmailAllowed } from "@/auth";
import { magicLinkRateLimit, magicLinkIpRateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    return Response.json({ allowed: false }, { status: 400 });
  }

  const { email } = body as { email?: string };
  if (!email || typeof email !== "string") {
    return Response.json({ allowed: false }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return Response.json({ allowed: false }, { status: 400 });
  }

  const emailLimit = await magicLinkRateLimit.limit(normalizedEmail);
  if (!emailLimit.success) {
    return Response.json(
      { allowed: false, error: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  const clientIp = getClientIp(request);
  const ipLimit = await magicLinkIpRateLimit.limit(clientIp);
  if (!ipLimit.success) {
    return Response.json(
      { allowed: false, error: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  return Response.json({ allowed: isEmailAllowed(normalizedEmail) });
}
