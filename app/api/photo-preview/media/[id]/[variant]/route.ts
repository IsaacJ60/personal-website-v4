import { portfolioUuid } from "@/features/photo-portfolio/data/admin";
import { createPublicPortfolioClient } from "@/features/photo-portfolio/data/catalog";
import { isPhotoVariant, photoMediaBucket, uploadedPhotoKey } from "@/features/photo-portfolio/lib/upload-media";

function unavailable() {
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string; variant: string }> }) {
  const { id, variant } = await context.params;
  if (!portfolioUuid.test(id) || !isPhotoVariant(variant)) return unavailable();
  // Anonymous storage RLS permits signing only when the corresponding photo is public.
  const { data, error } = await createPublicPortfolioClient().storage.from(photoMediaBucket)
    .createSignedUrl(uploadedPhotoKey(id, variant), 3600);
  if (error || !data?.signedUrl) return unavailable();
  return new Response(null, {
    status: 302,
    headers: { Location: data.signedUrl, "Cache-Control": "public, max-age=300, s-maxage=1800" },
  });
}
