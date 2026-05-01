import { auth } from "@/auth";
import { isValidPresentation } from "@/lib/validation";
import { generateOfflineHtml, safeFilename } from "@/lib/export-html";
import { apiRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = await apiRateLimit.limit(session.user.email);
  if (!success) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const presentation = (body as Record<string, unknown>)?.presentation;
  if (!isValidPresentation(presentation)) {
    return Response.json({ error: "Invalid presentation data" }, { status: 400 });
  }

  const html = await generateOfflineHtml(presentation);
  const filename = `${safeFilename(presentation.name)}.html`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
