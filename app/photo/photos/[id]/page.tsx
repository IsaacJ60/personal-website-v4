import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPhotoById, getAllPhotoIds } from "../../data/collections";
import BackToPhotosButton from "../../components/BackToPhotosButton";

export const dynamicParams = true;

export async function generateStaticParams() {
  const ids = getAllPhotoIds();
  return ids.map((id) => ({
    id,
  }));
}

interface PhotoDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PhotoDetailPage({ params }: PhotoDetailPageProps) {
  const { id } = await params;
  const photo = getPhotoById(id);

  if (!photo) {
    notFound();
  }

  const allIds = getAllPhotoIds();
  const currentIndex = allIds.indexOf(id);
  const prevId = currentIndex > 0 ? allIds[currentIndex - 1] : null;
  const nextId = currentIndex < allIds.length - 1 ? allIds[currentIndex + 1] : null;

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 py-6 px-4 mt-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-5 flex items-center gap-3">
          <h1 className="min-w-0 flex-1 truncate text-3xl font-bold tracking-tight">
            {photo.title}
          </h1>

          <BackToPhotosButton />

          <div className="flex flex-shrink-0 items-center gap-3">
            <div className="flex items-center gap-1">
              {prevId ? (
                <Link
                  href={`/photo/photos/${prevId}`}
                  className="px-2 py-2 rounded-l-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={18} />
                </Link>
              ) : (
                <div className="px-2 py-2 rounded-l-md border border-neutral-300 dark:border-neutral-700 opacity-30 cursor-not-allowed">
                  <ChevronLeft size={18} />
                </div>
              )}

              {nextId ? (
                <Link
                  href={`/photo/photos/${nextId}`}
                  className="px-2 py-2 rounded-r-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                  aria-label="Next photo"
                >
                  <ChevronRight size={18} />
                </Link>
              ) : (
                <div className="px-2 py-2 rounded-r-md border border-neutral-300 dark:border-neutral-700 opacity-30 cursor-not-allowed">
                  <ChevronRight size={18} />
                </div>
              )}
            </div>

            <Link
              href="/photo/gallery"
              className="px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            >
              All
            </Link>
          </div>
        </div>

        {/* Image & Sidebar Grid */}
        <div className="grid gap-8 md:grid-cols-4">
          {/* Main Image */}
          <div className="md:col-span-3">
            <div className="rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900">
              <div className="relative w-full">
                <Image
                  src={photo.src}
                  alt={photo.alt || photo.title || "Photo"}
                  width={800}
                  height={600}
                  unoptimized
                  className="w-full h-auto"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 800px"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Sidebar: Description + Metadata */}
          <div>
            <div className="text-sm font-medium leading-5 text-muted-foreground mb-2">
              {currentIndex + 1} / {allIds.length}
            </div>

            {photo.description && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {photo.description}
                </p>
              </div>
            )}

            {photo.dateTaken && (
              <div className="mb-6">
                <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                  Date Taken
                </h3>
                <p className="text-sm">{photo.dateTaken}</p>
              </div>
            )}

            {photo.categories && photo.categories.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                  Category
                </h3>
                <div className="flex flex-wrap gap-2">
                  {photo.categories.map((cat) => (
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

            {photo.locationName && (
              <div className="mb-6">
                <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                  Location
                </h3>
                <p className="text-sm">{photo.locationName}</p>
              </div>
            )}

            {photo.tags && photo.tags.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {photo.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
