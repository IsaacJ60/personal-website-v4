// Temporary edits of PUBLIC v2 photos. These do not read unpublished collections
// or write curation decisions back to Supabase. Published edits take precedence.
export const demoEdits = [
  {
    slug: "selected-work",
    title: "Selected Work",
    kind: "selected" as const,
    description: "",
    slugs: ["rays-of-light-widescreen", "skytrain-in-golden-light", "window-and-shadow", "sunset-couple", "blue-flower-1", "fog-of-war", "yellow-car-yellow-tree", "moon-and-blossom", "man-in-golden-light", "cherry-buildings", "stanley-park-silhouette", "glowing-forest"],
  },
  {
    slug: "between-stops",
    title: "Between Stops",
    kind: "series" as const,
    description: "Trains, crossings, and moments along the way. A working edit about the places we pass through.",
    slugs: ["skytrain-in-golden-light", "train-to-yvr", "plane-on-negative-space", "man-in-golden-light", "yellow-car-yellow-tree", "stanley-park-silhouette"],
  },
  {
    slug: "edges-of-the-day",
    title: "Edges of the Day",
    kind: "series" as const,
    description: "The last light on familiar places. Shorelines, silhouettes, and the slow change from day to night.",
    slugs: ["rays-of-light-widescreen", "sunset-couple", "golden-hour-skyline", "fog-of-war", "man-in-golden-light", "moon-and-blossom"],
  },
  {
    slug: "small-worlds",
    title: "Small Worlds",
    kind: "series" as const,
    description: "A closer look. Flowers, fragments, and small things that are easy to walk past.",
    slugs: ["blue-flower-1", "window-and-shadow", "moon-and-blossom", "double-yellow-chairs", "cherry-buildings", "glowing-forest"],
  },
];
