import type { PhotoImage, Bundle, GalleryItem } from "../types";

export type CollectionItemResult = CatalogPhoto | (Bundle & { coverPhoto: PhotoImage });

export type Collection = {
  slug: string;
  title: string;
  description: string;
  longDescription?: string;
  count: string;
  coverSrc: string;
  coverAlt: string;
  items: CollectionItemResult[];
  images: PhotoImage[];
};

type CollectionInput = Omit<Collection, "count" | "items" | "images"> & {
  itemIds?: (string | GalleryItem)[];
  imageIds?: string[];
};

export type CatalogPhoto = PhotoImage & { id: string };

function photo(
  id: string,
  src: string,
  title: string,
  dateTaken: string,
  categories: string[],
  alt: string = title,
  description: string = "",
  locationName: string = "Vancouver, BC"
): CatalogPhoto {
  return {
    id,
    src,
    alt,
    title,
    description: description || undefined,
    dateTaken,
    categories,
    locationName: locationName || undefined,
  };
}

const PHOTO_LIBRARY: CatalogPhoto[] = [
  photo("stanley-park-silhouette", "/images/camera/Stanley Park Silhouette.jpg", "Stanley Park Silhouette", "2026-02-28", ["Abstract & Detail"], "Stanley Park silhouette", "A silhouette study of the iconic Stanley Park landscape, capturing the interplay of light and shadow.", "Stanley Park, Vancouver"),
  photo("double-umbrellas", "/images/camera/Double Umbrellas.jpg", "Double Umbrellas", "2026-03-05", ["Abstract & Detail"], "Double umbrellas", "Two umbrellas framed as an abstract composition, exploring minimal form and geometry.", "Yaletown, Vancouver"),
  photo("flying-canopy", "/images/camera/Flying Canopy.jpg", "Flying Canopy", "2026-03-07", ["Motion & Aviation"], "Flying canopy", "A dynamic capture of a deployed skydiving canopy in full flight, frozen mid-descent.", "Garry Point Park, Richmond"),
  photo("raven-close-up", "/images/camera/Raven Close-up.jpg", "Raven Close-up", "2026-03-21", ["Wildlife"], "Raven close-up", "An intimate portrait of a raven, capturing detail and character of urban wildlife.", "Tunnel Bluffs, BC"),
  photo("sunset-couple", "/images/camera/Sunset Couple.jpg", "Sunset Couple", "2026-03-27", ["People & Portraits"], "Sunset couple", "A silhouetted couple framed against the warm glow of a setting sun.", "Garry Point Park, Richmond"),
  photo("blossom-girl", "/images/camera/Blossom Girl.jpg", "Blossom Girl", "2026-03-27", ["People & Portraits"], "Blossom girl", "Portrait of a figure amid spring blossoms, blending human presence with natural surroundings.", "Garry Point Park, Richmond"),
  photo("cherry-buildings", "/images/camera/Cherry Buildings.jpg", "Cherry Buildings", "2026-03-28", ["Urban Nature"], "Cherry buildings", "Urban architecture framed through cherry blossom branches, bridging natural and built environments.", "Graveley St, Vancouver"),
  photo("cherry-blossom-sunrise", "/images/camera/Cherry Blossom Sunrise.jpg", "Cherry Blossom Sunrise", "2026-03-28", ["Urban Nature"], "Cherry blossom sunrise", "A sunrise scene framed by cherry blossoms, capturing the ephemeral beauty of dawn and spring.", "Graveley St, Vancouver"),
  photo("blue-hour-skyline", "/images/camera/Blue Hour Skyline.jpg", "Blue Hour Skyline", "2026-05-02", ["Urban Nature"], "Blue hour skyline", "A city skyline captured during the blue hour, where artificial and natural light converge.", "The Shipyards, North Vancouver"),
  photo("cherry-blossom-plane", "/images/camera/Cherry Blossom Plane.jpg", "Cherry Blossom Plane", "2026-04-07", ["Motion & Aviation"], "Cherry blossom plane", "An aircraft passing overhead amid spring cherry blossoms, merging sky and season.", "Larry Berg Flight Path Park, Richmond"),
  photo("cherry-blossom-plane-2", "/images/camera/Cherry Blossom Plane 2.jpg", "Cherry Blossom Plane 2", "2026-04-06", ["Motion & Aviation"], "Cherry blossom plane", "A second perspective of aircraft and blossoms in compositional dialogue.", "Larry Berg Flight Path Park, Richmond"),
  photo("cherry-blossom-private-jet", "/images/camera/Cherry Blossom Private Jet.jpg", "Cherry Blossom Private Jet", "2026-04-07", ["Motion & Aviation"], "Cherry blossom private jet", "A private jet silhouetted against spring blooms, a moment of convergence between modes of travel.", "Larry Berg Flight Path Park, Richmond"),
  photo("cruising-airliner", "/images/camera/Cruising Airliner.jpg", "Cruising Airliner", "2026-04-05", ["Motion & Aviation"], "Cruising airliner", "A commercial airliner captured mid-flight, a study in scale and transit.", "YVR Airport, Vancouver"),
  photo("cyberpunk-skyline", "/images/camera/Cyberpunk Skyline.jpg", "Cyberpunk Skyline", "2026-05-02", ["Urban Nature"], "Cyberpunk skyline", "A futuristic-leaning urban landscape with neon-tinted atmosphere and towering geometry.", "The Shipyards, North Vancouver"),
  photo("double-yellow-chairs", "/images/camera/Double Yellow Chairs.jpg", "Double Yellow Chairs", "2026-05-02", ["Abstract & Detail"], "Double yellow chairs", "Two yellow chairs as a minimalist composition, exploring color and repetition.", "The Shipyards, North Vancouver"),
  photo("fog-of-war", "/images/camera/Fog of War.jpg", "Fog of War", "2026-04-15", ["Landscapes"], "Fog of war", "A moody landscape enveloped in mist, where visibility and mystery intertwine.", "Lighthouse Park, West Vancouver"),
  photo("fuel-trails", "/images/camera/Fuel Trails.jpg", "Fuel Trails", "2026-04-05", ["Motion & Aviation"], "Fuel trails", "Contrails streaking across the sky, marking invisible paths of aviation.", "Larry Berg Flight Path Park, Richmond"),
  photo("golden-hour-skyline", "/images/camera/Golden Hour Skyline.jpg", "Golden Hour Skyline", "2026-05-02", ["Landscapes"], "Golden hour skyline", "A city bathed in the warm, diffused light of the golden hour at sunset.", "The Shipyards, North Vancouver"),
  photo("gordie-howe-bridge", "/images/camera/Gordie Howe Bridge.jpg", "Gordie Howe Bridge", "2026-04-22", ["Landscapes"], "Gordie Howe Bridge", "The distinctive cable-stayed bridge connecting Windsor and Detroit, a modern engineering landmark.", "Malden Park, Windsor"),
  photo("greater-yellowtails", "/images/camera/Greater Yellowtails.jpg", "Greater Yellowtails", "2026-04-08", ["Wildlife"], "Greater yellowtails", "A vibrant study of greater yellowtail fish, exploring aquatic life and color.", "Iona Beach, Richmond"),
  photo("may-flower-moon", "/images/camera/May Flower Moon.jpg", "May Flower Moon", "2026-05-01", ["Abstract & Detail"], "May flower moon", "Moonlight, intimate and ethereal.", "Richmond, BC"),
  photo("monochrome-air-canada", "/images/camera/Monochrome Air Canada.jpg", "Monochrome Air Canada", "2026-04-05", ["Motion & Aviation"], "Monochrome air canada", "An Air Canada aircraft rendered in black and white, emphasizing form over color.", "YVR Airport, Vancouver"),
  photo("moon-and-blossom", "/images/camera/Moon and Blossom.jpg", "Moon and Blossom", "2026-03-29", ["Abstract & Detail"], "Moon and blossom", "A poetic juxtaposition of lunar presence and delicate spring blooms.", "Queen Elizabeth Park, Vancouver"),
  photo("moon-and-plane", "/images/camera/Moon and Plane.jpg", "Moon and Plane", "2026-02-28", ["Motion & Aviation"], "Moon and plane", "The moon and an aircraft in compositional alignment, a rare celestial-terrestrial moment.", "Stanley Park, Vancouver"),
  photo("night-skyline", "/images/camera/Night Skyline.jpg", "Night Skyline", "2026-05-02", ["Urban Nature"], "Night skyline", "An urban silhouette under a darkened sky, lights and darkness in balance.", "The Shipyards, North Vancouver"),
  photo("oceanic-tide", "/images/camera/Oceanic Tide.jpg", "Oceanic Tide", "2026-04-08", ["Landscapes"], "Oceanic tide", "A dynamic seascape where tidal forces shape the landscape in patterns and motion.", "Iona Beach, Richmond"),
  photo("pre-sunset-moon", "/images/camera/Pre-Sunset Moon.jpg", "Pre-Sunset Moon", "2026-04-29", ["Abstract & Detail"], "Pre-sunset moon", "The moon visible in dusky light, captured just before twilight deepens.", "Garry Point Park, Richmond"),
  photo("red-glowing-flowers", "/images/camera/Red Glowing Flowers.jpg", "Red Glowing Flowers", "2026-04-29", ["Abstract & Detail"], "Red glowing flowers", "Red flowers suffused with warm light, a study in color saturation and warmth.", "Kuno Japanese Garden, Richmond"),
  photo("sandy-driftwood", "/images/camera/Sandy Driftwood.jpg", "Sandy Driftwood", "2026-04-08", ["Landscapes"], "Sandy driftwood", "Weathered driftwood on a sandy shore, texture and time rendered visible.", "Iona Beach, Richmond"),
  photo("stormy-lighthouse", "/images/camera/Stormy Lighthouse.jpg", "Stormy Lighthouse", "2026-04-15", ["Landscapes"], "Stormy lighthouse", "A lighthouse standing resolute against dramatic sky and turbulent conditions.", "Lighthouse Park, West Vancouver"),
  photo("twin-falls-lynn-canyon", "/images/camera/Twin Falls in Lynn Canyon.jpg", "Twin Falls in Lynn Canyon", "2026-05-02", ["Landscapes"], "Twin falls", "Twin cascades in Lynn Canyon, capturing the power and grace of flowing water.", "Lynn Canyon Park, Vancouver"),
  photo("warm-iona-sunset", "/images/camera/Warm Iona Sunset.jpg", "Warm Iona Sunset", "2026-04-08", ["Landscapes"], "Warm Iona sunset", "A golden sunset on Iona Beach, where sand, sky, and light converge in warmth.", "Iona Beach, Richmond"),
  photo("mountain-vancouver", "/images/camera/Mountain Vancouver.jpg", "Mountain Vancouver", "2026-05-03", ["Urban Nature"], "Mountain Vancouver", "A mountain framed against the urban backdrop of Vancouver, nature and city in proximity.", "Mt. Gardner, Bowen Island"),
  photo("cloud-mountains-at-sea", "/images/camera/Cloud Mountains at Sea.jpg", "Cloud Mountains at Sea", "2026-02-14", ["Landscapes"], "Cloud mountain at sea", "Clouds forming over mountains at sea.", "Garry Point Park, Richmond"),
  photo("ethereal-umbrellas", "/images/camera/Ethereal Umbrellas.jpg", "Ethereal Umbrellas", "2026-03-05", ["Abstract & Detail"], "Ethereal umbrellas", "Umbrellas floating in an ethereal landscape.", "Yaletown, Vancouver"),
  photo("umbrella-branches", "/images/camera/Umbrella Branches.jpg", "Umbrella Branches", "2026-03-05", ["Abstract & Detail"], "Umbrella branches", "A pink umbrella in front of sprawling branches.", "Yaletown, Vancouver"),
  photo("garry-point-structure", "/images/camera/Garry Point Structure.jpg", "Garry Point Structure", "2026-03-07", ["Landscapes"], "Garry point structure", "A structural element in Garry Point Park.", "Garry Point Park, Richmond"),
  photo("stationary-raven", "/images/camera/Stationary Raven.jpg", "Stationary Raven", "2026-03-21", ["Wildlife"], "Stationary raven", "A raven standing on a cliff.", "Tunnel Bluffs, BC"),
  photo("eagle-pair", "/images/camera/Eagle Pair.jpg", "Eagle Pair", "2026-03-27", ["Wildlife"], "Eagle pair", "Two eagles pictured together.", "West Dyke Trail, Richmond"),
  photo("couple-under-blossoms", "/images/camera/Couple Under Blossoms.jpg", "Couple Under Blossoms", "2026-03-27", ["Portraits"], "Couple under blossoms", "A couple standing under cherry blossoms.", "Garry Point Park, Richmond"),
  photo("resting-bunny", "/images/camera/2026-05-10/Resting Bunny.jpg", "Resting Bunny", "2026-05-10", ["Wildlife"], "Resting bunny", "A bunny resting in a peaceful setting.", "Terra Nova, Richmond"),
  photo("bunny-pair", "/images/camera/2026-05-10/Bunny Pair.jpg", "Bunny Pair", "2026-05-10", ["Wildlife"], "Bunny pair", "Two bunnies resting in a peaceful setting.", "Terra Nova, Richmond"),
  photo("sneaky-bunny", "/images/camera/2026-05-10/Sneaky Bunny.jpg", "Sneaky Bunny", "2026-05-10", ["Wildlife"], "Sneaky bunny", "A bunny peeking out from a peaceful setting.", "Terra Nova, Richmond"),
  photo("grazing-bunny", "/images/camera/2026-05-10/Grazing Bunny.jpg", "Grazing Bunny", "2026-05-10", ["Wildlife"], "Grazing bunny", "A bunny grazing in a peaceful setting.", "Terra Nova, Richmond"),
  photo("chewing-bunny", "/images/camera/2026-05-10/Chewing Bunny.jpg", "Chewing Bunny", "2026-05-10", ["Wildlife"], "Chewing bunny", "A bunny chewing on vegetation in a peaceful setting.", "Terra Nova, Richmond"),
  photo("surprised-bunny", "/images/camera/2026-05-10/Surprised Bunny.jpg", "Surprised Bunny", "2026-05-10", ["Wildlife"], "Surprised bunny", "A bunny surprised in a peaceful setting.", "Terra Nova, Richmond"),
  photo("bunny-eye", "/images/camera/2026-05-10/Bunny Eye.jpg", "Bunny Eye", "2026-05-10", ["Wildlife"], "Bunny eye", "A close-up of a bunny's eye in a peaceful setting.", "Terra Nova, Richmond"),
  photo("praying-bunny", "/images/camera/2026-05-10/Praying Bunny.jpg", "Praying Bunny", "2026-05-10", ["Wildlife"], "Praying bunny", "A bunny in a praying position in a peaceful setting.", "Terra Nova, Richmond"),
  photo("radial-flower-wipe", "/images/camera/2026-05-10/Radial Flower Wipe.jpg", "Radial Flower Wipe", "2026-05-10", ["Abstract & Detail"], "Radial flower wipe", "A radial pattern of flowers in a peaceful setting.", "Terra Nova, Richmond"),
  photo("air-canada-departure", "/images/camera/2026-05-10/Air Canada Departure.jpg", "Air Canada Departure", "2026-05-10", ["Motion & Aviation"], "Air Canada departure", "An aircraft departing from an airport.", "Terra Nova, Richmond"),
  photo("dark-ladybug-crawl", "/images/camera/2026-05-10/Dark Ladybug Crawl.jpg", "Dark Ladybug Crawl", "2026-05-10", ["Wildlife"], "Dark ladybug crawl", "A ladybug crawling on a dark leaf.", "Terra Nova, Richmond"),
  photo("ladybug-crawl", "/images/camera/2026-05-10/Ladybug Crawl.jpg", "Ladybug Crawl", "2026-05-10", ["Wildlife"], "Ladybug crawl", "A ladybug crawling on a leaf.", "Terra Nova, Richmond"),
  photo("cornfield-chase", "/images/camera/2026-05-10/Cornfield Chase.jpg", "Cornfield Chase", "2026-05-10", ["Abstract & Detail"], "Cornfield chase", "Yellow flowers in a radial wipe.", "Terra Nova, Richmond"),
  photo("flower-field-side-wipe", "/images/camera/2026-05-10/Flower Field Side Wipe.jpg", "Flower Field Side Wipe", "2026-05-10", ["Abstract & Detail"], "Flower field side wipe", "A side wipe of flowers in a peaceful setting.", "Terra Nova, Richmond"),
  photo("flower-field-swirl", "/images/camera/2026-05-10/Flower Field Swirl.jpg", "Flower Field Swirl", "2026-05-10", ["Abstract & Detail"], "Flower field swirl", "A swirling pattern of flowers in a peaceful setting.", "Terra Nova, Richmond"),
  photo("flower-field", "/images/camera/2026-05-10/Flower Field.jpg", "Flower Field", "2026-05-10", ["Abstract & Detail"], "Flower field", "A field of flowers in a peaceful setting.", "Terra Nova, Richmond"),
  photo("painted-lady-butterfly-liftoff", "/images/camera/2026-05-10/Painted Lady Butterfly Liftoff.jpg", "Painted Lady Butterfly Liftoff", "2026-05-10", ["Wildlife"], "Painted lady butterfly liftoff", "A painted lady butterfly taking off from a flower.", "Terra Nova, Richmond"),
  photo("painted-lady-butterfly", "/images/camera/2026-05-10/Painted Lady Butterfly.jpg", "Painted Lady Butterfly", "2026-05-10", ["Wildlife"], "Painted lady butterfly", "A painted lady butterfly resting on a flower.", "Terra Nova, Richmond"),
  photo("stationary-flowers", "/images/camera/2026-05-10/Stationary Flowers.jpg", "Stationary Flowers", "2026-05-10", ["Abstract & Detail"], "Stationary flowers", "A collection of stationary flowers in a peaceful setting.", "Terra Nova, Richmond"),
];

