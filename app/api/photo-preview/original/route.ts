import { getPortfolioAdminClient, portfolioUuid } from "@/features/photo-portfolio/data/admin";
import { normalizeOriginalDetails } from "@/features/photo-portfolio/lib/original-storage";
import { authorizeOriginalUpload } from "@/features/photo-portfolio/lib/original-storage.server";

export async function POST(request: Request) {
  const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "Upload from the photo admin." }, 403);
  if (!await getPortfolioAdminClient()) return reply({ error: "Sign in again before uploading." }, 401);
  let body;
  try { body = await request.json(); } catch { return reply({ error: "Choose a photo and try again." }, 400); }
  const details = normalizeOriginalDetails(body);
  if (!details || typeof body.id !== "string" || !portfolioUuid.test(body.id)) return reply({ error: "Choose a JPEG, PNG, or WebP under 30 MB." }, 400);
  try {
    const result = await authorizeOriginalUpload(body.id.toLowerCase(), details);
    return result ? reply(result) : reply({ error: "A different original is already stored for this upload. Choose the file again to start a new upload." }, 409);
  } catch (cause) {
    if (cause instanceof Error && cause.name === "OriginalStorageNotConfigured") {
      return reply({ error: "Original photo storage is not configured. Add the R2 server settings and restart the app before retrying." }, 503);
    }
    console.error("Original upload authorization failed");
    return reply({ error: "Couldn’t access private original storage. Your file is kept here; try saving again." }, 503);
  }
}
