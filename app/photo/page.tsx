import Link from "next/link";
import FeaturedCarousel from "./components/FeaturedCarousel";
import CollectionsSection from "./components/CollectionsSection";
import { getPhotoById } from "./data/collections";

export const metadata = {
  title: "Photo Viewer",
};

export default function Page() {
  // Get featured photos
  const featuredPhotoIds = [
    "raven-close-up",
    "sunset-couple",
    "blossom-girl",
    "moon-and-blossom",
    "fuel-trails",
    "greater-yellowtails",
    "twin-falls-lynn-canyon",
    "mountain-vancouver",
  ];

  const featuredPhotos = featuredPhotoIds
    .map((id) => getPhotoById(id))
    .filter((photo) => photo !== undefined);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <header className="pb-6 border-neutral-200 dark:border-neutral-800 relative pr-28 sm:pr-32">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold">IJ.PRIME</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Explore my photographs and discover the stories behind each image. Find me on instagram: @<u><a href="https://instagram.com/ij.prime" target="_blank" rel="noopener noreferrer">ij.prime</a></u></p>
        </div>

        <Link href="/" className="absolute right-0 top-0 inline-block rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900">Home</Link>
      </header>

      <section className="space-y-4 mt-6">
        <div className="px-6 pt-6 pb-3 rounded-xl bg-neutral-50 dark:bg-neutral-900">
          <div className="max-w-4xl mx-auto">
            <FeaturedCarousel photos={featuredPhotos} />
          </div>
        </div>
        <CollectionsSection />
      </section>
    </main>
  );
}
