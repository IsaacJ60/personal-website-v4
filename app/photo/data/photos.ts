import type { PhotoImage } from "../types";
import { COLLECTIONS_DATA } from "./collections";

// Flatten all images from all collections into one comprehensive archive
export function getAllPhotos(): PhotoImage[] {
  const allPhotos: PhotoImage[] = [];

  COLLECTIONS_DATA.forEach((collection) => {
    allPhotos.push(...collection.images);
  });

  // Ensure uniqueness by ID
  const uniquePhotos = Array.from(new Map(allPhotos.map((photo) => [photo.id, photo])).values());

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
export function filterPhotos(
  photos: PhotoImage[],
  filters: {
    search?: string;
    locations?: string[];
    categories?: string[];
    tags?: string[];
    startDate?: string;
    endDate?: string;
  }
): PhotoImage[] {
  return photos.filter((photo) => {
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
