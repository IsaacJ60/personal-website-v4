import 'server-only';

import { cache } from "react";
import { createPublicClient } from "@/utils/supabase/public";

import type { PhotoImage, Bundle } from "../types";

export type CollectionItemResult = CatalogPhoto | Bundle;

export type Collection = {
  slug: string;
  title: string;
  description: string;
  longDescription?: string;
  count: string;
  coverSrc: string;
  coverAlt: string;
  items: CollectionItemResult[];
  images: PhotoImage[];
};

type CollectionDefinition = Omit<
  Collection,
  "count" | "items" | "images"
> & {
  category: string;
};

export type CatalogPhoto = PhotoImage & { id: string; portfolioOrder: number | null };

type PhotoRow = {
  slug: string;
  object_key: string;
  title: string;
  date_taken: string;
  categories: string[];
  alt_text: string;
  description: string | null;
  location: string | null;
  published: boolean;
  portfolio_order: number | null;
};

type BundleRow = {
  id: string;
  title: string;
  description: string | null;
  categories: string[];
  date_taken: string | null;
  location_name: string | null;
  published: boolean;
};

type BundlePhotoRow = {
  bundle_id: string;
  photo_slug: string;
  position: number;
};

const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "https://media.isaacjiang.ca";

const PHOTO_COLUMNS = `slug, object_key, title, date_taken, categories, alt_text, description, location, published, portfolio_order`;

