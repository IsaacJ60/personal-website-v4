import { revalidatePath } from "next/cache";
import { getPortfolioAdminClient, portfolioUuid } from "@/features/photo-portfolio/data/admin";
import { normalizePhotoDetails } from "@/features/photo-portfolio/lib/admin-photos";
import { prepareUploadedWebp } from "@/features/photo-portfolio/lib/prepare-upload.server";
import { photoMediaBucket, uploadedPhotoKey, uploadMaxBytes } from "@/features/photo-portfolio/lib/upload-media";
import { findUploadedOriginal } from "@/features/photo-portfolio/lib/original-storage.server";
import { normalizeOriginalDetails } from "@/features/photo-portfolio/lib/original-storage";

export const runtime = "nodejs";

function fail(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("This upload must start in the photo admin.", 403);
  const client = await getPortfolioAdminClient();
  if (!client) return fail("Sign in to the photo admin before uploading.", 401);
  if (Number(request.headers.get("content-length")) > uploadMaxBytes + 100_000) {
    return fail("The prepared file is too large. Choose a smaller photo.", 413);
  }

  let form: FormData;
  try { form = await request.formData(); } catch { return fail("Choose a photo and try again.", 400); }
  const rawId = form.get("id");
  const file = form.get("image");
  const owner = form.get("seriesId");
  if (form.has("mode") || typeof owner !== "string" || !portfolioUuid.test(owner)) return fail("Choose a destination series before uploading.", 400);
  const seriesId = owner.toLowerCase();
  const destination = await client.from("photo_v3_collections").select("id").eq("id", seriesId)
    .eq("kind", "series").eq("published", false).eq("is_public_copy", false).maybeSingle();
  if (destination.error) return fail("Couldn’t check the destination series. Retry saving.", 503);
  if (!destination.data) return fail("Choose an editable destination series.", 400);
  if (typeof rawId !== "string" || !portfolioUuid.test(rawId) || !(file instanceof File)) {
    return fail("Choose a photo and try again.", 400);
  }
  const id = rawId.toLowerCase();
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };
  const metadata = normalizePhotoDetails({
    title: field("title"), date: field("date"), location: field("location"), caption: field("caption"), altText: field("altText"),
  });
  if (!metadata.ok) return fail(metadata.message, 400);

  const displayKey = uploadedPhotoKey(id);
  const thumbnailKey = uploadedPhotoKey(id, "thumbnail");
  function complete(photo: { id: string; slug: string; published: boolean }, status: number) {
    revalidatePath("/photo/admin/photos");
    revalidatePath("/photo/admin/series");
    revalidatePath(`/photo/admin/series/${seriesId}`);
    return Response.json({ id: photo.id, slug: photo.slug, published: photo.published }, {
      status, headers: { "Cache-Control": "no-store" },
    });
  }

  const findPhoto = () => client.from("photo_v3_photos").select("id,slug,owner_series_id,object_key").eq("id", id).maybeSingle();
  const existing = await findPhoto();
  if (existing.error) return fail("Couldn’t check this upload. Try again.", 503);
  if (existing.data) return existing.data.object_key === displayKey && existing.data.owner_series_id === seriesId
    ? complete({ ...existing.data, published: false }, 200)
    : fail("Choose the file again to start a new upload.", 409);

  // Never commit a new photo if its untouched original has not reached private R2.
  const sha256 = field("originalSha256");
  if (!/^[a-f0-9]{64}$/.test(sha256)) return fail("Store the original photo before saving. Choose the file again.", 400);
  try {
    const original = await findUploadedOriginal(id);
    const saved = normalizeOriginalDetails({ size: original?.ContentLength, contentType: original?.ContentType, sha256: original?.Metadata?.sha256 });
    if (!saved || saved.sha256 !== sha256) return fail("The original upload is incomplete. Retry saving this photo.", 409);
  } catch { return fail("Couldn’t verify the original. Your photo is not saved yet; retry saving.", 503); }

  const images = await prepareUploadedWebp(file);
  if (!images) return fail("Couldn’t read the prepared image. Choose a JPEG, PNG, or WebP and try again.", 400);

  const storage = client.storage.from(photoMediaBucket);
  async function storeDerivative(path: string, bytes: Buffer) {
    const { error } = await storage.upload(path, bytes, { contentType: "image/webp", cacheControl: "60", upsert: false });
    if (!error) return true;
    // A retry can find a variant written before an earlier request was interrupted.
    // Reuse only the same bytes, so the upload cannot replace an existing image.
    const saved = await storage.download(path);
    return !saved.error && Buffer.from(await saved.data.arrayBuffer()).equals(bytes);
  }
  const [display, thumbnail] = await Promise.allSettled([
    storeDerivative(displayKey, images.display),
    storeDerivative(thumbnailKey, images.thumbnail),
  ]);
  if (display.status !== "fulfilled" || thumbnail.status !== "fulfilled" || !display.value || !thumbnail.value) {
    return fail("Couldn’t store both image sizes. Try saving this upload again.", 503);
  }

  const name = metadata.details.title.normalize("NFKD").toLowerCase()
    .replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").slice(0, 72).replace(/^-|-$/g, "") || "photo";
  const slug = `${name}-${id.slice(0, 12)}`;
  const { error } = await client.from("photo_v3_photos").insert({
    id, slug, object_key: displayKey, ...metadata.columns,
    image_width: images.width, image_height: images.height, owner_series_id: seriesId,
  });
  if (error) {
    const retry = await findPhoto();
    if (retry.data?.object_key === displayKey && retry.data.owner_series_id === seriesId) return complete({ ...retry.data, published: false }, 200);
    return fail("Couldn’t save the photo. Try this upload again.", 503);
  }
  return complete({ id, slug, published: false }, 201);
}
