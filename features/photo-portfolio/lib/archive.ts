import type { PortfolioPhoto } from "../types";

export const archivePageSize = 18;

export function archivePage(value: string | null, pages: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(pages, Math.max(1, Math.trunc(parsed))) : 1;
}

export function archiveHref(query: string, place: string, year: string, page = 1) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (place) params.set("place", place);
  if (year) params.set("year", year);
  if (page > 1) params.set("page", String(page));
  return `/photo/archive${params.size ? `?${params}` : ""}`;
}

export function filterArchive(photos: PortfolioPhoto[], query: string, place: string, year: string) {
  const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const needle = normalize(query.trim());
  return photos.filter((photo) => (!place || photo.location === place)
    && (!year || photo.date.slice(0, 4) === year)
    && (!needle || normalize([photo.title,photo.alt,photo.description,photo.location,...photo.categories].join(" ")).includes(needle)));
}

export type PortfolioSearch = Record<string, string | string[] | undefined>;

// Match URLSearchParams.get(), including repeated parameters.
export function archiveSearchValue(search: PortfolioSearch, key: string) {
  const value = search[key];
  return (Array.isArray(value) ? value[0] : value) || "";
}

// Shared by the photo page and its metadata, so the canonical describes the
// same photograph that the client viewer selects from this sequence.
export function photoViewerContext(photos: PortfolioPhoto[], slug: string, search: PortfolioSearch) {
  const photo = photos.find((item) => item.slug === slug);
  if (!photo) return null;
  const fromArchive = archiveSearchValue(search, "from") === "archive";
  const query = archiveSearchValue(search, "q");
  const place = archiveSearchValue(search, "place");
  const year = archiveSearchValue(search, "year");
  const matches = fromArchive ? filterArchive(photos, query, place, year) : [];
  const inArchive = matches.some((item) => item.id === photo.id);
  const sequence = inArchive ? matches : [photo];
  const requested = archiveSearchValue(search, "photo") || photo.slug;
  // PortfolioViewer falls back to the first frame for an unknown selection.
  const active = sequence.find((item) => item.slug === requested) ?? sequence[0];
  const page = archivePage(archiveSearchValue(search, "page"), Math.max(1, Math.ceil(matches.length / archivePageSize)));
  return { photo, active, sequence, fromArchive,
    archiveContext: inArchive ? { query, place, year } : undefined,
    backHref: `${archiveHref(query, place, year, page)}#photo-${photo.slug}` };
}
