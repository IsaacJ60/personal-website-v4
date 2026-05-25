"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type GalleryTile } from "../types";
import { filterPhotos } from "../data/photo-filters";
import { ChevronDown, X } from "lucide-react";
import PhotoCard from "./PhotoCard";

type PhotoSearchProps = {
  allPhotos: GalleryTile[];
  locations: string[];
  categories: string[];
  tags: string[];
  dates: string[];
};

export default function PhotoSearch({
  allPhotos,
  locations,
  categories,
  tags,
  dates,
}: PhotoSearchProps) {
  const locationDropdownRef = useRef<HTMLDivElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bundleMode, setBundleMode] = useState<"both" | "bundles" | "photos">("both");
  const [layoutMode, setLayoutMode] = useState<"normal" | "compact">("normal");
  const [openDropdown, setOpenDropdown] = useState<"location" | "category" | null>(null);

  const normalizedPhotos = useMemo(() => allPhotos, [allPhotos]);
  const gridClassName = layoutMode === "compact" 
    ? "grid gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
    : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  const controlBaseClass =
    "inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800";
  const activeSegmentClass =
    "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950";
  const inactiveSegmentClass =
    "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800";

  const filteredPhotos = useMemo(
    () =>
      filterPhotos(normalizedPhotos, {
        search,
        locations: selectedLocations.length > 0 ? selectedLocations : undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        bundleMode,
      }),
    [normalizedPhotos, search, selectedLocations, selectedCategories, selectedTags, startDate, endDate, bundleMode]
  );

  const hasActiveFilters =
    search || selectedLocations.length > 0 || selectedCategories.length > 0 || selectedTags.length > 0 || startDate || endDate;

  const toggleLocation = (location: string) => {
    setSelectedLocations((prev) =>
      prev.includes(location)
        ? prev.filter((l) => l !== location)
        : [...prev, location]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedLocations([]);
    setSelectedCategories([]);
    setSelectedTags([]);
    setStartDate("");
    setEndDate("");
  };

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

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder="Search photos by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm leading-5 shadow-sm placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder-neutral-400 dark:focus:ring-neutral-800"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Layout Toggle */}
        <div className="inline-flex h-9 w-full items-stretch rounded-md border border-neutral-300 bg-white p-1 text-xs font-medium shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-auto">
          {(["normal", "compact"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setLayoutMode(mode)}
              className={`flex-1 rounded px-3 transition-colors sm:flex-none ${
                layoutMode === mode
                  ? activeSegmentClass
                  : inactiveSegmentClass
              }`}
            >
              {mode === "normal" ? "Normal" : "Compact"}
            </button>
          ))}
        </div>

        <div className="inline-flex h-9 w-full items-stretch rounded-md border border-neutral-300 bg-white p-1 text-xs font-medium shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-auto">
          {(["both", "photos", "bundles"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setBundleMode(mode)}
              className={`flex-1 rounded px-3 transition-colors sm:flex-none ${
                bundleMode === mode
                  ? activeSegmentClass
                  : inactiveSegmentClass
              }`}
            >
              {mode === "both" ? "Both" : mode === "photos" ? "Photos" : "Bundles"}
            </button>
          ))}
        </div>

        {/* Location Dropdown */}
        <div ref={locationDropdownRef} className="relative w-full sm:w-auto">
          <button
            onClick={() =>
              setOpenDropdown(openDropdown === "location" ? null : "location")
            }
            className={`${controlBaseClass} w-full justify-between sm:w-auto`}
          >
            Location&nbsp; {selectedLocations.length > 0 && <span className="font-semibold">({selectedLocations.length})</span>}
            <ChevronDown size={14} />
          </button>
          {openDropdown === "location" && (
            <div className="absolute top-full left-0 z-10 mt-1 w-56 rounded-lg border border-neutral-300 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              <div className="space-y-1 p-2 max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedLocations([]);
                  }}
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
                      className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="h-3 w-3"
                      />
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Category Dropdown */}
        <div ref={categoryDropdownRef} className="relative w-full sm:w-auto">
          <button
            onClick={() =>
              setOpenDropdown(openDropdown === "category" ? null : "category")
            }
            className={`${controlBaseClass} w-full justify-between sm:w-auto`}
          >
            Category&nbsp; {selectedCategories.length > 0 && <span className="font-semibold">({selectedCategories.length})</span>}
            <ChevronDown size={14} />
          </button>
          {openDropdown === "category" && (
            <div className="absolute top-full left-0 z-10 mt-1 w-56 rounded-lg border border-neutral-300 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              <div className="space-y-1 p-2 max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                  }}
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
                      className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="h-3 w-3"
                      />
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Date Range */}
        <div className="inline-flex h-9 w-full items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-7 min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm text-neutral-700 outline-none dark:text-neutral-100"
            title="Start date"
          />
          <span className="text-sm text-muted-foreground">—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-7 min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm text-neutral-700 outline-none dark:text-neutral-100"
            title="End date"
          />
        </div>


        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className={`${controlBaseClass} w-full justify-center gap-1 text-neutral-600 dark:text-neutral-400 sm:w-auto`}
          >
            <X size={14} />
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredPhotos.length} of {normalizedPhotos.length} items
      </div>

      {/* Photo Grid */}
      {filteredPhotos.length > 0 ? (
        <div className={gridClassName}>
          {filteredPhotos.map((photo) => (
            <PhotoCard key={photo.href} image={photo} href={photo.href} badgeLabel={photo.badgeLabel} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No photos match your filters.</p>
        </div>
      )}
    </div>
  );
}
