import SelectionEditor from "@/features/photo-portfolio/components/SelectionEditor";
import { getAdminPhotoLibrary, getDraftPublication, getSeriesDraft } from "@/features/photo-portfolio/data/admin";

export default async function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [draft, photos] = await Promise.all([getSeriesDraft(id), getAdminPhotoLibrary()]);
  const publication = await getDraftPublication(draft.id);
  return <SelectionEditor key={id} collectionId={id} revision={draft.revision} photos={photos}
    initialIds={draft.selectedIds} publication={publication}
    series={{ title: draft.title, description: draft.description, coverId: draft.coverId }} />;
}
