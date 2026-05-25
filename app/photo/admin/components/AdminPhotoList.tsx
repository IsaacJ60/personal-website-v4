"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import {
  deletePhotoAction,
  togglePublishedPhotoAction,
} from "../actions";

type AdminPhoto = {
  id: string;
  slug: string;
  object_key: string;
  title: string;
  date_taken: string | null;
  categories: string[] | null;
  alt_text: string;
  description: string | null;
  location: string | null;
  published: boolean;
  portfolio_order: number | null;
};

type AdminPhotoListProps = {
  photos: AdminPhoto[];
};

type StatusFilter = "all" | "published" | "draft";

type SortOption =
  | "newest"
  | "oldest"
  | "published-first"
  | "draft-first"
  | "title";

const MEDIA_BASE_URL =
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "https://media.isaacjiang.ca";

function getPhotoUrl(objectKey: string): string {
  const encodedPath = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${MEDIA_BASE_URL}/camera/${encodedPath}`;
}

export default function AdminPhotoList({
  photos,
}: AdminPhotoListProps) {
  const [compact, setCompact] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  const publishedCount = photos.filter((photo) => photo.published).length;
  const draftCount = photos.length - publishedCount;

  const visiblePhotos = useMemo(() => {
    const filtered = photos.filter((photo) => {
      if (statusFilter === "published") {
        return photo.published;
      }

      if (statusFilter === "draft") {
        return !photo.published;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const dateA = a.date_taken ?? "";
      const dateB = b.date_taken ?? "";

      switch (sortOption) {
        case "newest":
          return dateB.localeCompare(dateA);

        case "oldest":
          return dateA.localeCompare(dateB);

        case "published-first":
          return (
            Number(b.published) - Number(a.published) ||
            dateB.localeCompare(dateA)
          );

        case "draft-first":
          return (
            Number(a.published) - Number(b.published) ||
            dateB.localeCompare(dateA)
          );

        case "title":
          return a.title.localeCompare(b.title);

        default:
          return 0;
      }
    });
  }, [photos, statusFilter, sortOption]);

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-4 shrink-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Existing photos</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Showing {visiblePhotos.length} of {photos.length} photos
            </p>

            <div className="mt-2 flex gap-2 text-xs">
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-700 dark:bg-green-950 dark:text-green-300">
                {publishedCount} published
              </span>

              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
                {draftCount} drafts
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => setCompact(false)}
              aria-pressed={!compact}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                !compact
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Comfortable
            </button>

            <button
              type="button"
              onClick={() => setCompact(true)}
              aria-pressed={compact}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                compact
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Compact
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectControl
            label="Status"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            options={[
              { value: "all", label: "All photos" },
              { value: "published", label: "Published only" },
              { value: "draft", label: "Drafts only" },
            ]}
          />

          <SelectControl
            label="Sort by"
            value={sortOption}
            onChange={(value) => setSortOption(value as SortOption)}
            options={[
              { value: "newest", label: "Newest date first" },
              { value: "oldest", label: "Oldest date first" },
              { value: "published-first", label: "Published first" },
              { value: "draft-first", label: "Drafts first" },
              { value: "title", label: "Title A–Z" },
            ]}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {visiblePhotos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center text-sm text-muted-foreground dark:border-neutral-800">
            No photos match the selected filter.
          </div>
        ) : compact ? (
          <div className="grid gap-2 xl:grid-cols-2">
            {visiblePhotos.map((photo) => (
              <CompactPhotoRow key={photo.id} photo={photo} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {visiblePhotos.map((photo) => (
              <ComfortablePhotoRow key={photo.id} photo={photo} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-md border border-neutral-300 bg-white px-3 py-2 pr-9 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-200 dark:[color-scheme:dark]"
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
        />
      </div>
    </div>
  );
}

function ComfortablePhotoRow({ photo }: { photo: AdminPhoto }) {
  return (
    <article className="flex gap-4 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
        <Image
          src={getPhotoUrl(photo.object_key)}
          alt={photo.alt_text}
          fill
          quality={70}
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <PhotoHeader photo={photo} />

        <p className="mt-2 text-xs text-muted-foreground">
          {photo.date_taken}
          {photo.location ? ` · ${photo.location}` : ""}
        </p>

        <PhotoActions photo={photo} />
      </div>
    </article>
  );
}

function CompactPhotoRow({ photo }: { photo: AdminPhoto }) {
  return (
    <article className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
        <Image
          src={getPhotoUrl(photo.object_key)}
          alt={photo.alt_text}
          fill
          quality={70}
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium">{photo.title}</h3>
            <p className="truncate text-[11px] text-muted-foreground">
              {photo.date_taken}
              {photo.location ? ` · ${photo.location}` : ""}
            </p>
          </div>

          <PublishedBadge published={photo.published} />
        </div>

        <PhotoActions photo={photo} compact />
      </div>
    </article>
  );
}

function PhotoHeader({ photo }: { photo: AdminPhoto }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="truncate font-medium">{photo.title}</h3>

        <p className="mt-1 truncate text-xs text-muted-foreground">
          {photo.slug}
        </p>
      </div>

      <PublishedBadge published={photo.published} />
    </div>
  );
}

function PublishedBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
        published
          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"
      }`}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

function PhotoActions({
  photo,
  compact = false,
}: {
  photo: AdminPhoto;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mt-1.5 flex gap-1.5" : "mt-4 flex gap-2"}>
      <form action={togglePublishedPhotoAction}>
        <input type="hidden" name="id" value={photo.id} />
        <input
          type="hidden"
          name="published"
          value={String(photo.published)}
        />

        <button
          type="submit"
          className={`rounded-md border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900 ${
            compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
          }`}
        >
          {photo.published ? "Unpublish" : "Publish"}
        </button>
      </form>

      <form action={deletePhotoAction}>
        <input type="hidden" name="id" value={photo.id} />

        <button
          type="submit"
          className={`rounded-md border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40 ${
            compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
          }`}
        >
          Delete
        </button>
      </form>
    </div>
  );
}