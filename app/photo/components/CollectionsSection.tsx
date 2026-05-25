import Image from "next/image";
import Link from "next/link";
import { getCollectionsData } from "../data/collections";

export default async function CollectionsSection() {
  const collections = await getCollectionsData();

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Collections</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Browse by theme</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Six curated collections of moments, places, and perspectives.
          </p>
        </div>
        <Link
          href="/photo/gallery"
          className="mt-0.5 whitespace-nowrap rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium leading-5 text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900"
        >
          Browse all photos →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection) => (
          <Link
            key={collection.slug}
            href={`/photo/gallery/${collection.slug}`}
            className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-neutral-800"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={collection.coverSrc}
                alt={collection.coverAlt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">{collection.title}</h3>
                  <p className="mt-1 max-w-xs text-sm text-white/75">{collection.description}</p>
                </div>
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                  {collection.count}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
