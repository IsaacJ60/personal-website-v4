import Link from "next/link";
import AdminPhotoLibrary from "@/features/photo-portfolio/components/AdminPhotoLibrary";
import { getAdminPhotoLibrary, requirePortfolioAdmin } from "@/features/photo-portfolio/data/admin";
import PhotoMediaCleanup from "@/features/photo-portfolio/components/PhotoMediaCleanup";
import { adminPhotosPath, readPhotoLibrarySearch } from "@/features/photo-portfolio/lib/admin-photos";
import styles from "@/features/photo-portfolio/admin.module.css";

export default async function AdminPhotosPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[]; view?: string | string[] }>;
}) {
  const [photos, params] = await Promise.all([getAdminPhotoLibrary(), searchParams]);
  const search = readPhotoLibrarySearch(params);
  const client = await requirePortfolioAdmin();
  const cleanup = await client.from("photo_v3_media_cleanup").select("photo_id", { count: "exact", head: true });
  return <section className={styles.editor}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>Portfolio admin</p><h1>Photos</h1></div>
      <Link className={styles.actionLink} href={`${adminPhotosPath}/bulk`}>Upload photos</Link>
    </header>
    <div className={styles.draftBar}>
      <Link className={styles.textLink} href="/photo/admin">Selected Work editor</Link>
      <Link className={styles.textLink} href="/photo/admin/series">Series</Link>
    </div>
    {cleanup.error ? <p role="alert">Could not check pending image cleanup. Reload to try again.</p> : <PhotoMediaCleanup count={cleanup.count ?? 0} />}
    <AdminPhotoLibrary key={`${search.page}:${search.view}:${search.query}`} photos={photos} initialSearch={search} />
  </section>;
}
