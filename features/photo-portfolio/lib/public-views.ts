export function publicSeriesHref(slug: string, publicView = "series") {
  return `/photo/${encodeURIComponent(publicView)}/${encodeURIComponent(slug)}`;
}
