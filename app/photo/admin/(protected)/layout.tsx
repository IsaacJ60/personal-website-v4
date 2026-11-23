import { requirePortfolioAdmin } from "@/features/photo-portfolio/data/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePortfolioAdmin();
  return children;
}
