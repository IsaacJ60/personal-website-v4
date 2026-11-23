import exifr from "exifr";
import { sourceMaxBytes, uploadDisplayBounds, uploadMaxBytes } from "./upload-media";

async function capturedDate(file: File) {
  try {
    const tags = await exifr.parse(file, { pick: ["DateTimeOriginal", "CreateDate"] });
    const date = tags?.DateTimeOriginal ?? tags?.CreateDate;
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return "";
    return [
      String(date.getFullYear()).padStart(4, "0"),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  } catch {
    return "";
  }
}

async function displayWebp(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error("Couldn’t open this photo. Try another JPEG, PNG, or WebP."); }
  try {
    const ratio = Math.min(1, uploadDisplayBounds.width / bitmap.width, uploadDisplayBounds.height / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser couldn’t prepare the image.");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!image || image.type !== "image/webp") throw new Error("This browser couldn’t create the WebP. Try another browser.");
    if (image.size > uploadMaxBytes) throw new Error("The prepared image is too large. Try a smaller export.");
    return image;
  } finally {
    bitmap.close();
  }
}

export async function prepareLocalPhoto(file: File) {
  if (file.size === 0 || file.size > sourceMaxBytes) throw new Error("Choose a photo under 30 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)
    && (file.type || !/\.(jpe?g|png|webp)$/i.test(file.name))) {
    throw new Error("Choose a JPEG, PNG, or WebP photo.");
  }
  const [image, date] = await Promise.all([displayWebp(file), capturedDate(file)]);
  return { image, date };
}
