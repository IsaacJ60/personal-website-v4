import BackToPhotosButton from "../components/BackToPhotosButton";
import PhotoSearch from "../components/PhotoSearch";
import { getAllPhotos } from "../data/photos";

export const metadata = {
  title: "Photo Search — All Photos",
  description:
    "Search and filter through all photos by location, category, date, and more.",
};

export default async function PhotoSearchPage() {
  const allPhotos = await getAllPhotos();

  const locations = Array.from(
    new Set(
      allPhotos
        .map((photo) => photo.locationName)
        .filter((location): location is string => Boolean(location))
    )
  ).sort();

  const categories = Array.from(
    new Set(
      allPhotos.flatMap((photo) => photo.categories ?? [])
    )
  ).sort();

  const tags = Array.from(
    new Set(
      allPhotos.flatMap((photo) => photo.tags ?? [])
    )
  ).sort();

  const dates = Array.from(
    new Set(
      allPhotos
        .map((photo) => photo.dateTaken)
        .filter((date): date is string => Boolean(date))
    )
  )
    .sort()
    .reverse();

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Gallery
          </p>

          <h1 className="text-3xl font-bold">Search all photos</h1>

          <p className="max-w-2xl text-sm text-muted-foreground">
            Browse and filter through the entire photo archive. Search by
            title, location, category, or date.
          </p>
        </div>

        <div className="self-center">
          <BackToPhotosButton href="/photo" label="Photo Home" />
        </div>
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