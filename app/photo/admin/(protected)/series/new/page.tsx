import { randomUUID } from "node:crypto";
import SelectionEditor from "@/features/photo-portfolio/components/SelectionEditor";
import { getAdminPhotoLibrary } from "@/features/photo-portfolio/data/admin";

export default async function NewSeriesPage() {
  const photos = await getAdminPhotoLibrary();
  return <SelectionEditor collectionId={randomUUID()} revision={null} photos={photos} initialIds={[]}
    series={{ title: "", description: "", coverId: null }} />;
}
