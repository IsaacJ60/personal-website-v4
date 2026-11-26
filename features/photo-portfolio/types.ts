export type PortfolioPublication = {
  revision: string;
  liveRevision: string;
  publicView?: string;
  href: string;
};

export type PortfolioPhoto = {
  id: string;
  slug: string;
  title: string;
  alt: string;
  description: string | null;
  location: string | null;
  date: string;
  updatedAt?: string;
  categories: string[];
  src: string;
  thumbnail?: string;
  width: number | null;
  height: number | null;
  prepared: boolean;
  uploaded?: boolean;
};

export type PortfolioCollection = {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: "selected" | "series" | "notebook";
  photos: PortfolioPhoto[];
  isDemo: boolean;
  updatedAt?: string;
  coverPhotoId?: string | null;
  publicView?: string;
};

export type AdminPortfolioPhoto = PortfolioPhoto & { published: boolean; ownerSeriesId: string; ownerSeriesTitle: string };

export type PhotoDetails = {
  title: string;
  date: string;
  location: string;
  caption: string;
  altText: string;
};