const PHOTO_LIBRARY_BY_ID = new Map(PHOTO_LIBRARY.map((photoItem) => [photoItem.id, photoItem]));

// Bundle system: collections of related photos grouped under one cover photo
export const PHOTO_BUNDLES: Bundle[] = [
  {
    id: "cherry-blossom-aerial",
    title: "Cherry Blossom Aerial",
    description: "A collection of aircraft captured mid-flight through spring cherry blossoms.",
    photoIds: ["cherry-blossom-plane", "cherry-blossom-plane-2", "cherry-blossom-private-jet"],
    coverPhotoId: "cherry-blossom-plane",
    categories: ["Motion & Aviation"],
    dateTaken: "2026-04-07",
    locationName: "Larry Berg Flight Path Park, Richmond",
  },
  {
    id: "cherry-blossom-buildings",
    title: "Cherry Blossom Buildings",
    description: "Urban architecture framed through cherry blossom branches, bridging natural and built environments.",
    photoIds: ["cherry-buildings", "cherry-blossom-sunrise"],
    coverPhotoId: "cherry-buildings",
    categories: ["Urban Nature"],
    dateTaken: "2026-03-28",
    locationName: "Graveley St, Vancouver",
  },
  {
    id: "umbrellas-study",
    title: "Umbrellas Study",
    description: "An exploration of umbrellas in various contexts and compositions.",
    photoIds: ["double-umbrellas", "ethereal-umbrellas", "umbrella-branches"],
    coverPhotoId: "double-umbrellas",
    categories: ["Abstract & Detail"],
    dateTaken: "2026-03-05",
    locationName: "Yaletown, Vancouver",
  },
  {
    id: "golden-hour-skyline",
    title: "Golden Hour Skyline",
    description: "A collection of skyline studies captured at different times of day, exploring the interplay of light and urban landscape.",
    photoIds: ["golden-hour-skyline", "blue-hour-skyline", "night-skyline", "cyberpunk-skyline"],
    coverPhotoId: "golden-hour-skyline",
    categories: ["Urban Nature"],
    dateTaken: "2026-05-02",
    locationName: "The Shipyards, North Vancouver",
  },
  {
    id: "blossom-portraits",
    title: "Blossom Portraits",
    description: "Portrait studies framed within the delicate bloom of cherry blossoms, capturing human moments amid spring.",
    photoIds: ["blossom-girl", "couple-under-blossoms"],
    coverPhotoId: "blossom-girl",
    categories: ["People & Portraits"],
    dateTaken: "2026-03-27",
    locationName: "Garry Point Park, Richmond",
  },
  {
    id: "raven-study",
    title: "Raven Study",
    description: "Close studies of ravens, exploring character and detail in urban wildlife.",
    photoIds: ["raven-close-up", "stationary-raven"],
    coverPhotoId: "raven-close-up",
    categories: ["Wildlife"],
    dateTaken: "2026-03-21",
    locationName: "Tunnel Bluffs, BC",
  },
  {
    id: "moon-studies",
    title: "Moon Studies",
    description: "Explorations of the moon in various atmospheric conditions and contexts.",
    photoIds: ["may-flower-moon", "pre-sunset-moon"],
    coverPhotoId: "may-flower-moon",
    categories: ["Abstract & Detail"],
    dateTaken: "2026-04-29",
    locationName: "Richmond, BC",
  },
  {
    id: "bunnies",
    title: "Bunnies",
    description: "A collection of bunny photos captured in a peaceful setting, showcasing various poses and moments.",
    photoIds: ["resting-bunny", "bunny-pair", "sneaky-bunny", "grazing-bunny", "chewing-bunny", "surprised-bunny", "bunny-eye", "praying-bunny"],
    coverPhotoId: "resting-bunny",
    categories: ["Wildlife"],
    dateTaken: "2026-05-10",
    locationName: "Terra Nova, Richmond",
  },
  {
    id: "flower-field",
    title: "Flower Field",
    description: "A collection of photos capturing a flower field in various compositions and moments.",
    photoIds: ["radial-flower-wipe", "cornfield-chase", "flower-field-side-wipe", "flower-field-swirl", "flower-field"],
    coverPhotoId: "radial-flower-wipe",
    categories: ["Abstract & Detail"],
    dateTaken: "2026-05-10",
    locationName: "Terra Nova, Richmond",
  },
  {
    id: "ladybug",
    title: "Ladybug",
    description: "Close-up studies of a ladybug in various moments and compositions.",
    photoIds: ["dark-ladybug-crawl", "ladybug-crawl"],
    coverPhotoId: "dark-ladybug-crawl",
    categories: ["Wildlife"],
    dateTaken: "2026-05-10",
    locationName: "Terra Nova, Richmond",
  },
  {
    id: "painted-lady-butterfly",
    title: "Painted Lady Butterfly",
    description: "A collection of photos capturing a painted lady butterfly in various moments and compositions.",
    photoIds: ["painted-lady-butterfly-liftoff", "painted-lady-butterfly"],
    coverPhotoId: "painted-lady-butterfly-liftoff",
    categories: ["Wildlife"],
    dateTaken: "2026-05-10",
    locationName: "Terra Nova, Richmond",
  }
];

