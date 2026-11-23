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
