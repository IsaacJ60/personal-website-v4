import UploadWorkspace from "@/features/photo-portfolio/components/UploadWorkspace";

export default async function UploadPage({ searchParams }: { searchParams: Promise<{ seriesId?: string }> }) {
  const { seriesId } = await searchParams;
  return <UploadWorkspace seriesId={seriesId} />;
}
