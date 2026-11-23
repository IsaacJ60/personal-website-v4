import type { Metadata } from "next";
import Archive from "@/features/photo-portfolio/components/Archive";
import { getPortfolio } from "@/features/photo-portfolio/data/catalog";

export const metadata: Metadata = { title: "Archive" };

export default async function ArchivePage() {
  const { photos } = await getPortfolio();
  return <Archive photos={photos} />;
}
