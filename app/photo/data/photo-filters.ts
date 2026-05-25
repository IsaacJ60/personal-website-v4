import type { GalleryTile, PhotoImage } from "../types";

export type PhotoFilters = {
  search?: string;
  locations?: string[];
  categories?: string[];
  tags?: string[];
  startDate?: string;
  endDate?: string;
  bundleMode?: "both" | "bundles" | "photos";
};

export function filterPhotos<T extends PhotoImage>(
  photos: T[],
  filters: PhotoFilters
): T[] {
  return photos.filter((photo) => {
    const galleryTile = photo as unknown as Partial<GalleryTile>;

    if (filters.bundleMode === "bundles" && galleryTile.isBundle !== true) {
      return false;
    }

    if (filters.bundleMode === "photos" && galleryTile.isBundle === true) {
      return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();

      const matches =
        (photo.title?.toLowerCase().includes(searchLower) ?? false) ||
        (photo.alt?.toLowerCase().includes(searchLower) ?? false) ||
        (photo.description?.toLowerCase().includes(searchLower) ?? false);

      if (!matches) {
        return false;
      }
    }

    if (
      filters.locations?.length &&
      (!photo.locationName ||
        !filters.locations.includes(photo.locationName))
    ) {
      return false;
    }

    if (
      filters.categories?.length &&
      (!photo.categories ||
        !photo.categories.some((category) =>
          filters.categories!.includes(category)
        ))
    ) {
      return false;
    }

    if (
      filters.tags?.length &&
      (!photo.tags || !photo.tags.some((tag) => filters.tags!.includes(tag)))
    ) {
      return false;
    }

    if (
      filters.startDate &&
      photo.dateTaken &&
      photo.dateTaken < filters.startDate
    ) {
      return false;
    }

    if (
      filters.endDate &&
      photo.dateTaken &&
      photo.dateTaken > filters.endDate
    ) {
      return false;
    }

    return true;
  });
}