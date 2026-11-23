import PhotoDetailsEditor from "@/features/photo-portfolio/components/PhotoDetailsEditor";
import { getPhotoForEditing, getPhotoLocations } from "@/features/photo-portfolio/data/admin";
import { adminPhotoHref, readPhotoLibrarySearch } from "@/features/photo-portfolio/lib/admin-photos";

export default async function EditPhotoPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string | string[]; page?: string | string[]; view?: string | string[] }>;
}) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const [{ photo, details, revision }, locations] = await Promise.all([getPhotoForEditing(id), getPhotoLocations()]);
  return <PhotoDetailsEditor key={id} photo={photo} initialDetails={details}
    initialRevision={revision} backHref={adminPhotoHref(readPhotoLibrarySearch(search))} locations={locations} />;
}
