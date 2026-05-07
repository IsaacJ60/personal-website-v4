export type PhotoCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PhotoFocusPoint = {
  x: number;
  y: number;
};

export type PhotoImage = {
  id?: string;
  src: string;
  alt?: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  dateTaken?: string;
  locationName?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  categories?: string[];
  tags?: string[];
  albumId?: string;
  featured?: boolean;
  focusPoint?: PhotoFocusPoint;
  crop?: PhotoCrop;
};

export type PhotoImageInput = string | PhotoImage;

export function normalizePhotoImage(image: PhotoImageInput, index: number): PhotoImage {
  if (typeof image === "string") {
    return {
      id: image,
      src: image,
      alt: `Photo ${index + 1}`,
    };
  }

  return {
    id: image.id ?? image.src,
    alt: image.alt ?? image.title ?? `Photo ${index + 1}`,
    ...image,
  };
}
