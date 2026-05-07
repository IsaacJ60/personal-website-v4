"use client";

import Link from "next/link";

type BackToPhotosButtonProps = {
  className?: string;
};

export default function BackToPhotosButton({
  className = "inline-block rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium leading-5 text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900",
}: BackToPhotosButtonProps) {
  return (
    <Link
      href="/photo"
      className={className}
    >
      Back to Photos
    </Link>
  );
}