const PHOTO_BUNDLES_BY_ID = new Map(PHOTO_BUNDLES.map((bundle) => [bundle.id, bundle]));

export function getBundleById(id: string): Bundle | undefined {
  return PHOTO_BUNDLES_BY_ID.get(id);
}

export function getAllBundleIds(): string[] {
  return PHOTO_BUNDLES.map((bundle) => bundle.id);
}

export function getBundlePhotos(bundleId: string): CatalogPhoto[] {
  const bundle = getBundleById(bundleId);
  if (!bundle) return [];

  return bundle.photoIds
    .map((id) => getPhotoById(id))
    .filter((photo): photo is CatalogPhoto => photo !== undefined);
}

function pickPhotos(imageIds: string[]): PhotoImage[] {
  return imageIds.map((id) => {
    const photoItem = PHOTO_LIBRARY_BY_ID.get(id);

    if (!photoItem) {
      throw new Error(`Unknown photo id: ${id}`);
    }

    return photoItem;
  });
}

function pickCollectionPhotos(itemIds: (string | GalleryItem)[]): PhotoImage[] {
  return itemIds.flatMap((item) => {
    const id = typeof item === "string" ? item : item.id;
    const type = typeof item === "string" ? "photo" : item.type;

    if (type === "bundle") {
      return getBundlePhotos(id);
    }

    const photoItem = PHOTO_LIBRARY_BY_ID.get(id);
    if (!photoItem) {
      throw new Error(`Unknown photo id: ${id}`);
    }
    return [photoItem];
  });
}

