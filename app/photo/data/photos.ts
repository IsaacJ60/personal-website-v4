import type { GalleryTile, PhotoImage } from "../types";
import { COLLECTIONS_DATA, getPhotoById } from "./collections";
import type { CatalogPhoto } from "./collections";

// Flatten all gallery items from all collections into one comprehensive archive
export function getAllPhotos(): GalleryTile[] {
  const allPhotos: GalleryTile[] = [];

  COLLECTIONS_DATA.forEach((collection) => {
    collection.items.forEach((item) => {
      if ("photoIds" in item) {
        const coverPhoto = getPhotoById(item.coverPhotoId);
        if (!coverPhoto) {
          return;
        }

        const peekSrcs = item.photoIds
          .map((id) => getPhotoById(id))
          .filter((p): p is CatalogPhoto => !!p && !!p.src)
          .map((p) => p.src)
          .slice(1, 5);

        allPhotos.push({
          ...coverPhoto,
          id: item.id,
          title: item.title,
          alt: item.title,
          description: item.description,
          dateTaken: item.dateTaken,
          locationName: item.locationName,
          categories: item.categories,
          href: `/photo/bundles/${item.id}`,
          badgeLabel: `Bundle • ${item.photoIds.length}`,
          peekSrcs,
          photoCount: Math.min(item.photoIds.length, 4),
          isBundle: true,
        });
        return;
      }

      if (item.id) {
        allPhotos.push({
          ...item,
          href: `/photo/photos/${item.id}`,
          isBundle: false,
        });
      }
    });
  });

  // Ensure uniqueness by destination and id so bundles and photos can coexist.
  const uniquePhotos = Array.from(
    new Map(allPhotos.map((photo) => [`${photo.href}|${photo.id}`, photo])).values()
  );

  return uniquePhotos;
}

// Get unique values for filter options
export function getUniqueDatesTaken(): string[] {
  const dates = new Set<string>();
  getAllPhotos().forEach((photo) => {
    if (photo.dateTaken) {
      dates.add(photo.dateTaken);
    }
  });
  return Array.from(dates).sort().reverse();
}

export function getUniqueLocations(): string[] {
  const locations = new Set<string>();
  getAllPhotos().forEach((photo) => {
    if (photo.locationName) {
      locations.add(photo.locationName);
    }
  });
  return Array.from(locations).sort();
}

export function getUniqueCategories(): string[] {
  const categories = new Set<string>();
  getAllPhotos().forEach((photo) => {
    if (photo.categories) {
      photo.categories.forEach((cat) => categories.add(cat));
    }
  });
  return Array.from(categories).sort();
}

export function getUniqueTags(): string[] {
  const tags = new Set<string>();
  getAllPhotos().forEach((photo) => {
    if (photo.tags) {
      photo.tags.forEach((tag) => tags.add(tag));
    }
  });
  return Array.from(tags).sort();
}

// Filter photos
export function filterPhotos<T extends PhotoImage>(
  photos: T[],
  filters: {
    search?: string;
    locations?: string[];
    categories?: string[];
    tags?: string[];
    startDate?: string;
    endDate?: string;
    bundleMode?: "both" | "bundles" | "photos";
  }
): T[] {
  return photos.filter((photo) => {
    const galleryTile = photo as unknown as Partial<GalleryTile>;

    if (filters.bundleMode === "bundles" && galleryTile.isBundle !== true) {
      return false;
    }

    if (filters.bundleMode === "photos" && galleryTile.isBundle === true) {
      return false;
    }

    // Text search in title, alt, description
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matches =
        (photo.title?.toLowerCase().includes(searchLower) ?? false) ||
        (photo.alt?.toLowerCase().includes(searchLower) ?? false);
      if (!matches) return false;
    }

    // Location filter
    if (filters.locations && filters.locations.length > 0) {
      if (!photo.locationName || !filters.locations.includes(photo.locationName)) {
        return false;
      }
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      if (
        !photo.categories ||
        !photo.categories.some((cat) => filters.categories!.includes(cat))
      ) {
        return false;
      }
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      if (!photo.tags || !photo.tags.some((tag) => filters.tags!.includes(tag))) {
        return false;
      }
    }

    // Date range filter
    if (filters.startDate && photo.dateTaken && photo.dateTaken < filters.startDate) {
      return false;
    }
    if (filters.endDate && photo.dateTaken && photo.dateTaken > filters.endDate) {
      return false;
    }

    return true;
  });
}
