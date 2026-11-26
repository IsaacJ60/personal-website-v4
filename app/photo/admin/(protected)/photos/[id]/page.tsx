import PhotoDetailsEditor from "@/features/photo-portfolio/components/PhotoDetailsEditor";
import { getPhotoForEditing, getPhotoLocations, getUploadSeries } from "@/features/photo-portfolio/data/admin";
import { adminPhotoHref, readPhotoLibrarySearch } from "@/features/photo-portfolio/lib/admin-photos";

export default async function EditPhotoPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string | string[]; page?: string | string[]; view?: string | string[] }>;
}) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const [{ photo, details, revision }, locations, series] = await Promise.all([getPhotoForEditing(id), getPhotoLocations(), getUploadSeries()]);
  return <PhotoDetailsEditor key={`${id}-${revision}`} photo={photo} initialDetails={details}
    initialRevision={revision} backHref={adminPhotoHref(readPhotoLibrarySearch(search))} locations={locations} series={series} />;
}
