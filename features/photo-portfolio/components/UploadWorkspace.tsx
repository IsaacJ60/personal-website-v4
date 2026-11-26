import Link from "next/link";
import { getPhotoLocations, getUploadSeries } from "../data/admin";
import UploadPhotoForm from "./UploadPhotoForm";
import BulkPhotoUploadForm from "./BulkPhotoUploadForm";
import styles from "../admin.module.css";

export default async function UploadWorkspace({ seriesId, bulk = false }: { seriesId?: string; bulk?: boolean }) {
  const series = await getUploadSeries();
  const destination = series.find((row) => row.id === seriesId);
  if (!destination) return <section className={styles.editor}>
    <header className={styles.header}><h1>Choose a series</h1></header>
    <p>Create or choose a series before uploading photos.</p>
    {series.length > 0 && <form className={styles.detailsFields} method="get">
      <label>Destination series<select name="seriesId" required defaultValue="">
        <option value="" disabled>Choose series</option>
        {series.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
      </select></label>
      <button className={styles.actionButton}>Continue</button>
    </form>}
    <Link className={styles.textLink} href="/photo/admin/series/new">Create a series</Link>
  </section>;
  const locations = await getPhotoLocations();
  return <>
    <p className={styles.draftBar}>Uploading to {destination.title}</p>
    {bulk ? <BulkPhotoUploadForm seriesId={destination.id} locations={locations} />
      : <UploadPhotoForm seriesId={destination.id} locations={locations} />}
  </>;
}
