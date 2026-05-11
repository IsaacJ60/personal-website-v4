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
    <main className="mx-auto max-w-6xl px-4 py-12 space-y-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bundle</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-3xl space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">{bundle.title}</h2>
              {bundle.description ? (
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{bundle.description}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-4 self-start pt-1">
              <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                {photos.length} photo{photos.length !== 1 ? "s" : ""}
              </div>
              <BackToPhotosButton href="/photo" label="Photo Home" />
            </div>
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
