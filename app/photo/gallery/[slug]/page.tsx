import { notFound } from "next/navigation";
import BackToPhotosButton from "../../components/BackToPhotosButton";
import PhotoGalleryPage from "../../components/PhotoGalleryPage";
import { getCollectionBySlug, getCollectionSlugs } from "../../data/collections";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCollectionSlugs().map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) return {};

  return {
    title: `${collection.title} — Photo Gallery`,
    description: collection.longDescription || collection.description,
  };
}

export default async function CollectionGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 space-y-8">
      <PhotoGalleryPage
        title={collection.title}
        description={collection.longDescription || collection.description}
        images={collection.images}
        action={<BackToPhotosButton />}
      />
    </main>
  );
}
