"use client";

import Image from "next/image";
import Link from "next/link";
import { Info } from "lucide-react";
import type { GalleryTile } from "../types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type PhotoCardProps = {
  image: GalleryTile;
  href?: string;
  badgeLabel?: string;
  compact?: boolean;
  grid?: boolean;
  infoBundleTitles?: string[];
};

export default function PhotoCard({
  image,
  href,
  badgeLabel,
  compact = false,
  grid = false,
  infoBundleTitles = [],
}: PhotoCardProps) {
  const primaryCategory = image.categories?.[0];
  const objectPosition = image.focusPoint
    ? `${image.focusPoint.x * 100}% ${image.focusPoint.y * 100}%`
    : undefined;

  return (
    <Link
      href={href ?? `/photo/photos/${image.id}`}
      className={`group block overflow-hidden border border-neutral-200 bg-neutral-50 shadow-sm transition-transform duration-300 dark:border-neutral-800 dark:bg-neutral-950 ${
        grid
          ? "rounded-none hover:shadow-md"
          : "rounded-2xl hover:-translate-y-0.5 hover:shadow-md"
      }`}
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

        {badgeLabel && !grid ? (
          <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
            {badgeLabel}
          </div>
        ) : null}

        {grid ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                aria-label={`View details for ${image.title ?? "photo"}`}
                className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white outline-none transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-64 space-y-1">
              {image.title ? <div>Name: {image.title}</div> : null}
              {image.dateTaken ? <div>Date: {image.dateTaken}</div> : null}
              {image.locationName ? (
                <div>Location: {image.locationName}</div>
              ) : null}
              {primaryCategory ? <div>Category: {primaryCategory}</div> : null}
              {infoBundleTitles.length > 0 ? (
                <div>Bundle: {infoBundleTitles.join(", ")}</div>
              ) : null}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {!grid && <div className={compact ? "p-2.5" : "p-4"}>
        {compact ? (
          <div className="flex items-center justify-between gap-2">
            {image.title ? (
              <h3 className="min-w-0 truncate text-sm font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
                {image.title}
              </h3>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  aria-label={`View details for ${image.title ?? "photo"}`}
                  className="shrink-0 rounded-full p-1 text-muted-foreground outline-none transition-colors hover:bg-neutral-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-neutral-400 dark:hover:bg-neutral-800"
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64 space-y-1">
                {image.dateTaken ? <div>Date: {image.dateTaken}</div> : null}
                {image.locationName ? (
                  <div>Location: {image.locationName}</div>
                ) : null}
                {primaryCategory ? <div>Category: {primaryCategory}</div> : null}
                {infoBundleTitles.length > 0 ? (
                  <div>Bundle: {infoBundleTitles.join(", ")}</div>
                ) : null}
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
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
        )}

        {!compact && <div className="mt-3 flex items-center justify-between gap-4">
          {image.locationName ? (
          <div className="text-sm text-muted-foreground min-w-0 max-w-[50%] truncate">{image.locationName}</div>
          ) : <div />}

          {primaryCategory ? (
            <span className="inline-block rounded-md bg-white/80 dark:bg-neutral-800/70 px-3 py-1 text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate whitespace-nowrap max-w-[50%]">
              {primaryCategory}
            </span>
          ) : null}
        </div>}
      </div>}
    </Link>
  );
}
