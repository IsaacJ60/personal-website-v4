import FeaturedCarousel from "./components/FeaturedCarousel";
import CollectionsSection from "./components/CollectionsSection";
import BackToPhotosButton from "./components/BackToPhotosButton";
import { getAllPhotos } from "./data/photos";
import PhotosByDate from "./components/PhotosByDate";

export const metadata = {
  title: "Photo Viewer",
};

export default async function Page() {
  const allPhotos = await getAllPhotos();

  // Recent work — pick latest 5 items, including bundle covers and photos.
  const recentPhotos = allPhotos
    .filter((photo) => Boolean(photo.dateTaken))
    .sort((a, b) => {
      if (!a.dateTaken || !b.dateTaken) {
        return 0;
      }

      return b.dateTaken.localeCompare(a.dateTaken);
    })
    .slice(0, 5);

  // FeaturedCarousel expects every item to have an id string.
  const recentPhotosWithId = recentPhotos.map((photo) => ({
    ...photo,
    id: photo.id ?? photo.src,
  }));

  // Build date -> photos map for the calendar component.
  const dateMap: Record<
    string,
    { id: string; src: string; title?: string; alt?: string; href?: string }[]
  > = {};

  allPhotos.forEach((photo) => {
    if (!photo.dateTaken) {
      return;
    }

    const id = photo.id ?? photo.src;

    const entry = {
      id,
      src: photo.src,
      title: photo.title,
      alt: photo.alt ?? photo.title,
      href: photo.href ?? `/photo/photos/${id}`,
    };

    if (!dateMap[photo.dateTaken]) {
      dateMap[photo.dateTaken] = [];
    }

    dateMap[photo.dateTaken].push(entry);
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <header className="flex items-center justify-between border-neutral-200 pb-6 dark:border-neutral-800">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold">IJ.PRIME</h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Explore my photographs and discover the stories behind each image.
            Find me on Instagram: @
            <a
              href="https://instagram.com/ij.prime"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              ij.prime
            </a>
          </p>
        </div>

        <div className="ml-4">
          <BackToPhotosButton href="/" label="Home" />
        </div>
      </header>

      <section className="mt-6 space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 pb-2 pt-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto max-w-5xl">
            <FeaturedCarousel photos={recentPhotosWithId} />
          </div>
        </div>

        <CollectionsSection />

        <div className="pb-6">
          <PhotosByDate dateMap={dateMap} />
        </div>
      </section>
    </main>
  );
}