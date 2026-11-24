import { revalidatePath } from "next/cache";
import { getPortfolioAdminClient, portfolioUuid } from "@/features/photo-portfolio/data/admin";
import { normalizePhotoDetails } from "@/features/photo-portfolio/lib/admin-photos";
import { photoMediaBucket, uploadedPhotoKey } from "@/features/photo-portfolio/lib/upload-media";

export async function POST(request: Request) {
  const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "Publish from the photo admin." }, 403);
  const client = await getPortfolioAdminClient();
  if (!client) return reply({ error: "Sign in again before publishing." }, 401);
  let body;
  try { body = await request.json(); } catch { return reply({ error: "Choose a saved photo to publish." }, 400); }
  if (!body || typeof body.id !== "string" || !portfolioUuid.test(body.id)) return reply({ error: "Choose a saved photo to publish." }, 400);
  const id = body.id.toLowerCase();
  const metadata = normalizePhotoDetails(body.details);
  if (!metadata.ok) return reply({ error: metadata.message }, 400);
  const { data: photo, error } = await client.from("photo_v2_photos").select("*").eq("id", id).maybeSingle();
  if (error) return reply({ error: "Couldn’t check the saved photo. Retry publishing." }, 503);
  if (!photo || photo.object_key !== uploadedPhotoKey(id)) return reply({ error: "This upload was removed or is unavailable. Check Photos." }, 404);
  const complete = () => {
    revalidatePath("/photo", "layout");
    return reply({ id, slug: photo.slug, published: true });
  };
  // A lost response can be retried without rewriting the metadata or uploading files.
  if (photo.published) return complete();
  if (Object.entries(metadata.columns).some(([key, value]) => photo[key as keyof typeof metadata.columns] !== value)) {
    return reply({ error: "This draft’s details changed. Review and publish it from its photo editor." }, 409);
  }
  const storage = client.storage.from(photoMediaBucket);
  const files = await Promise.all([storage.exists(uploadedPhotoKey(id)), storage.exists(uploadedPhotoKey(id, "thumbnail"))]);
  if (files.some((file) => file.error || !file.data)) return reply({ error: "Both image sizes must be available before publishing. Retry or check the photo editor." }, 409);
  const updated = await client.from("photo_v2_photos").update({ published: true })
    .eq("id", id).eq("object_key", uploadedPhotoKey(id)).eq("updated_at", photo.updated_at).select("id").maybeSingle();
  if (updated.error) return reply({ error: "Couldn’t publish this photo. Retry publishing." }, 503);
  if (!updated.data) return reply({ error: "This photo changed or was removed. Review it in Photos before publishing." }, 409);
  return complete();
}
