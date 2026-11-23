import { getPortfolioAdminClient, portfolioUuid } from "@/features/photo-portfolio/data/admin";
import { isPhotoVariant, photoMediaBucket, uploadedPhotoKey } from "@/features/photo-portfolio/lib/upload-media";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(_request: Request, context: { params: Promise<{ id: string; variant: string }> }) {
  const { id, variant } = await context.params;
  if (!portfolioUuid.test(id) || !isPhotoVariant(variant)) return new Response(null, { status: 404, headers });
  const client = await getPortfolioAdminClient();
  if (!client) return new Response(null, { status: 404, headers });
  const { data, error } = await client.storage.from(photoMediaBucket).download(uploadedPhotoKey(id, variant));
  if (error) return new Response(null, { status: 404, headers });
  return new Response(data, { headers: { ...headers, "Content-Type": "image/webp" } });
}
