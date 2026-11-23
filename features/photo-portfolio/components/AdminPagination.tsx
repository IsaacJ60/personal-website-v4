import Link from "next/link";
import styles from "../admin.module.css";

type Props = {
  page: number;
  pages: number;
  label: string;
} & (
  | { getHref: (page: number) => string; onPageChange?: never }
  | { onPageChange: (page: number) => void; getHref?: never }
);

export default function AdminPagination({ page, pages, label, getHref, onPageChange }: Props) {
  if (pages <= 1) return null;

  function control(text: string, target: number, rel: "prev" | "next") {
    const disabled = target < 1 || target > pages;
    if (getHref) {
      return disabled ? <span aria-disabled="true">{text}</span>
        : <Link href={getHref(target)} rel={rel}>{text}</Link>;
    }
    return <button type="button" disabled={disabled} onClick={() => onPageChange?.(target)}>{text}</button>;
  }

  return <nav className={styles.pagination} aria-label={label}>
    {control("Previous", page - 1, "prev")}
    <span aria-live="polite">Page {page} of {pages}</span>
    {control("Next", page + 1, "next")}
  </nav>;
}
