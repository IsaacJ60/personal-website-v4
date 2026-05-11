import BackToPhotosButton from "../components/BackToPhotosButton";
import PhotoSearch from "../components/PhotoSearch";
import {
  getAllPhotos,
  getUniqueDatesTaken,
  getUniqueLocations,
  getUniqueCategories,
  getUniqueTags,
} from "../data/photos";

export const metadata = {
  title: "Photo Search — All Photos",
  description: "Search and filter through all photos by location, category, date, and more.",
};

export default function PhotoSearchPage() {
  const allPhotos = getAllPhotos();
  const locations = getUniqueLocations();
  const categories = getUniqueCategories();
  const tags = getUniqueTags();
  const dates = getUniqueDatesTaken();

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Gallery</p>
          <h1 className="text-3xl font-bold">Search all photos</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Browse and filter through the entire photo archive. Search by title, location, category, or date.
          </p>
        </div>

        <BackToPhotosButton href="/photo" label="Back to Photo Home" />
      </header>

      <PhotoSearch
        allPhotos={allPhotos}
        locations={locations}
        categories={categories}
        tags={tags}
        dates={dates}
      />

    </main>
  );
}
