import FeaturedCarousel from "./components/FeaturedCarousel";
import CollectionsSection from "./components/CollectionsSection";
import BackToPhotosButton from "./components/BackToPhotosButton";
import { getAllPhotos } from "./data/photos";
import PhotosByDate from "./components/PhotosByDate";

export const metadata = {
  title: "Photo Viewer",
};

export default function Page() {
  // Recent work — pick latest 5 items (include bundle covers and photos) by dateTaken
  const recentPhotos = getAllPhotos()
    .filter((p) => !!p.dateTaken)
    .sort((a, b) => (b.dateTaken! > a.dateTaken! ? 1 : b.dateTaken! < a.dateTaken! ? -1 : 0))
    .slice(0, 5);
  // Ensure each item has an `id` string (FeaturedCarousel expects it)
  const recentPhotosWithId = recentPhotos.map((p) => ({ ...p, id: p.id ?? p.src }));

  // Build date -> photos map for calendar component
  const allPhotos = getAllPhotos();
  const dateMap: Record<string, { id: string; src: string; alt?: string; href?: string }[]> = {};
  allPhotos.forEach((p) => {
    if (!p.dateTaken) return;
    const key = p.dateTaken;
    const entry = { id: p.id ?? p.src, src: p.src, alt: p.alt ?? p.title, href: p.href ?? `/photo/photos/${p.id ?? p.src}` };
    if (!dateMap[key]) dateMap[key] = [];
    dateMap[key].push(entry);
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <header className="flex items-center justify-between pb-6 border-neutral-200 dark:border-neutral-800">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold">IJ.PRIME</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Explore my photographs and discover the stories behind each image. Find me on instagram: @<u><a href="https://instagram.com/ij.prime" target="_blank" rel="noopener noreferrer">ij.prime</a></u></p>
        </div>

        <div className="ml-4">
          <BackToPhotosButton href="/" label="Home" />
        </div>
      </header>

      <section className="space-y-4 mt-6">
        <div className="px-6 pt-4 pb-2 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl">
          <div className="max-w-5xl mx-auto">
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
