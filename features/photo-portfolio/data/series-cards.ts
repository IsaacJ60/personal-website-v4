import "server-only";

import { unstable_cache } from "next/cache";
import { getPortfolio } from "./catalog";

// Public card data only. Admin/publication actions expire this tag immediately.
export const getSeriesCards = unstable_cache(async () => {
  const { collections } = await getPortfolio();
  return collections.filter((collection) => collection.kind === "series" && collection.photos.length > 0)
    .map((collection) => ({
      id: collection.id, slug: collection.slug, title: collection.title,
      publicView: collection.publicView ?? "series",
      cover: collection.photos.find((photo) => photo.id === collection.coverPhotoId) ?? collection.photos[0],
    }));
}, ["photo-series-cards-v1"], { revalidate: 60, tags: ["photo-series-cards"] });
