import sharp from "sharp";
import { join } from "node:path";

export type PhotoExportFormat = "jpeg" | "png" | "png-hd" | "preview" | "full-size" | "display";
export const originalMaxBytes = 30 * 1024 * 1024;

export function photoExportFormat(value: string | null): PhotoExportFormat | null {
  return value === null || value === "jpeg" ? "jpeg" : value === "png" || value === "png-hd" || value === "preview" || value === "full-size" || value === "display" ? value : null;
}

// Sharing formats use a frame; viewing formats preserve the photograph alone.
export async function renderPhotoExport(original: Buffer, format: PhotoExportFormat, title = "Untitled photograph") {
  if (!original.length || original.length > originalMaxBytes) throw new Error("Invalid original size");
  const image = sharp(original, { limitInputPixels: 60_000_000 });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1
    || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new Error("Unsupported original");
  const swapped = [5, 6, 7, 8].includes(metadata.orientation ?? 1);
  const photoWidth = swapped ? metadata.height : metadata.width;
  const photoHeight = swapped ? metadata.width : metadata.height;
  if (format === "full-size" || format === "display") {
    // Apply orientation and omit EXIF/GPS. Display copies fit a 2560px square
    // without cropping or upscaling; full-size exports retain native resolution.
    const ratio = format === "display" ? Math.min(1, 2560 / Math.max(photoWidth, photoHeight)) : 1;
    const width = Math.max(1, Math.round(photoWidth * ratio));
    const height = Math.max(1, Math.round(photoHeight * ratio));
    const stream = image.rotate().flatten({ background: "#ffffff" });
    if (format === "display") stream.resize({ width, height, fit: "inside", withoutEnlargement: true });
    stream.jpeg({ quality: format === "display" ? 90 : 95, chromaSubsampling: "4:4:4" });
    return { stream, width, height, photoWidth, photoHeight };
  }
  const edge = Math.max(photoWidth, photoHeight);
  const border = Math.max(1, Math.round(edge * 0.035));
  const footer = Math.max(1, Math.round(edge * 0.09));
  const fontSize = Math.max(1, Math.round(edge * 0.014));
  const width = photoWidth + border * 2;
  const height = photoHeight + border * 2 + footer;
  const xml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
  const text = (value: string, size: number, color: string, maxWidth = photoWidth) => sharp({ text: {
    text: `<span foreground="${color}">${xml(value)}</span>`, font: `Instrument Sans ${Math.max(1, size)}`,
    fontfile: join(process.cwd(), "features/photo-portfolio/fonts/instrumentsans-share.ttf"), rgba: true, dpi: 72,
  } }).resize({ width: Math.max(1, maxWidth), withoutEnlargement: true }).png().toBuffer();
  const [caption, attribution, website, watermark] = await Promise.all([
    text(title.trim() || "Untitled photograph", fontSize, "#25272a"),
    text("Photographs by Isaac Jiang", Math.round(fontSize * 0.62), "#62656b", Math.floor(photoWidth * 0.6)),
    text("isaacjiang.ca", Math.round(fontSize * 0.62), "#62656b", Math.floor(photoWidth * 0.35)),
    text("IJ.PRIME", Math.round(fontSize * 0.7), "#ffffff"),
  ]);
  const websiteSize = await sharp(website).metadata();
  const wm = await sharp(watermark).metadata();
  const pad = Math.max(1, Math.round(fontSize * 0.35));
  const badge = await sharp({ create: { width: wm.width! + pad * 2, height: wm.height! + pad * 2,
    channels: 4, background: { r: 20, g: 21, b: 23, alpha: 0.55 } } })
    .composite([{ input: watermark, left: pad, top: pad }]).png().toBuffer();
  const framed = image.rotate().flatten({ background: "#ffffff" })
    .extend({ top: border, bottom: border + footer, left: border, right: border, background: "#ffffff" })
    .composite([
      { input: badge, left: border + photoWidth - wm.width! - pad * 4, top: border + photoHeight - wm.height! - pad * 4 },
      { input: caption, left: border, top: border + photoHeight + Math.round(footer * 0.28) },
      { input: attribution, left: border, top: border + photoHeight + Math.round(footer * 0.62) },
      { input: website, left: border + photoWidth - websiteSize.width!, top: border + photoHeight + Math.round(footer * 0.62) },
    ]);
  // Sharp resizes before composition. Resize the completed frame for HD/preview,
  // otherwise the full-resolution overlays would exceed the preview canvas.
  if (format === "preview" || format === "png-hd") {
    const edgeLimit = format === "preview" ? 1000 : 1920;
    const ratio = Math.min(1, edgeLimit / Math.max(width, height));
    const resizedWidth = Math.max(1, Math.round(width * ratio));
    const resizedHeight = Math.max(1, Math.round(height * ratio));
    const resized = sharp(await framed.png().toBuffer()).resize(resizedWidth, resizedHeight);
    const stream = format === "preview" ? resized.jpeg({ quality: 85 }) : resized.png();
    // Preview headers describe the full-size export shown in the dialog.
    return { stream, width: format === "preview" ? width : resizedWidth,
      height: format === "preview" ? height : resizedHeight, photoWidth, photoHeight };
  }
  const stream = format === "png" ? framed.png() : framed.jpeg({ quality: 95, chromaSubsampling: "4:4:4" });
  return { stream, width, height, photoWidth, photoHeight };
}
