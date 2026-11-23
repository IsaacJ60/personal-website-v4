import "server-only";

import sharp from "sharp";
import { uploadDisplayBounds, uploadMaxBytes, uploadThumbnailEdge } from "./upload-media";

export async function prepareUploadedWebp(file: File) {
  if (file.type !== "image/webp" || file.size === 0 || file.size > uploadMaxBytes) return null;
  const display = Buffer.from(await file.arrayBuffer());
  try {
    const pipeline = sharp(display, { limitInputPixels: uploadDisplayBounds.width * uploadDisplayBounds.height });
    const { format, width, height, pages, exif, xmp } = await pipeline.metadata();
    if (format !== "webp" || !width || !height || width > uploadDisplayBounds.width || height > uploadDisplayBounds.height
      || (pages ?? 1) > 1 || exif || xmp) return null;
    const thumbnail = await pipeline.resize({
      width: uploadThumbnailEdge, height: uploadThumbnailEdge, fit: "inside", withoutEnlargement: true,
    }).webp({ quality: 72 }).toBuffer();
    return { display, thumbnail, width, height };
  } catch {
    return null;
  }
}
