import type { Metadata } from "next";
import Archive from "@/features/photo-portfolio/components/Archive";
import { getPortfolio } from "@/features/photo-portfolio/data/catalog";
import { archiveHref, archivePage, archivePageSize, archiveSearchValue, filterArchive, type PortfolioSearch } from "@/features/photo-portfolio/lib/archive";
import { portfolioMetadata } from "@/features/photo-portfolio/lib/metadata";

export async function generateMetadata({ searchParams }: { searchParams: Promise<PortfolioSearch> }): Promise<Metadata> {
  const [search, { photos }] = await Promise.all([searchParams, getPortfolio()]);
  const query = archiveSearchValue(search, "q");
  const place = archiveSearchValue(search, "place");
  const year = archiveSearchValue(search, "year");
  const matches = filterArchive(photos, query, place, year);
  const page = archivePage(archiveSearchValue(search, "page"), Math.max(1, Math.ceil(matches.length / archivePageSize)));
  return portfolioMetadata(page > 1 ? `Archive — Page ${page}` : "Archive", "Browse the photographic archive of Isaac Jiang.",
    archiveHref(query, place, year, page), !(query || place || year));
}

export default async function ArchivePage() {
  const { photos } = await getPortfolio();
  return <Archive photos={photos} />;
}
