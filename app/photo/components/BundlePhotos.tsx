"use client";

import Image from "next/image";
import Link from "next/link";
import type { CatalogPhoto } from "../data/collections";

type BundlePhotosProps = {
  photos: CatalogPhoto[];
};

export default function BundlePhotos({ photos }: BundlePhotosProps) {
  if (photos.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight mb-6">Related Photos in Bundle</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <Link
            key={photo.id}
            href={`/photo/photos/${photo.id}`}
            className="group block overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200 dark:bg-neutral-900">
              <Image
                src={photo.src}
                alt={photo.alt ?? photo.title ?? "Photo"}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                {photo.title ? (
                  <h3 className="min-w-0 text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
                    {photo.title}
                  </h3>
                ) : null}

                {photo.dateTaken ? (
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{photo.dateTaken}</span>
                ) : null}
              </div>

              <div className="mt-3 flex items-center justify-between gap-4">
                {photo.locationName ? (
                  <div className="text-sm text-muted-foreground min-w-0 max-w-[50%] truncate">{photo.locationName}</div>
                ) : <div />}

                {photo.categories?.[0] ? (
                  <span className="inline-block rounded-md bg-white/80 dark:bg-neutral-800/70 px-3 py-1 text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate whitespace-nowrap max-w-[50%]">
                    {photo.categories[0]}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
