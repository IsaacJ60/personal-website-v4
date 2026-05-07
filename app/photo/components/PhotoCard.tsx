"use client";

import Image from "next/image";
import Link from "next/link";
import type { PhotoImage } from "../types";

type PhotoCardProps = {
  image: PhotoImage;
};

export default function PhotoCard({ image }: PhotoCardProps) {
  const primaryCategory = image.categories?.[0];
  const objectPosition = image.focusPoint
    ? `${image.focusPoint.x * 100}% ${image.focusPoint.y * 100}%`
    : undefined;

  return (
    <Link
      href={`/photo/photos/${image.id}`}
      className="group block overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200 dark:bg-neutral-900">
        <Image
          src={image.src}
          alt={image.alt ?? image.title ?? "Photo"}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          style={objectPosition ? { objectPosition } : undefined}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
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
