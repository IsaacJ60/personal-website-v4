import { Readable } from "node:stream";
import { createPublicPortfolioClient } from "@/features/photo-portfolio/data/catalog";
import { photoExportFormat, renderPhotoExport } from "@/features/photo-portfolio/lib/photo-export";
import { readPhotoOriginal } from "@/features/photo-portfolio/lib/photo-original.server";
import { findUploadedOriginal } from "@/features/photo-portfolio/lib/original-storage.server";
import { fullSizePhotoUrl } from "@/features/photo-portfolio/lib/full-size-photo.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" };
const reply = (error: string, status: number) => Response.json({ error }, { status, headers });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = photoExportFormat(new URL(request.url).searchParams.get("format"));
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !format) return reply("Photo unavailable.", 404);
  try {
    const { data: photo, error } = await createPublicPortfolioClient().from("photo_v3_photos")
      .select("slug,title,object_key").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!photo) return reply("Photo unavailable.", 404);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(50000)]);
    if (format === "full-size" || format === "display") {
      // Vercel returns only the redirect. R2 serves the stored image bytes directly.
      const url = await fullSizePhotoUrl(photo.object_key, signal, format);
      return new Response(null, { status: 302, headers: {
        ...headers, Location: url,
      } });
    }
    if (photo.object_key.startsWith("uploads/") && !await findUploadedOriginal(id)) {
      return reply("The full-resolution original isn’t available for this photo yet.", 409);
    }
    const original = await readPhotoOriginal(photo.object_key, signal);
    const { stream, width, height, photoWidth, photoHeight } = await renderPhotoExport(original, format, photo.title);
    const abort = () => stream.destroy();
    if (signal.aborted) { stream.destroy(); return reply("Image preparation cancelled.", 503); }
    signal.addEventListener("abort", abort, { once: true });
    stream.once("close", () => signal.removeEventListener("abort", abort));
    stream.once("error", () => console.error("Photo sharing image stream failed", { id, format }));
    const png = format === "png" || format === "png-hd";
    const filename = `${photo.slug.replace(/[^a-z0-9-]/gi, "-")}-ij-prime${format === "png-hd" ? "-hd" : ""}.${png ? "png" : "jpg"}`;
    // Buffer-input Sharp streams still have an open writable side. End it before
    // adapting to a Web stream or Node can report a premature close at EOF.
    stream.end();
    // A true streaming body avoids buffering large PNGs in a function response.
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { headers: {
      ...headers, "Content-Type": png ? "image/png" : "image/jpeg",
      "Content-Disposition": `${format === "preview" ? "inline" : "attachment"}; filename="${filename}"`,
      "X-Photo-Width": String(photoWidth), "X-Photo-Height": String(photoHeight),
      "X-Export-Width": String(width), "X-Export-Height": String(height),
    } });
  } catch (error) {
    if ((format === "full-size" || format === "display") && (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
      return reply("The full-resolution original isn’t available for this photo yet.", 409);
    }
    console.error("Photo sharing preparation failed", { id, format });
    return reply("Couldn’t prepare this image. Please try again.", 503);
  }
}
