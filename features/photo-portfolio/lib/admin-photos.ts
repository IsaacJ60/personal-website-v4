import type { PhotoDetails } from "../types";

export const adminPhotosPath = "/photo/admin/photos";

export const photoDetailsLimits = { title: 160, location: 200, caption: 2000, altText: 400 };

export function normalizePhotoDetails(fields: PhotoDetails) {
  if (!fields || Object.entries(photoDetailsLimits).some(([key, limit]) => {
    const value = fields[key as keyof typeof photoDetailsLimits];
    return typeof value !== "string" || value.trim().length > limit;
  }) || !fields.title.trim()) {
    return { ok: false, message: "Enter a title and check the length of the photo details." } as const;
  }
  if (typeof fields.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fields.date) || fields.date.startsWith("0000")) {
    return { ok: false, message: "Enter a valid date taken." } as const;
  }
  const date = new Date(`${fields.date}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== fields.date) {
    return { ok: false, message: "Enter a valid date taken." } as const;
  }
  const details = {
    title: fields.title.trim(),
    date: fields.date,
    location: fields.location.trim(),
    caption: fields.caption.trim(),
    altText: fields.altText.trim(),
  };
  const columns = {
    title: details.title,
    date_taken: details.date,
    location: details.location || null,
    description: details.caption || null,
    alt_text: details.altText,
  };
  return { ok: true, details, columns } as const;
}

export type PhotoLibraryView = "grid" | "compact";
type PhotoLibraryParams = { q?: string | string[]; page?: string | string[]; view?: string | string[] };
export type PhotoLibrarySearch = { query: string; page: number; view: PhotoLibraryView };

export function readPhotoLibrarySearch(params: PhotoLibraryParams): PhotoLibrarySearch {
  const page = typeof params.page === "string" ? Number(params.page) : 1;
  return {
    query: typeof params.q === "string" ? params.q.slice(0, 200) : "",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    view: params.view === "compact" ? "compact" : "grid",
  };
}

export function adminPhotoHref({ query, page, view }: PhotoLibrarySearch, id?: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (page > 1) params.set("page", String(page));
  if (view === "compact") params.set("view", view);
  return `${adminPhotosPath}${id ? `/${encodeURIComponent(id)}` : ""}${params.size ? `?${params}` : ""}`;
}
