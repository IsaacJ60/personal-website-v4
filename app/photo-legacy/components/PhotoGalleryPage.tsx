import type { ReactNode } from "react";
import type { GalleryTile } from "../types";
import PhotoCard from "./PhotoCard";

type PhotoGalleryPageProps = {
  title: string;
  description?: string;
  items: GalleryTile[];
  action?: ReactNode;
};

export default function PhotoGalleryPage({
  title,
  description,
  items,
  action,
}: PhotoGalleryPageProps) {
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Gallery</p>
          <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
          {description ? <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>

        {action}
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {items.map((item) => {
          return <PhotoCard key={`${item.href}-${item.id}`} image={item} href={item.href} badgeLabel={item.badgeLabel} />;
        })}
      </div>
    </section>
  );
}
