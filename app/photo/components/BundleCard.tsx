"use client";

import Image from "next/image";
import Link from "next/link";
import type { Bundle, PhotoImage } from "../types";

type BundleCardProps = {
  bundle: Bundle;
  coverPhoto: PhotoImage;
};

export default function BundleCard({ bundle, coverPhoto }: BundleCardProps) {
  const primaryCategory = bundle.categories?.[0];
  const objectPosition = coverPhoto.focusPoint
    ? `${coverPhoto.focusPoint.x * 100}% ${coverPhoto.focusPoint.y * 100}%`
    : undefined;

  return (
    <Link
      href={`/photo/bundles/${bundle.id}`}
      className="group block overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200 dark:bg-neutral-900">
        <Image
          src={coverPhoto.src}
          alt={coverPhoto.alt ?? coverPhoto.title ?? "Bundle cover"}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          style={objectPosition ? { objectPosition } : undefined}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {/* Bundle badge */}
        <div className="absolute top-3 right-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
          Bundle • {bundle.photoIds.length}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {bundle.title ? (
            <h3 className="min-w-0 text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
              {bundle.title}
            </h3>
          ) : null}

          {bundle.dateTaken ? (
            <span className="text-sm text-muted-foreground whitespace-nowrap">{bundle.dateTaken}</span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          {bundle.locationName ? (
            <div className="text-sm text-muted-foreground min-w-0 max-w-[50%] truncate">{bundle.locationName}</div>
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
