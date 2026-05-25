import "server-only";

import type { GalleryTile } from "../types";
import {
  getCollectionsData,
  getBundlePhotos,
} from "./collections";

/**
 * Flatten all gallery items from all collections into one comprehensive archive.
 *
 * Photos now come from Supabase through collections.ts, so this function
 * must be asynchronous.
 */
export async function getAllPhotos(): Promise<GalleryTile[]> {
  const collections = await getCollectionsData();
  const allPhotos: GalleryTile[] = [];

  for (const collection of collections) {
    for (const item of collection.items) {
      if ("photoIds" in item) {
        const bundlePhotos = await getBundlePhotos(item.id);
        if (bundlePhotos.length === 0) {
          continue;
        }

        /*
   * The card's main src is the first ordered bundle photo.
   * peekSrcs contains the next three images.
   * Together, the UI has up to four photos for its mosaic.
   */
        const [primaryPhoto, ...remainingPhotos] = bundlePhotos;
        const peekSrcs = remainingPhotos
          .slice(0, 3)
          .map((photo) => photo.src);

        allPhotos.push({
          ...primaryPhoto,
          id: item.id,
          title: item.title,
          alt: item.title,
          description: item.description,
          dateTaken: item.dateTaken,
          locationName: item.locationName,
          categories: item.categories,
          href: `/photo/bundles/${item.id}`,
          badgeLabel: `Bundle • ${bundlePhotos.length}`,
          peekSrcs,
          photoCount: Math.min(bundlePhotos.length, 4),
          isBundle: true,
        });

        continue;
      }

      allPhotos.push({
        ...item,
        href: `/photo/photos/${item.id}`,
        isBundle: false,
      });
    }
  }

  // Ensure uniqueness by destination and id so bundles and photos can coexist.
  return Array.from(
    new Map(
      allPhotos.map((photo) => [`${photo.href}|${photo.id}`, photo])
    ).values()
  );
}