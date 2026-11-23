import { revalidatePath } from "next/cache";
import { getPortfolioAdminClient, portfolioUuid } from "@/features/photo-portfolio/data/admin";
import { normalizePhotoDetails } from "@/features/photo-portfolio/lib/admin-photos";
import { prepareUploadedWebp } from "@/features/photo-portfolio/lib/prepare-upload.server";
import { photoMediaBucket, uploadedPhotoKey, uploadMaxBytes } from "@/features/photo-portfolio/lib/upload-media";

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
  const mode = form.get("mode") ?? "draft";
  if (mode !== "draft" && mode !== "publish") return fail("Choose whether to save a draft or publish the photo.", 400);
  const publish = mode === "publish";
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
    if (publish && !photo.published) return Response.json({
      error: "This upload was already saved as a draft.",
      existingDraftId: photo.id,
    }, { status: 409, headers: { "Cache-Control": "no-store" } });
    if (photo.published) revalidatePath("/photo", "layout");
    else revalidatePath("/photo/admin/photos");
    return Response.json({ id: photo.id, slug: photo.slug, published: photo.published }, {
      status, headers: { "Cache-Control": "no-store" },
    });
  }

  const findPhoto = () => client.from("photo_v2_photos").select("id,slug,published,object_key").eq("id", id).maybeSingle();
  const existing = await findPhoto();
  if (existing.error) return fail("Couldn’t check this upload. Try again.", 503);
  if (existing.data) return existing.data.object_key === displayKey
    ? complete(existing.data, 200)
    : fail("Choose the file again to start a new upload.", 409);

  const images = await prepareUploadedWebp(file);
  if (!images) return fail("Couldn’t read the prepared image. Choose a JPEG, PNG, or WebP and try again.", 400);

  const storage = client.storage.from(photoMediaBucket);
  async function storeDerivative(path: string, bytes: Buffer) {
    const { error } = await storage.upload(path, bytes, { contentType: "image/webp", upsert: false });
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
  const { error } = await client.from("photo_v2_photos").insert({
    id, slug, object_key: displayKey, ...metadata.columns,
    image_width: images.width, image_height: images.height, published: publish,
  });
  if (error) {
    const retry = await findPhoto();
    if (retry.data?.object_key === displayKey) return complete(retry.data, 200);
    return fail("Couldn’t save the photo. Try this upload again.", 503);
  }
  return complete({ id, slug, published: publish }, 201);
}
