export const photoMediaBucket = "portfolio-v3-media";
export const uploadMaxBytes = 3_500_000;
export const sourceMaxBytes = 30_000_000;
export const uploadDisplayBounds = { width: 1600, height: 1400 };
export const uploadThumbnailEdge = 480;

export type PhotoVariant = "display" | "thumbnail";

export function isPhotoVariant(value: string): value is PhotoVariant {
  return value === "display" || value === "thumbnail";
}

export function uploadedPhotoKey(id: string, variant: PhotoVariant = "display") {
  return `uploads/${id.toLowerCase()}/${variant}.webp`;
}

export function uploadedPhotoSrc(id: string, variant: PhotoVariant, published: boolean) {
  return `/api/photo-preview/${published ? "media" : "draft-media"}/${id}/${variant}`;
}
