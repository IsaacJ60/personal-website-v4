"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ChevronDown, ExternalLink, MoreVertical, Pencil, Search, Trash2, X } from "lucide-react";
import {
  deletePhotoAction,
} from "../actions";
import EditPhotoModal from "./EditPhotoModal";

type BundleOption = {
  id: string;
  title: string;
  categories: string[];
};

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
  bundleIds: string[];
};

type AdminPhotoListProps = {
  photos: AdminPhoto[];
  bundles: BundleOption[];
};

type StatusFilter = "all" | "published" | "draft";
type SortOption = "newest" | "oldest" | "published-first" | "draft-first" | "title";
type LayoutMode = "normal" | "compact" | "tiny";

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
  bundles,
}: AdminPhotoListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [openDropdown, setOpenDropdown] = useState<"location" | "category" | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("normal");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<AdminPhoto | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Create a map for quick bundle name lookup
  const bundleMap = useMemo(
    () => new Map(bundles.map((b) => [b.id, b.title])),
    [bundles]
  );

  // Extract unique locations and categories
  const locations = useMemo(() => {
    const locs = new Set<string>();
    photos.forEach((p) => {
      if (p.location) locs.add(p.location);
    });
    return Array.from(locs).sort();
  }, [photos]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    photos.forEach((p) => {
      p.categories?.forEach((c) => cats.add(c));
    });
    return Array.from(cats).sort();
  }, [photos]);

  const publishedCount = photos.filter((photo) => photo.published).length;
  const draftCount = photos.length - publishedCount;

  // Filter and sort photos
  const visiblePhotos = useMemo(() => {
    const searchLower = search.toLowerCase();

    const filtered = photos.filter((photo) => {
      // Status filter
      if (statusFilter === "published" && !photo.published) return false;
      if (statusFilter === "draft" && photo.published) return false;

      // Location filter
      if (selectedLocations.length > 0) {
        if (!photo.location || !selectedLocations.includes(photo.location)) {
          return false;
        }
      }

      // Category filter
      if (selectedCategories.length > 0) {
        const photoCategories = photo.categories ?? [];
        if (!selectedCategories.some((cat) => photoCategories.includes(cat))) {
          return false;
        }
      }

      // Search filter (title, description, location)
      if (searchLower) {
        const titleMatch = photo.title.toLowerCase().includes(searchLower);
        const descMatch = photo.description?.toLowerCase().includes(searchLower) ?? false;
        const locationMatch = photo.location?.toLowerCase().includes(searchLower) ?? false;
        if (!titleMatch && !descMatch && !locationMatch) {
          return false;
        }
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
          return Number(b.published) - Number(a.published) || dateB.localeCompare(dateA);
        case "draft-first":
          return Number(a.published) - Number(b.published) || dateB.localeCompare(dateA);
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [photos, statusFilter, selectedLocations, selectedCategories, search, sortOption]);

  const hasActiveFilters =
    search ||
    statusFilter !== "all" ||
    selectedLocations.length > 0 ||
    selectedCategories.length > 0;

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSelectedLocations([]);
    setSelectedCategories([]);
  };

  const toggleLocation = (location: string) => {
    setSelectedLocations((prev) =>
      prev.includes(location) ? prev.filter((l) => l !== location) : [...prev, location]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;

      if (
        openDropdown &&
        target &&
        !locationDropdownRef.current?.contains(target) &&
        !categoryDropdownRef.current?.contains(target)
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [openDropdown]);

  const controlBaseClass =
    "inline-flex h-8 items-center rounded-md border border-neutral-300 bg-white px-2.5 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800";

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-4 shrink-0 space-y-3">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Photos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {visiblePhotos.length} of {photos.length} photos
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

          {/* Layout toggle */}
          <div className="flex items-center gap-0.5 rounded-full border border-neutral-200 bg-neutral-50 p-1 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-900">
            {(["normal", "compact", "tiny"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setLayoutMode(mode)}
                aria-pressed={layoutMode === mode}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  layoutMode === mode
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search titles, descriptions, locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-10 pr-4 text-sm leading-5 shadow-sm placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder-neutral-400 dark:focus:ring-neutral-800"
          />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status pills */}
          <div className="inline-flex h-8 items-stretch rounded-md border border-neutral-300 bg-white p-0.5 text-xs font-medium shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            {(["all", "published", "draft"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded px-2.5 transition-colors ${
                  statusFilter === status
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                {status === "all" ? "All" : status === "published" ? "Published" : "Drafts"}
              </button>
            ))}
          </div>

          {/* Location Dropdown */}
          <div ref={locationDropdownRef} className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "location" ? null : "location")}
              className={`${controlBaseClass} gap-1`}
            >
              Location
              {selectedLocations.length > 0 && (
                <span className="font-semibold">({selectedLocations.length})</span>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {openDropdown === "location" && (
              <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-lg border border-neutral-300 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                <div className="max-h-48 space-y-1 overflow-y-auto p-2">
                  <button
                    onClick={() => setSelectedLocations([])}
                    className="w-full rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Clear all
                  </button>
                  {locations.map((loc) => {
                    const isSelected = selectedLocations.includes(loc);
                    return (
                      <button
                        key={loc}
                        onClick={() => toggleLocation(loc)}
                        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <input type="checkbox" checked={isSelected} readOnly className="h-3 w-3" />
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div ref={categoryDropdownRef} className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
              className={`${controlBaseClass} gap-1`}
            >
              Category
              {selectedCategories.length > 0 && (
                <span className="font-semibold">({selectedCategories.length})</span>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {openDropdown === "category" && (
              <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-lg border border-neutral-300 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                <div className="max-h-48 space-y-1 overflow-y-auto p-2">
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="w-full rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Clear all
                  </button>
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <input type="checkbox" checked={isSelected} readOnly className="h-3 w-3" />
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="h-8 appearance-none rounded-md border border-neutral-300 bg-white px-2.5 pr-7 text-xs font-medium text-neutral-700 shadow-sm outline-none transition-colors hover:bg-neutral-100 focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="published-first">Published first</option>
              <option value="draft-first">Drafts first</option>
              <option value="title">Title A–Z</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className={`${controlBaseClass} gap-1 text-neutral-600 dark:text-neutral-400`}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Photo grid */}
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {/* Loading overlay */}
        {isDeleting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-neutral-950/60">
            <div className="rounded-lg bg-white px-4 py-2 text-sm font-medium shadow-lg dark:bg-neutral-800">
              Updating...
            </div>
          </div>
        )}

        {visiblePhotos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center text-sm text-muted-foreground dark:border-neutral-800">
            No photos match your filters.
          </div>
        ) : (
          <div className={
            layoutMode === "tiny"
              ? "grid grid-cols-9 gap-1"
              : layoutMode === "compact"
                ? "grid grid-cols-6 gap-2"
                : "grid grid-cols-4 gap-3"
          }>
            {visiblePhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                bundles={bundles}
                bundleMap={bundleMap}
                layoutMode={layoutMode}
                onDeleteRequest={(id, title) => setDeleteConfirm({ id, title })}
                onEditRequest={(photo) => setEditingPhoto(photo)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <h3 className="text-base font-semibold">Delete photo?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete <strong className="text-foreground">{deleteConfirm.title}</strong>? This removes the metadata from the database but keeps the image in R2 storage.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  const formData = new FormData();
                  formData.set("id", deleteConfirm.id);
                  startDeleteTransition(async () => {
                    await deletePhotoAction(formData);
                    setDeleteConfirm(null);
                  });
                }}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit photo modal */}
      {editingPhoto && (
        <EditPhotoModal
          photo={editingPhoto}
          bundles={bundles}
          onClose={() => setEditingPhoto(null)}
        />
      )}
    </section>
  );
}

function PhotoCard({
  photo,
  bundles,
  bundleMap,
  layoutMode,
  onDeleteRequest,
  onEditRequest,
}: {
  photo: AdminPhoto;
  bundles: BundleOption[];
  bundleMap: Map<string, string>;
  layoutMode: LayoutMode;
  onDeleteRequest: (id: string, title: string) => void;
  onEditRequest: (photo: AdminPhoto) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMenuToggle = () => {
    if (!menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right,
      });
    }
    setMenuOpen(!menuOpen);
  };

  // Close menu on outside click
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (
        menuOpen &&
        target &&
        !menuRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [menuOpen]);

  const isTiny = layoutMode === "tiny";
  const menuWidth = isTiny ? 144 : 160; // w-36 = 144px, w-40 = 160px

  const dropdownMenu = menuOpen && (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: menuPosition.top,
        left: menuPosition.left - menuWidth,
        zIndex: 9999,
      }}
      className={`${isTiny ? "w-36" : "w-40"} overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900`}
    >
      {/* Open in new tab */}
      <a
        href={`/photo/photos/${photo.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <ExternalLink className="h-3 w-3" />
        Open
      </a>

      {/* Edit */}
      <button
        type="button"
        onClick={() => {
          setMenuOpen(false);
          onEditRequest(photo);
        }}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>

      <button
        type="button"
        onClick={() => {
          setMenuOpen(false);
          onDeleteRequest(photo.id, photo.title);
        }}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
      >
        <Trash2 className="h-3 w-3" />
        Delete
      </button>
    </div>
  );

  // Tiny mode: no card chrome, just image with gradient overlay for text
  if (isTiny) {
    return (
      <article className="group relative overflow-hidden rounded-md">
        <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
          <Image
            src={getPhotoUrl(photo.object_key)}
            alt={photo.alt_text}
            fill
            quality={60}
            className="object-cover"
          />

          {/* Gradient overlay for text */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/60 to-transparent" />

          {/* Title and date in gradient area */}
          <div className="absolute inset-x-0 top-0 p-1.5">
            <p className="truncate text-[9px] font-medium leading-tight text-white drop-shadow-sm">
              {photo.title}
            </p>
            <p className="truncate text-[8px] text-white/80">
              {photo.date_taken}
            </p>
          </div>

          {/* Status indicator dot */}
          <div className="absolute bottom-1 left-1">
            <span
              className={`block h-1.5 w-1.5 rounded-full ${
                photo.published ? "bg-green-400" : "bg-neutral-400"
              }`}
            />
          </div>

          {/* Menu button */}
          <div className="absolute right-1 top-1">
            <button
              ref={buttonRef}
              onClick={handleMenuToggle}
              className="rounded-full bg-black/40 p-0.5 text-white opacity-0 transition-opacity hover:bg-black/60 group-hover:opacity-100"
            >
              <MoreVertical className="h-3 w-3" />
            </button>
          </div>
        </div>
        {dropdownMenu}
      </article>
    );
  }

  // Normal and Compact modes
  return (
    <article className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        <Image
          src={getPhotoUrl(photo.object_key)}
          alt={photo.alt_text}
          fill
          quality={70}
          className="object-cover"
        />

        {/* Status badge overlay */}
        <div className="absolute left-2 top-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              photo.published
                ? "bg-green-500/90 text-white"
                : "bg-neutral-800/80 text-neutral-200"
            }`}
          >
            {photo.published ? "Published" : "Draft"}
          </span>
        </div>

        {/* Menu button */}
        <div className="absolute right-2 top-2">
          <button
            ref={buttonRef}
            onClick={handleMenuToggle}
            className="rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <h3 className="truncate text-sm font-medium" title={photo.title}>
          {photo.title}
        </h3>

        {/* Date - shown in both normal and compact */}
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {photo.date_taken}
          {photo.location ? ` · ${photo.location}` : ""}
        </p>

        {/* Slug - shown in normal and compact */}
        {(layoutMode === "normal" || layoutMode === "compact") && (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={photo.slug}>
            /{photo.slug}
          </p>
        )}

        {/* Categories - shown in normal and compact */}
        {(layoutMode === "normal" || layoutMode === "compact") && photo.categories && photo.categories.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {photo.categories.map((cat) => (
              <span
                key={cat}
                className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Bundle badges - shown in normal and compact */}
        {(layoutMode === "normal" || layoutMode === "compact") && photo.bundleIds.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {photo.bundleIds.map((bundleId) => (
              <span
                key={bundleId}
                className="inline-block rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              >
                {bundleMap.get(bundleId) ?? bundleId}
              </span>
            ))}
          </div>
        )}

        {/* Description - only in normal mode */}
        {layoutMode === "normal" && photo.description && (
          <p className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">
            {photo.description}
          </p>
        )}
      </div>
      {dropdownMenu}
    </article>
  );
}
