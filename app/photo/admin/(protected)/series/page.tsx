import Link from "next/link";
import { redirect } from "next/navigation";
import AdminPagination from "@/features/photo-portfolio/components/AdminPagination";
import { getSeriesDrafts, seriesDraftPageSize } from "@/features/photo-portfolio/data/admin";
import { adminPhotosPath } from "@/features/photo-portfolio/lib/admin-photos";
import styles from "@/features/photo-portfolio/admin.module.css";

const seriesPath = "/photo/admin/series";

function pageHref(page: number) {
  return page === 1 ? seriesPath : `${seriesPath}?page=${page}`;
}

export default async function SeriesDraftsPage({ searchParams }: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { page: rawPage } = await searchParams;
  const requestedPage = typeof rawPage === "string" ? Number(rawPage) : 1;
  const page = Number.isSafeInteger(requestedPage * seriesDraftPageSize)
    && Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const result = await getSeriesDrafts(page);
  if (!result) redirect(seriesPath);

  const { drafts, total } = result;
  const pages = Math.max(1, Math.ceil(total / seriesDraftPageSize));
  const start = (page - 1) * seriesDraftPageSize + 1;

  return <section className={styles.editor}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>Portfolio admin</p><h1>Series</h1></div>
      <Link className={styles.actionLink} href={`${seriesPath}/new`}>New series</Link>
    </header>
    <div className={styles.draftBar}>
      <Link className={styles.textLink} href="/photo/admin">← Selected Work editor</Link>
      <Link className={styles.textLink} href={adminPhotosPath}>Manage photos</Link>
      <span>{pages > 1 ? `${start}–${start + drafts.length - 1} of ${total} series` : `${total} series`}</span>
    </div>
    {drafts.length ? <ul className={styles.draftList}>
      {drafts.map((draft) => {
        const count = draft.photo_v3_collection_photos[0]?.count ?? 0;
        const live = draft.publication?.live?.published;
        const hasDraftEdits = live && draft.publication?.draft_revision !== draft.updated_at;
        return <li key={draft.id}>
          <Link href={`${seriesPath}/${draft.id}`}>
            <span className={styles.seriesTitle}>{draft.title}</span>
            <span className={styles.seriesListMeta}>
              {!live && <span className={styles.meta}>Draft · Private</span>}
              {live && <span className={styles.publicationBadge}>{draft.publication?.live?.public_view === "archive" ? "Archived" : "Published"}</span>}
              <span className={styles.meta}>
                {count} {count === 1 ? "photograph" : "photographs"}{draft.legacy_bundle_id ? " · Imported" : ""}
                {hasDraftEdits ? " · Draft edits" : ""}
              </span>
            </span>
          </Link>
        </li>;
      })}
    </ul> : <p>Create a series to start arranging photographs.</p>}
    <AdminPagination page={page} pages={pages} label="Series draft pages" getHref={pageHref} />
  </section>;
}