function r2(objectKey: string): string {
  const encodedPath = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${MEDIA_BASE_URL}/camera/${encodedPath}`;
}

function toCatalogPhoto(row: PhotoRow): CatalogPhoto {
  return {
    id: row.slug,
    src: r2(row.object_key),
    alt: row.alt_text,
    title: row.title,
    description: row.description ?? undefined,
    dateTaken: row.date_taken,
    categories: row.categories ?? [],
    locationName: row.location ?? undefined,
    portfolioOrder: row.portfolio_order,
  };
}

function toBundle(row: BundleRow, photoIds: string[]): Bundle {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    photoIds,
    categories: row.categories ?? [],
    dateTaken: row.date_taken ?? undefined,
    locationName: row.location_name ?? undefined,
  };
}

const getPublishedPhotos = cache(async (): Promise<CatalogPhoto[]> => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("photos")
    .select(PHOTO_COLUMNS)
    .eq("published", true)
    .order("portfolio_order", { ascending: true, nullsFirst: false })
    .order("date_taken", { ascending: false });

  if (error) {
    throw new Error(`Failed to load photos: ${error.message}`);
  }

  return ((data ?? []) as PhotoRow[]).map(toCatalogPhoto);
});

const getPublishedPhotoMap = cache(
  async (): Promise<Map<string, CatalogPhoto>> => {
    const photos = await getPublishedPhotos();

    return new Map(
      photos.map((photoItem) => [photoItem.id, photoItem])
    );
  }
);

const getPublishedBundles = cache(async (): Promise<Bundle[]> => {
  const supabase = createPublicClient();

  const [photoMap, bundlesResult, membershipResult] = await Promise.all([
    getPublishedPhotoMap(),

    supabase
      .from("bundles")
      .select(`
        id,
        title,
        description,
        categories,
        date_taken,
        location_name,
        published
      `)
      .eq("published", true),

    supabase
      .from("bundle_photos")
      .select("bundle_id, photo_slug, position")
      .order("position", { ascending: true }),
  ]);

  if (bundlesResult.error) {
    throw new Error(
      `Failed to load bundles: ${bundlesResult.error.message}`
    );
  }

  if (membershipResult.error) {
    throw new Error(
      `Failed to load bundle photos: ${membershipResult.error.message}`
    );
  }

  const photoIdsByBundle = new Map<string, string[]>();

  for (const row of (membershipResult.data ?? []) as BundlePhotoRow[]) {
    /*
     * Only include photos that are themselves publicly published.
     * This prevents a published bundle from exposing an unpublished photo.
     */
    if (!photoMap.has(row.photo_slug)) {
      continue;
    }

    const existing = photoIdsByBundle.get(row.bundle_id) ?? [];
    existing.push(row.photo_slug);
    photoIdsByBundle.set(row.bundle_id, existing);
  }

  return ((bundlesResult.data ?? []) as BundleRow[]).map((row) =>
    toBundle(row, photoIdsByBundle.get(row.id) ?? [])
  );
});

const getPublishedBundleMap = cache(
  async (): Promise<Map<string, Bundle>> => {
    const bundles = await getPublishedBundles();

    return new Map(
      bundles.map((bundle) => [bundle.id, bundle])
    );
  }
);

export async function getBundleById(
  id: string
): Promise<Bundle | undefined> {
  const bundleMap = await getPublishedBundleMap();

  return bundleMap.get(id);
}

export async function getAllBundleIds(): Promise<string[]> {
  const bundles = await getPublishedBundles();

  return bundles.map((bundle) => bundle.id);
}

function getBundlePhotosFromMaps(
  bundleId: string,
  photoMap: Map<string, CatalogPhoto>,
  bundleMap: Map<string, Bundle>
): CatalogPhoto[] {
  const bundle = bundleMap.get(bundleId);

  if (!bundle) {
    return [];
  }

  return bundle.photoIds
    .map((photoId) => photoMap.get(photoId))
    .filter((photo): photo is CatalogPhoto => photo !== undefined);
}

export async function getBundlePhotos(
  bundleId: string
): Promise<CatalogPhoto[]> {
  const [photoMap, bundleMap] = await Promise.all([
    getPublishedPhotoMap(),
    getPublishedBundleMap(),
  ]);

  return getBundlePhotosFromMaps(bundleId, photoMap, bundleMap);
}

function requirePhoto(
  id: string,
  photoMap: Map<string, CatalogPhoto>
): CatalogPhoto {
  const photoItem = photoMap.get(id);

  if (!photoItem) {
    throw new Error(`Unknown or unpublished photo id: ${id}`);
  }

  return photoItem;
}

function isInCategory(
  categories: string[] | undefined,
  category: string
): boolean {
  return categories?.includes(category) ?? false;
}

function getBundlePhotoSlugSet(bundles: Bundle[]): Set<string> {
  return new Set(
    bundles.flatMap((bundle) => bundle.photoIds)
  );
}

function createDynamicCollection(
  definition: CollectionDefinition,
  photos: CatalogPhoto[],
  bundles: Bundle[]
): Collection {
  const collectionBundles = bundles.filter((bundle) =>
    isInCategory(bundle.categories, definition.category)
  );

  /*
   * Photos that are already represented inside a bundle should not also
   * appear as standalone tiles in the same collection.
   */
  const bundledPhotoIds = getBundlePhotoSlugSet(collectionBundles);

  const standalonePhotos = photos.filter(
    (photo) =>
      isInCategory(photo.categories, definition.category) &&
      !bundledPhotoIds.has(photo.id)
  );

  const items: CollectionItemResult[] = [
    ...collectionBundles,
    ...standalonePhotos,
  ];

  const images: PhotoImage[] = [
    ...collectionBundles.flatMap((bundle) =>
      bundle.photoIds
        .map((photoId) => photos.find((photo) => photo.id === photoId))
        .filter((photo): photo is CatalogPhoto => photo !== undefined)
    ),
    ...standalonePhotos,
  ];

  return {
    ...definition,
    count: String(items.length),
    items,
    images,
  };
}

const COLLECTION_DEFINITIONS: CollectionDefinition[] = [
  {
    slug: "landscapes",
    category: "Landscapes",
    title: "Landscapes",
    description: "Capturing the place we call home.",
    longDescription: "Mountains, skies, water, and quiet wide-open scenes.",
    coverSrc: r2("Twin Falls in Lynn Canyon.jpg"),
    coverAlt: "Twin falls in Lynn Canyon",
  },
  {
    slug: "people-portraits",
    category: "People & Portraits",
    title: "People & Portraits",
    description: "Everyone has a story to share.",
    longDescription: "Moments, movement, and figures against light.",
    coverSrc: r2("Sunset Couple.jpg"),
    coverAlt: "Sunset couple",
  },
  {
    slug: "urban-nature",
    category: "Urban Nature",
    title: "Urban Nature",
    description: "A blend of technology and nature.",
    longDescription: "City edges, blossoms, reflections, and atmosphere.",
    coverSrc: r2("Cherry Buildings.jpg"),
    coverAlt: "Cherry buildings",
  },
  {
    slug: "wildlife",
    category: "Wildlife",
    title: "Wildlife",
    description: "Those we share our home with.",
    longDescription: "Birds, close encounters, and small living details.",
    coverSrc: r2("Raven Close-up.jpg"),
    coverAlt: "Raven close-up",
  },
  {
    slug: "motion-aviation",
    category: "Motion & Aviation",
    title: "Motion & Aviation",
    description: "Can you feel the rush?",
    longDescription: "Planes, parachutes, and things moving through space.",
    coverSrc: r2("Flying Canopy.jpg"),
    coverAlt: "Flying canopy",
  },
  {
    slug: "abstract-detail",
    category: "Abstract & Detail",
    title: "Abstract & Detail",
    description: "It's what you make of it.",
    longDescription: "Textures, moon shots, and fragments of a scene.",
    coverSrc: r2("Moon and Blossom.jpg"),
    coverAlt: "Moon and blossoms",
  },
];

export async function getCollectionsData(): Promise<Collection[]> {
  const [photos, bundles] = await Promise.all([
    getPublishedPhotos(),
    getPublishedBundles(),
  ]);

  return COLLECTION_DEFINITIONS.map((definition) =>
    createDynamicCollection(definition, photos, bundles)
  );
}

export async function getCollectionBySlug(
  slug: string
): Promise<Collection | undefined> {
  const definition = COLLECTION_DEFINITIONS.find(
    (collection) => collection.slug === slug
  );

  if (!definition) {
    return undefined;
  }

  const [photos, bundles] = await Promise.all([
    getPublishedPhotos(),
    getPublishedBundles(),
  ]);

  return createDynamicCollection(definition, photos, bundles);
}

export function getCollectionSlugs(): string[] {
  return COLLECTION_DEFINITIONS.map((collection) => collection.slug);
}

export async function getPhotoById(
  id: string
): Promise<CatalogPhoto | undefined> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("photos")
    .select(PHOTO_COLUMNS)
    .eq("slug", id)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load photo "${id}": ${error.message}`);
  }

  return data ? toCatalogPhoto(data as PhotoRow) : undefined;
}

export async function getAllPhotoIds(): Promise<string[]> {
  const photos = await getPublishedPhotos();

  return photos.map((photoItem) => photoItem.id);
}