function pickCollectionItems(itemIds: (string | GalleryItem)[]): CollectionItemResult[] {
  return itemIds.map((item) => {
    const id = typeof item === "string" ? item : item.id;
    const type = typeof item === "string" ? "photo" : item.type;

    if (type === "bundle") {
      const bundle = PHOTO_BUNDLES_BY_ID.get(id);
      if (!bundle) {
        throw new Error(`Unknown bundle id: ${id}`);
      }
      const coverPhoto = PHOTO_LIBRARY_BY_ID.get(bundle.coverPhotoId);
      if (!coverPhoto) {
        throw new Error(`Unknown cover photo id for bundle ${id}: ${bundle.coverPhotoId}`);
      }
      return { ...bundle, coverPhoto };
    }

    // Default to photo
    const photoItem = PHOTO_LIBRARY_BY_ID.get(id);
    if (!photoItem) {
      throw new Error(`Unknown photo id: ${id}`);
    }
    return photoItem;
  });
}

function createCollection({ itemIds, imageIds, ...collection }: CollectionInput): Collection {
  const ids = itemIds || imageIds || [];

  return {
    ...collection,
    count: String(ids.length),
    items: pickCollectionItems(ids),
    images: pickCollectionPhotos(ids),
  };
}

export const COLLECTIONS_DATA: Collection[] = [
  createCollection({
    slug: "landscapes",
    title: "Landscapes",
    description: "Capturing the place we call home.",
    longDescription: "Mountains, skies, water, and quiet wide-open scenes.",
    coverSrc: "/images/camera/Twin Falls in Lynn Canyon.jpg",
    coverAlt: "Twin falls in Lynn Canyon",
    imageIds: [
      "fog-of-war",
      "warm-iona-sunset",
      "oceanic-tide",
      "sandy-driftwood",
      "twin-falls-lynn-canyon",
      "stormy-lighthouse",
      "gordie-howe-bridge",
      "cloud-mountains-at-sea",
      "garry-point-structure",
    ],
  }),
  createCollection({
    slug: "people-portraits",
    title: "People & Portraits",
    description: "Everyone has a story to share.",
    longDescription: "Moments, movement, and figures against light.",
    coverSrc: "/images/camera/Sunset Couple.jpg",
    coverAlt: "Sunset couple",
    itemIds: [
      "sunset-couple",
      { type: "bundle", id: "blossom-portraits" },
    ],
  }),
  createCollection({
    slug: "urban-nature",
    title: "Urban Nature",
    description: "A blend of technology and nature.",
    longDescription: "City edges, blossoms, reflections, and atmosphere.",
    coverSrc: "/images/camera/Cherry Buildings.jpg",
    coverAlt: "Cherry buildings",
    itemIds: [
      { type: "bundle", id: "golden-hour-skyline" },
      { type: "bundle", id: "cherry-blossom-buildings" },
      "mountain-vancouver",
    ],
  }),
  createCollection({
    slug: "wildlife",
    title: "Wildlife",
    description: "Those we share our home with.",
    longDescription: "Birds, close encounters, and small living details.",
    coverSrc: "/images/camera/Raven Close-up.jpg",
    coverAlt: "Raven close-up",
    itemIds: [
      { type: "bundle", id: "raven-study" },
      { type: "bundle", id: "bunnies" },
      { type: "bundle", id: "ladybug" },
      { type: "bundle", id: "painted-lady-butterfly" },
      "greater-yellowtails",
      "eagle-pair",
    ],
  }),
  createCollection({
    slug: "motion-aviation",
    title: "Motion & Aviation",
    description: "Can you feel the rush?",
    longDescription: "Planes, parachutes, and things moving through space.",
    coverSrc: "/images/camera/Flying Canopy.jpg",
    coverAlt: "Flying canopy",
    itemIds: [
      "flying-canopy",
      { type: "bundle", id: "cherry-blossom-aerial" },
      "cruising-airliner",
      "fuel-trails",
      "monochrome-air-canada",
      "moon-and-plane",
    ],
  }),
  createCollection({
    slug: "abstract-detail",
    title: "Abstract & Detail",
    description: "It's what you make of it.",
    longDescription: "Textures, moon shots, and fragments of a scene.",
    coverSrc: "/images/camera/Moon and Blossom.jpg",
    coverAlt: "Moon and blossoms",
    itemIds: [
      "stanley-park-silhouette",
      { type: "bundle", id: "umbrellas-study" },
      "double-yellow-chairs",
      { type: "bundle", id: "moon-studies" },
      { type: "bundle", id: "flower-field" },
      "red-glowing-flowers",
      "moon-and-blossom",
    ],
  }),
];

export function getCollectionBySlug(slug: string): Collection | undefined {
  return COLLECTIONS_DATA.find((c) => c.slug === slug);
}

export function getCollectionSlugs(): string[] {
  return COLLECTIONS_DATA.map((c) => c.slug);
}

export function getPhotoById(id: string): CatalogPhoto | undefined {
  return PHOTO_LIBRARY_BY_ID.get(id);
}

export function getAllPhotoIds(): string[] {
  return PHOTO_LIBRARY.map((photo) => photo.id);
}



