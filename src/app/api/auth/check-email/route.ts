import { isEmailAllowed } from "@/auth";

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

  return Response.json({ allowed: isEmailAllowed(email) });
}
