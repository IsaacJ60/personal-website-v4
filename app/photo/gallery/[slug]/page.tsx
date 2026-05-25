import { notFound } from "next/navigation";
import BackToPhotosButton from "../../components/BackToPhotosButton";
import PhotoGalleryPage from "../../components/PhotoGalleryPage";
import type { GalleryTile } from "../../types";
import { getCollectionBySlug, getCollectionSlugs, getPhotoById } from "../../data/collections";
import type { CatalogPhoto } from "../../data/collections";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCollectionSlugs().map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return {};

  return {
    title: `${collection.title} — Photo Gallery`,
    description: collection.longDescription || collection.description,
  };
}

export default async function CollectionGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  const galleryItems = (await Promise.all(collection.items.map(async (item): Promise<GalleryTile | null> => {
    if ("photoIds" in item) {
      const photos = (await Promise.all(item.photoIds.map((id) => getPhotoById(id))))
        .filter((p): p is CatalogPhoto => !!p && !!p.src);
      const coverPhoto = photos.find((photo) => photo.id === item.photoIds[0]) ?? photos[0];
      const peekSrcs = photos
        .filter((photo) => photo.id !== item.photoIds[0])
        .map((photo) => photo.src)
        .slice(0, 4);

      if (!coverPhoto) {
        return null;
      }

      return {
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
      };
    }

    if (!item.id) {
      return {
        ...item,
        href: "",
        isBundle: false,
      };
    }

    return {
      ...item,
      href: `/photo/photos/${item.id}`,
      isBundle: false,
    };
  }))).filter((item): item is GalleryTile => item !== null);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 space-y-8">
      <PhotoGalleryPage
        title={collection.title}
        description={collection.longDescription || collection.description}
        items={galleryItems}
        action={<BackToPhotosButton />}
      />
    </main>
  );
}
