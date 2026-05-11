import Link from "next/link";
import { notFound } from "next/navigation";
import type { GalleryTile } from "../../types";
import { getBundleById, getBundlePhotos, getAllBundleIds } from "../../data/collections";
import BackToPhotosButton from "../../components/BackToPhotosButton";
import PhotoCard from "../../components/PhotoCard";

export const dynamicParams = true;

export async function generateStaticParams() {
  const ids = getAllBundleIds();
  return ids.map((id) => ({
    id,
  }));
}

interface BundleDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BundleDetailPage({ params }: BundleDetailPageProps) {
  const { id } = await params;
  const bundle = getBundleById(id);

  if (!bundle) {
    notFound();
  }

  const photos = getBundlePhotos(id);

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex-1">
            <BackToPhotosButton className="mb-4" />
            <h1 className="text-4xl font-bold tracking-tight mb-2">{bundle.title}</h1>
            {bundle.description && (
              <p className="text-lg text-muted-foreground max-w-2xl">{bundle.description}</p>
            )}
          </div>
          <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {photos.length} photo{photos.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Metadata */}
        <div className="mb-8 grid gap-6 sm:grid-cols-3">
          {bundle.dateTaken && (
            <div>
              <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                Date Taken
              </h3>
              <p className="text-sm">{bundle.dateTaken}</p>
            </div>
          )}
          {bundle.locationName && (
            <div>
              <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                Location
              </h3>
              <p className="text-sm">{bundle.locationName}</p>
            </div>
          )}
          {bundle.categories && bundle.categories.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                Category
              </h3>
              <div className="flex flex-wrap gap-2">
                {bundle.categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/photo/gallery`}
                    className="inline-block px-3 py-1 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Photos Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => {
            const galleryTile: GalleryTile = {
              ...photo,
              href: `/photo/photos/${photo.id}`,
            };
            return (
              <PhotoCard key={photo.id} image={galleryTile} />
            );
          })}
        </div>
      </div>
    </main>
  );
}
