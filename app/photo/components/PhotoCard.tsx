"use client";

import Image from "next/image";
import Link from "next/link";
import type { GalleryTile } from "../types";

type PhotoCardProps = {
  image: GalleryTile;
  href?: string;
  badgeLabel?: string;
};

export default function PhotoCard({ image, href, badgeLabel }: PhotoCardProps) {
  const primaryCategory = image.categories?.[0];
  const objectPosition = image.focusPoint
    ? `${image.focusPoint.x * 100}% ${image.focusPoint.y * 100}%`
    : undefined;

  return (
    <Link
      href={href ?? `/photo/photos/${image.id}`}
      className="group block overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200 dark:bg-neutral-900">
        {/* if bundle has peekSrcs, render the cover as sliced blinds across the full area */}
        {image.peekSrcs && image.peekSrcs.length > 0 ? (
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 flex">
              {(() => {
                const sliceCount = Math.min(image.photoCount ?? 4, 4);
                const sources = [image.src, ...(image.peekSrcs ?? [])].slice(0, sliceCount);

                return sources.map((src, i) => {
                  const sliceWidth = 100 / sliceCount;
                  return (
                    <div
                      key={`${src}-${i}`}
                      className="relative h-full overflow-hidden"
                      style={{ width: `${sliceWidth}%` }}
                    >
                      <Image
                        src={src}
                        alt={image.alt ?? image.title ?? "Photo"}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        style={objectPosition ? { objectPosition } : undefined}
                        sizes="(max-width: 640px) 25vw, (max-width: 1024px) 20vw, 10vw"
                      />
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <Image
            src={image.src}
            alt={image.alt ?? image.title ?? "Photo"}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105 z-0"
            style={objectPosition ? { objectPosition } : undefined}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        )}

        {badgeLabel ? (
          <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
            {badgeLabel}
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {image.title ? (
            <h3 className="min-w-0 text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
              {image.title}
            </h3>
          ) : null}

          {image.dateTaken ? (
            <span className="text-sm text-muted-foreground whitespace-nowrap">{image.dateTaken}</span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          {image.locationName ? (
            <div className="text-sm text-muted-foreground min-w-0 max-w-[50%] truncate">{image.locationName}</div>
          ) : <div />}

          {primaryCategory ? (
            <span className="inline-block rounded-md bg-white/80 dark:bg-neutral-800/70 px-3 py-1 text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate whitespace-nowrap max-w-[50%]">
              {primaryCategory}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
