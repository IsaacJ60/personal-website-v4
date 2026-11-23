import { getDraftPublication, getSelectionDraft } from "@/features/photo-portfolio/data/admin";
import SelectionEditor from "@/features/photo-portfolio/components/SelectionEditor";

export default async function AdminPage() {
  const draft = await getSelectionDraft();
  const publication = await getDraftPublication(draft.collection.id);
  return <SelectionEditor collectionId={draft.collection.id} revision={draft.collection.updated_at}
    photos={draft.photos} initialIds={draft.selectedIds} publication={publication} />;
}
