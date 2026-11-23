import Link from "next/link";
import { getDraftPublication, getSelectionDraft } from "@/features/photo-portfolio/data/admin";
import PortfolioViewer from "@/features/photo-portfolio/components/PortfolioViewer";
import PublishDraft from "@/features/photo-portfolio/components/PublishDraft";

export default async function DraftPreview() {
  const draft = await getSelectionDraft();
  const photos = draft.selectedIds.flatMap((id) => draft.photos.find((photo) => photo.id === id) ?? []);
  if (!photos.length) return <section><h1>Your draft is empty</h1><Link href="/photo/admin">Back to editor</Link></section>;
  const { id, updated_at: revision } = draft.collection;
  const publication = await getDraftPublication(id);
  return <PortfolioViewer title="Selected Work" description="" photos={photos} isDemo={false}
    subtitle="Private preview" backHref="/photo/admin" backLabel="Back to editor"
    headerAction={<PublishDraft id={id} title="Selected Work" revision={revision}
      publication={publication} hasPrivatePhotos={photos.some((photo) => !photo.published)} />} />;
}
