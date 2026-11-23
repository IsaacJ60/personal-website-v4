import { photoDetailsLimits as limits } from "../lib/admin-photos";
import type { PhotoDetails } from "../types";
import styles from "../admin.module.css";
import PhotoLocationField from "./PhotoLocationField";

export default function PhotoDetailsFields({ details, locations, disabled, onChange, children }: {
  details: PhotoDetails;
  locations: string[];
  disabled?: boolean;
  onChange: (field: keyof PhotoDetails, value: string) => void;
  children?: React.ReactNode;
}) {
  return <fieldset className={styles.detailsFields} disabled={disabled}>
    <legend id="photo-details">Photo details</legend>
    {children}
    <label>Title<input value={details.title} onChange={(event) => onChange("title", event.target.value)}
      required maxLength={limits.title} /></label>
    <label>Date taken<input type="date" value={details.date} onChange={(event) => onChange("date", event.target.value)}
      required min="0001-01-01" max="9999-12-31" /></label>
    <PhotoLocationField value={details.location} locations={locations} disabled={disabled} onChange={(value) => onChange("location", value)} />
    <label><span>Caption <small>(optional)</small></span>
      <textarea rows={3} value={details.caption} onChange={(event) => onChange("caption", event.target.value)} maxLength={limits.caption} /></label>
    <label><span>Alt text <small>(defaults to title)</small></span>
      <input value={details.altText} onChange={(event) => onChange("altText", event.target.value)} maxLength={limits.altText} /></label>
  </fieldset>;
}
