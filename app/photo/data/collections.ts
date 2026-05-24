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

function r2(filePath: string): string {
  return `https://media.isaacjiang.ca/camera/${encodeURIComponent(filePath)}`;
}

const PHOTO_LIBRARY: CatalogPhoto[] = [
  photo("stanley-park-silhouette", r2("Stanley Park Silhouette.jpg"), "Stanley Park Silhouette", "2026-02-28", ["Abstract & Detail"], "Stanley Park silhouette", "A silhouette study of the iconic Stanley Park landscape, capturing the interplay of light and shadow.", "Stanley Park, Vancouver"),
  photo("double-umbrellas", r2("Double Umbrellas.jpg"), "Double Umbrellas", "2026-03-05", ["Abstract & Detail"], "Double umbrellas", "Two umbrellas framed as an abstract composition, exploring minimal form and geometry.", "Yaletown, Vancouver"),
  photo("flying-canopy", r2("Flying Canopy.jpg"), "Flying Canopy", "2026-03-07", ["Motion & Aviation"], "Flying canopy", "A dynamic capture of a deployed skydiving canopy in full flight, frozen mid-descent.", "Garry Point Park, Richmond"),
  photo("raven-close-up", r2("Raven Close-up.jpg"), "Raven Close-up", "2026-03-21", ["Wildlife"], "Raven close-up", "An intimate portrait of a raven, capturing detail and character of urban wildlife.", "Tunnel Bluffs, BC"),
  photo("sunset-couple", r2("Sunset Couple.jpg"), "Sunset Couple", "2026-03-27", ["People & Portraits"], "Sunset couple", "A silhouetted couple framed against the warm glow of a setting sun.", "Garry Point Park, Richmond"),
  photo("blossom-girl", r2("Blossom Girl.jpg"), "Blossom Girl", "2026-03-27", ["People & Portraits"], "Blossom girl", "Portrait of a figure amid spring blossoms, blending human presence with natural surroundings.", "Garry Point Park, Richmond"),
  photo("cherry-buildings", r2("Cherry Buildings.jpg"), "Cherry Buildings", "2026-03-28", ["Urban Nature"], "Cherry buildings", "Urban architecture framed through cherry blossom branches, bridging natural and built environments.", "Graveley St, Vancouver"),
  photo("cherry-blossom-sunrise", r2("Cherry Blossom Sunrise.jpg"), "Cherry Blossom Sunrise", "2026-03-28", ["Urban Nature"], "Cherry blossom sunrise", "A sunrise scene framed by cherry blossoms, capturing the ephemeral beauty of dawn and spring.", "Graveley St, Vancouver"),
  photo("blue-hour-skyline", r2("Blue Hour Skyline.jpg"), "Blue Hour Skyline", "2026-05-02", ["Urban Nature"], "Blue hour skyline", "A city skyline captured during the blue hour, where artificial and natural light converge.", "The Shipyards, North Vancouver"),
  photo("cherry-blossom-plane", r2("Cherry Blossom Plane.jpg"), "Cherry Blossom Plane", "2026-04-07", ["Motion & Aviation"], "Cherry blossom plane", "An aircraft passing overhead amid spring cherry blossoms, merging sky and season.", "Larry Berg Flight Path Park, Richmond"),
  photo("cherry-blossom-plane-2", r2("Cherry Blossom Plane 2.jpg"), "Cherry Blossom Plane 2", "2026-04-06", ["Motion & Aviation"], "Cherry blossom plane", "A second perspective of aircraft and blossoms in compositional dialogue.", "Larry Berg Flight Path Park, Richmond"),
  photo("cherry-blossom-private-jet", r2("Cherry Blossom Private Jet.jpg"), "Cherry Blossom Private Jet", "2026-04-07", ["Motion & Aviation"], "Cherry blossom private jet", "A private jet silhouetted against spring blooms, a moment of convergence between modes of travel.", "Larry Berg Flight Path Park, Richmond"),
  photo("cruising-airliner", r2("Cruising Airliner.jpg"), "Cruising Airliner", "2026-04-05", ["Motion & Aviation"], "Cruising airliner", "A commercial airliner captured mid-flight, a study in scale and transit.", "YVR Airport, Vancouver"),
  photo("cyberpunk-skyline", r2("Cyberpunk Skyline.jpg"), "Cyberpunk Skyline", "2026-05-02", ["Urban Nature"], "Cyberpunk skyline", "A futuristic-leaning urban landscape with neon-tinted atmosphere and towering geometry.", "The Shipyards, North Vancouver"),
  photo("double-yellow-chairs", r2("Double Yellow Chairs.jpg"), "Double Yellow Chairs", "2026-05-02", ["Abstract & Detail"], "Double yellow chairs", "Two yellow chairs as a minimalist composition, exploring color and repetition.", "The Shipyards, North Vancouver"),
  photo("fog-of-war", r2("Fog of War.jpg"), "Fog of War", "2026-04-15", ["Landscapes"], "Fog of war", "A moody landscape enveloped in mist, where visibility and mystery intertwine.", "Lighthouse Park, West Vancouver"),
  photo("fuel-trails", r2("Fuel Trails.jpg"), "Fuel Trails", "2026-04-05", ["Motion & Aviation"], "Fuel trails", "Contrails streaking across the sky, marking invisible paths of aviation.", "Larry Berg Flight Path Park, Richmond"),
  photo("golden-hour-skyline", r2("Golden Hour Skyline.jpg"), "Golden Hour Skyline", "2026-05-02", ["Landscapes"], "Golden hour skyline", "A city bathed in the warm, diffused light of the golden hour at sunset.", "The Shipyards, North Vancouver"),
  photo("gordie-howe-bridge", r2("Gordie Howe Bridge.jpg"), "Gordie Howe Bridge", "2026-04-22", ["Landscapes"], "Gordie Howe Bridge", "The distinctive cable-stayed bridge connecting Windsor and Detroit, a modern engineering landmark.", "Malden Park, Windsor"),
  photo("greater-yellowtails", r2("Greater Yellowtails.jpg"), "Greater Yellowtails", "2026-04-08", ["Wildlife"], "Greater yellowtails", "A vibrant study of greater yellowtail fish, exploring aquatic life and color.", "Iona Beach, Richmond"),
  photo("may-flower-moon", r2("May Flower Moon.jpg"), "May Flower Moon", "2026-05-01", ["Abstract & Detail"], "May flower moon", "Moonlight, intimate and ethereal.", "Richmond, BC"),
  photo("monochrome-air-canada", r2("Monochrome Air Canada.jpg"), "Monochrome Air Canada", "2026-04-05", ["Motion & Aviation"], "Monochrome air canada", "An Air Canada aircraft rendered in black and white, emphasizing form over color.", "YVR Airport, Vancouver"),
  photo("moon-and-blossom", r2("Moon and Blossom.jpg"), "Moon and Blossom", "2026-03-29", ["Abstract & Detail"], "Moon and blossom", "A poetic juxtaposition of lunar presence and delicate spring blooms.", "Queen Elizabeth Park, Vancouver"),
  photo("moon-and-plane", r2("Moon and Plane.jpg"), "Moon and Plane", "2026-02-28", ["Motion & Aviation"], "Moon and plane", "The moon and an aircraft in compositional alignment, a rare celestial-terrestrial moment.", "Stanley Park, Vancouver"),
  photo("night-skyline", r2("Night Skyline.jpg"), "Night Skyline", "2026-05-02", ["Urban Nature"], "Night skyline", "An urban silhouette under a darkened sky, lights and darkness in balance.", "The Shipyards, North Vancouver"),
  photo("oceanic-tide", r2("Oceanic Tide.jpg"), "Oceanic Tide", "2026-04-08", ["Landscapes"], "Oceanic tide", "A dynamic seascape where tidal forces shape the landscape in patterns and motion.", "Iona Beach, Richmond"),
  photo("pre-sunset-moon", r2("Pre-Sunset Moon.jpg"), "Pre-Sunset Moon", "2026-04-29", ["Abstract & Detail"], "Pre-sunset moon", "The moon visible in dusky light, captured just before twilight deepens.", "Garry Point Park, Richmond"),
  photo("red-glowing-flowers", r2("Red Glowing Flowers.jpg"), "Red Glowing Flowers", "2026-04-29", ["Abstract & Detail"], "Red glowing flowers", "Red flowers suffused with warm light, a study in color saturation and warmth.", "Kuno Japanese Garden, Richmond"),
  photo("sandy-driftwood", r2("Sandy Driftwood.jpg"), "Sandy Driftwood", "2026-04-08", ["Landscapes"], "Sandy driftwood", "Weathered driftwood on a sandy shore, texture and time rendered visible.", "Iona Beach, Richmond"),
  photo("stormy-lighthouse", r2("Stormy Lighthouse.jpg"), "Stormy Lighthouse", "2026-04-15", ["Landscapes"], "Stormy lighthouse", "A lighthouse standing resolute against dramatic sky and turbulent conditions.", "Lighthouse Park, West Vancouver"),
  photo("twin-falls-lynn-canyon", r2("Twin Falls in Lynn Canyon.jpg"), "Twin Falls in Lynn Canyon", "2026-05-02", ["Landscapes"], "Twin falls", "Twin cascades in Lynn Canyon, capturing the power and grace of flowing water.", "Lynn Canyon Park, Vancouver"),
  photo("warm-iona-sunset", r2("Warm Iona Sunset.jpg"), "Warm Iona Sunset", "2026-04-08", ["Landscapes"], "Warm Iona sunset", "A golden sunset on Iona Beach, where sand, sky, and light converge in warmth.", "Iona Beach, Richmond"),
  photo("mountain-vancouver", r2("Mountain Vancouver.jpg"), "Mountain Vancouver", "2026-05-03", ["Urban Nature"], "Mountain Vancouver", "A mountain framed against the urban backdrop of Vancouver, nature and city in proximity.", "Mt. Gardner, Bowen Island"),
  photo("cloud-mountains-at-sea", r2("Cloud Mountains at Sea.jpg"), "Cloud Mountains at Sea", "2026-02-14", ["Landscapes"], "Cloud mountain at sea", "Clouds forming over mountains at sea.", "Garry Point Park, Richmond"),
  photo("ethereal-umbrellas", r2("Ethereal Umbrellas.jpg"), "Ethereal Umbrellas", "2026-03-05", ["Abstract & Detail"], "Ethereal umbrellas", "Umbrellas floating in an ethereal landscape.", "Yaletown, Vancouver"),
  photo("umbrella-branches", r2("Umbrella Branches.jpg"), "Umbrella Branches", "2026-03-05", ["Abstract & Detail"], "Umbrella branches", "A pink umbrella in front of sprawling branches.", "Yaletown, Vancouver"),
  photo("garry-point-structure", r2("Garry Point Structure.jpg"), "Garry Point Structure", "2026-03-07", ["Landscapes"], "Garry point structure", "A structural element in Garry Point Park.", "Garry Point Park, Richmond"),
  photo("stationary-raven", r2("Stationary Raven.jpg"), "Stationary Raven", "2026-03-21", ["Wildlife"], "Stationary raven", "A raven standing on a cliff.", "Tunnel Bluffs, BC"),
  photo("eagle-pair", r2("Eagle Pair.jpg"), "Eagle Pair", "2026-03-27", ["Wildlife"], "Eagle pair", "Two eagles pictured together.", "West Dyke Trail, Richmond"),
  photo("couple-under-blossoms", r2("Couple Under Blossoms.jpg"), "Couple Under Blossoms", "2026-03-27", ["Portraits"], "Couple under blossoms", "A couple standing under cherry blossoms.", "Garry Point Park, Richmond"),
  photo("resting-bunny", r2("2026-05-10/Resting Bunny.jpg"), "Resting Bunny", "2026-05-10", ["Wildlife"], "Resting bunny", "A bunny resting in a peaceful setting.", "Terra Nova, Richmond"),
  photo("bunny-pair", r2("2026-05-10/Bunny Pair.jpg"), "Bunny Pair", "2026-05-10", ["Wildlife"], "Bunny pair", "Two bunnies resting in a peaceful setting.", "Terra Nova, Richmond"),
  photo("sneaky-bunny", r2("2026-05-10/Sneaky Bunny.jpg"), "Sneaky Bunny", "2026-05-10", ["Wildlife"], "Sneaky bunny", "A bunny peeking out from a peaceful setting.", "Terra Nova, Richmond"),
  photo("grazing-bunny", r2("2026-05-10/Grazing Bunny.jpg"), "Grazing Bunny", "2026-05-10", ["Wildlife"], "Grazing bunny", "A bunny grazing in a peaceful setting.", "Terra Nova, Richmond"),
  photo("chewing-bunny", r2("2026-05-10/Chewing Bunny.jpg"), "Chewing Bunny", "2026-05-10", ["Wildlife"], "Chewing bunny", "A bunny chewing on vegetation in a peaceful setting.", "Terra Nova, Richmond"),
  photo("surprised-bunny", r2("2026-05-10/Surprised Bunny.jpg"), "Surprised Bunny", "2026-05-10", ["Wildlife"], "Surprised bunny", "A bunny surprised in a peaceful setting.", "Terra Nova, Richmond"),
  photo("bunny-eye", r2("2026-05-10/Bunny Eye.jpg"), "Bunny Eye", "2026-05-10", ["Wildlife"], "Bunny eye", "A close-up of a bunny's eye in a peaceful setting.", "Terra Nova, Richmond"),
  photo("praying-bunny", r2("2026-05-10/Praying Bunny.jpg"), "Praying Bunny", "2026-05-10", ["Wildlife"], "Praying bunny", "A bunny in a praying position in a peaceful setting.", "Terra Nova, Richmond"),
  photo("radial-flower-wipe", r2("2026-05-10/Radial Flower Wipe.jpg"), "Radial Flower Wipe", "2026-05-10", ["Abstract & Detail"], "Radial flower wipe", "A radial pattern of flowers in a peaceful setting.", "Terra Nova, Richmond"),
  photo("air-canada-departure", r2("2026-05-10/Air Canada Departure.jpg"), "Air Canada Departure", "2026-05-10", ["Motion & Aviation"], "Air Canada departure", "An aircraft departing from an airport.", "Terra Nova, Richmond"),
  photo("dark-ladybug-crawl", r2("2026-05-10/Dark Ladybug Crawl.jpg"), "Dark Ladybug Crawl", "2026-05-10", ["Wildlife"], "Dark ladybug crawl", "A ladybug crawling on a dark leaf.", "Terra Nova, Richmond"),
  photo("ladybug-crawl", r2("2026-05-10/Ladybug Crawl.jpg"), "Ladybug Crawl", "2026-05-10", ["Wildlife"], "Ladybug crawl", "A ladybug crawling on a leaf.", "Terra Nova, Richmond"),
  photo("cornfield-chase", r2("2026-05-10/Cornfield Chase.jpg"), "Cornfield Chase", "2026-05-10", ["Abstract & Detail"], "Cornfield chase", "Yellow flowers in a radial wipe.", "Terra Nova, Richmond"),
  photo("flower-field-side-wipe", r2("2026-05-10/Flower Field Side Wipe.jpg"), "Flower Field Side Wipe", "2026-05-10", ["Abstract & Detail"], "Flower field side wipe", "A side wipe of flowers in a peaceful setting.", "Terra Nova, Richmond"),
  photo("flower-field-swirl", r2("2026-05-10/Flower Field Swirl.jpg"), "Flower Field Swirl", "2026-05-10", ["Abstract & Detail"], "Flower field swirl", "A swirling pattern of flowers in a peaceful setting.", "Terra Nova, Richmond"),
  photo("flower-field", r2("2026-05-10/Flower Field.jpg"), "Flower Field", "2026-05-10", ["Abstract & Detail"], "Flower field", "A field of flowers in a peaceful setting.", "Terra Nova, Richmond"),
  photo("painted-lady-butterfly-liftoff", r2("2026-05-10/Painted Lady Butterfly Liftoff.jpg"), "Painted Lady Butterfly Liftoff", "2026-05-10", ["Wildlife"], "Painted lady butterfly liftoff", "A painted lady butterfly taking off from a flower.", "Terra Nova, Richmond"),
  photo("painted-lady-butterfly", r2("2026-05-10/Painted Lady Butterfly.jpg"), "Painted Lady Butterfly", "2026-05-10", ["Wildlife"], "Painted lady butterfly", "A painted lady butterfly resting on a flower.", "Terra Nova, Richmond"),
  photo("stationary-flowers", r2("2026-05-10/Stationary Flowers.jpg"), "Stationary Flowers", "2026-05-10", ["Abstract & Detail"], "Stationary flowers", "A collection of stationary flowers in a peaceful setting.", "Terra Nova, Richmond"),
  photo("lions-gate-bridge-front-view", r2("2026-05-11/Lions Gate Bridge Front View.jpg"), "Lions Gate Bridge Front View", "2026-05-11", ["Landscapes"], "Lions Gate Bridge front view", "A front view of the Lions Gate Bridge.", "Stanley Park, Vancouver"),
  photo("lions-gate-bridge-front-view-muted", r2("2026-05-11/Lions Gate Bridge Front View Muted.jpg"), "Lions Gate Bridge Front View Muted", "2026-05-11", ["Landscapes"], "Lions Gate Bridge front view muted", "A front view of the Lions Gate Bridge with muted colors.", "Stanley Park, Vancouver"),
  photo("blue-hour-lions-gate-bridge", r2("2026-05-12/Blue Hour Lions Gate Bridge.jpg"), "Blue Hour Lions Gate Bridge", "2026-05-12", ["Landscapes"], "Blue hour Lions Gate Bridge", "The Lions Gate Bridge captured during the blue hour.", "Stanley Park, Vancouver"),
  photo("lions-gate-bridge-night", r2("2026-05-12/Lions Gate Bridge Night.jpg"), "Lions Gate Bridge Night", "2026-05-12", ["Landscapes"], "Lions Gate Bridge night", "The Lions Gate Bridge captured at night.", "Stanley Park, Vancouver"),
  photo("lions-gate-bridge-pillar", r2("2026-05-12/Lions Gate Bridge Pillar.jpg"), "Lions Gate Bridge Pillar", "2026-05-12", ["Landscapes"], "Lions Gate Bridge pillar", "A close-up of a pillar of the Lions Gate Bridge.", "Stanley Park, Vancouver"),
  photo("lions-gate-bridge-red-streak", r2("2026-05-12/Lions Gate Bridge Red Streak.jpg"), "Lions Gate Bridge Red Streak", "2026-05-12", ["Landscapes"], "Lions Gate Bridge red streak", "The Lions Gate Bridge with a red light streak from a passing bike.", "Stanley Park, Vancouver"),
  photo("battle-in-the-clouds", r2("2026-05-15/Battle in the Clouds.jpg"), "Battle in the Clouds", "2026-05-15", ["Abstract & Detail"], "Battle in the clouds", "A dramatic sky with clouds that evoke a sense of battle or turmoil.", "Garry Point Park, Richmond"),
  photo("circular-flowering-tree", r2("2026-05-15/Circular Flowering Tree.jpg"), "Circular Flowering Tree", "2026-05-15", ["Abstract & Detail"], "Circular flowering tree", "A flowering tree with a circular motion wipe.", "Garry Point Park, Richmond"),
  photo("graphical-flower-wipe", r2("2026-05-15/Graphical Flower Wipe.jpg"), "Graphical Flower Wipe", "2026-05-15", ["Abstract & Detail"], "Graphical flower wipe", "A graphical composition of flowers in a wipe pattern.", "Garry Point Park, Richmond"),
  photo("intense-circular-flower-field", r2("2026-05-15/Intense Circular Flower Field.jpg"), "Intense Circular Flower Field", "2026-05-15", ["Abstract & Detail"], "Intense circular flower field", "A circular composition of flowers with intense colors.", "Garry Point Park, Richmond"),
  photo("lone-tree", r2("2026-05-15/Lone Tree.jpg"), "Lone Tree", "2026-05-15", ["Landscapes"], "Lone tree", "A solitary tree in a peaceful setting.", "Garry Point Park, Richmond"),
  photo("pastel-flower-field", r2("2026-05-15/Pastel Flower Field.jpg"), "Pastel Flower Field", "2026-05-15", ["Abstract & Detail"], "Pastel flower field", "A field of flowers with pastel colors.", "Garry Point Park, Richmond"),
  photo("stairway-to-heaven", r2("2026-05-15/Stairway to Heaven.jpg"), "Stairway to Heaven", "2026-05-15", ["Abstract & Detail"], "Stairway to heaven", "A motion blurred flower tree.", "Garry Point Park, Richmond"),
  photo("swimming-petals", r2("2026-05-15/Swimming Petals.jpg"), "Swimming Petals", "2026-05-15", ["Abstract & Detail"], "Swimming petals", "A motion blurred composition of flower petals.", "Garry Point Park, Richmond"),
  photo("E28-BMW-535i", r2("2026-05-16/E28 BMW 535i.jpg"), "E28 BMW 535i", "2026-05-16", ["Motion & Aviation"], "E28 BMW 535i", "A vintage E28 BMW 535i captured stationary.", "Vancouver Waterfront, BC"),
  photo("skyscraper-greenery", r2("2026-05-16/Skyscraper Greenery.jpg"), "Skyscraper Greenery", "2026-05-16", ["Urban Nature"], "Skyscraper greenery", "A skyscraper with greenery on its facade.", "Downtown Vancouver, BC"),
  photo("buildings-of-scale", r2("2026-05-16/Buildings of Scale.jpg"), "Buildings of Scale", "2026-05-16", ["Urban Nature"], "Buildings of scale", "Skyscrapers towering over a small building, emphasizing scale.", "Downtown Vancouver, BC"),
  photo("stormy-rescue-plane", r2("2026-05-16/Stormy Rescue Plane.jpg"), "Stormy Rescue Plane", "2026-05-16", ["Motion & Aviation"], "Stormy rescue plane", "A rescue plane flying through stormy conditions.", "Vancouver Waterfront, BC"),
  photo("icy-mountain-helicopter", r2("2026-05-16/Icy Mountain Helicopter.jpg"), "Icy Mountain Helicopter", "2026-05-16", ["Motion & Aviation"], "Icy mountain helicopter", "A helicopter flying over icy mountains.", "Vancouver Waterfront, BC"),
  photo("1968-chevrolet-camaro-rally-sport", r2("2026-05-18/1968 Chevrolet Camaro Rally Sport.jpg"), "1968 Chevrolet Camaro Rally Sport", "2026-05-18", ["Motion & Aviation"], "1968 Chevrolet Camaro Rally Sport", "A vintage 1968 Chevrolet Camaro Rally Sport captured in motion.", "Vancouver Waterfront, BC"),
  photo("BMW-M3-competition-sedan", r2("2026-05-18/BMW M3 Competition Sedan.jpg"), "BMW M3 Competition Sedan", "2026-05-18", ["Motion & Aviation"], "BMW M3 competition sedan", "A modern BMW M3 Competition Sedan captured stationary.", "Downtown Vancouver, BC"),
  photo("street-portrait-01", r2("2026-05-18/Street Portrait 01.jpg"), "Street Portrait 01", "2026-05-18", ["People & Portraits"], "Street portrait 01", "A candid street portrait of a person in an urban setting.", "Downtown Vancouver, BC"),
  photo("street-portrait-02", r2("2026-05-18/Street Portrait 02.jpg"), "Street Portrait 02", "2026-05-18", ["People & Portraits"], "Street portrait 02", "A candid street portrait of a person in an urban setting.", "Downtown Vancouver, BC"),
  photo("street-portrait-03", r2("2026-05-18/Street Portrait 03.jpg"), "Street Portrait 03", "2026-05-18", ["People & Portraits"], "Street portrait 03", "A candid street portrait of a person in an urban setting.", "Downtown Vancouver, BC"),
  photo("street-portrait-04", r2("2026-05-18/Street Portrait 04.jpg"), "Street Portrait 04", "2026-05-18", ["People & Portraits"], "Street portrait 04", "A candid street portrait of a person in an urban setting.", "Downtown Vancouver, BC"),
  photo("street-portrait-05", r2("2026-05-18/Street Portrait 05.jpg"), "Street Portrait 05", "2026-05-18", ["People & Portraits"], "Street portrait 05", "A candid street portrait of a person in an urban setting.", "Downtown Vancouver, BC"),
  photo("street-portrait-06", r2("2026-05-18/Street Portrait 06.jpg"), "Street Portrait 06", "2026-05-18", ["People & Portraits"], "Street portrait 06", "A candid street portrait of a person in an urban setting.", "Downtown Vancouver, BC"),
  photo("custom-1930s-ford-cabriolet-hot-rod", r2("2026-05-22/Custom 1930s Ford Cabriolet Hot Rod.jpg"), "Custom 1930s Ford Cabriolet Hot Rod", "2026-05-22", ["Motion & Aviation"], "Custom 1930s Ford Cabriolet Hot Rod", "A custom 1930s Ford Cabriolet Hot Rod", "English Bay, Vancouver"),
  photo("english-bay-leisure", r2("2026-05-22/English Bay Leisure.jpg"), "English Bay Leisure", "2026-05-22", ["People & Portraits"], "English Bay leisure", "A leisure scene at English Bay.", "English Bay, Vancouver"),
  photo("english-bay-sunset", r2("2026-05-22/English Bay Sunset.jpg"), "English Bay Sunset", "2026-05-22", ["Landscapes"], "English Bay sunset", "A sunset scene at English Bay.", "English Bay, Vancouver"),
  photo("fifa-girl", r2("2026-05-22/FIFA Girl.jpg"), "FIFA Girl", "2026-05-22", ["People & Portraits"], "FIFA girl", "A candid portrait of a young woman in an urban setting.", "Downtown Vancouver, BC"),
  photo("granville-bridge-pillar", r2("2026-05-22/Granville Bridge Pillar.jpg"), "Granville Bridge Pillar", "2026-05-22", ["Urban Nature"], "Granville Bridge pillar", "A close-up of a pillar of the Granville Bridge.", "English Bay, Vancouver"),
  photo("ice-cream-couple", r2("2026-05-22/Ice Cream Couple.jpg"), "Ice Cream Couple", "2026-05-22", ["People & Portraits"], "Ice cream couple", "A candid portrait of a couple enjoying ice cream in an urban setting.", "English Bay, Vancouver"),
  photo("lamborghini-aventador-SV-roadster", r2("2026-05-22/Lamborghini Aventador SV Roadster.jpg"), "Lamborghini Aventador SV Roadster", "2026-05-22", ["Motion & Aviation"], "Lamborghini Aventador SV Roadster", "A Lamborghini Aventador SV Roadster captured in motion.", "English Bay, Vancouver"),
  photo("man-on-fallen-tree", r2("2026-05-22/Man on Fallen Tree.jpg"), "Man on Fallen Tree", "2026-05-22", ["People & Portraits"], "Man on fallen tree", "A candid portrait of a man sitting on a fallen tree in a natural setting.", "English Bay, Vancouver"),
  photo("red-yamaha", r2("2026-05-22/Red Yamaha.jpg"), "Red Yamaha", "2026-05-22", ["Motion & Aviation"], "Red Yamaha", "A red Yamaha motorcycle.", "Downtown Vancouver, BC"),
  photo("thinking-man", r2("2026-05-22/Thinking Man.jpg"), "Thinking Man", "2026-05-22", ["People & Portraits"], "Thinking man", "A candid portrait of a man in an urban setting.", "English Bay, Vancouver"),
  photo("toyota-GR-supra", r2("2026-05-22/Toyota GR Supra.jpg"), "Toyota GR Supra", "2026-05-22", ["Motion & Aviation"], "Toyota GR Supra", "A Toyota GR Supra.", "Downtown Vancouver, BC"),
  photo("warm-chef", r2("2026-05-22/Warm Chef.jpg"), "Warm Chef", "2026-05-22", ["People & Portraits"], "Warm chef", "A candid portrait of a chef in an urban setting.", "Downtown Vancouver, BC"),
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
  },
  {
    id: "lions-gate-bridge-front-view",
    title: "Lions Gate Bridge Front View",
    description: "A collection of photos capturing the front view of the Lions Gate Bridge in various compositions and moments.",
    photoIds: ["lions-gate-bridge-front-view", "lions-gate-bridge-front-view-muted"],
    coverPhotoId: "lions-gate-bridge-front-view",
    categories: ["Landscapes"],
    dateTaken: "2026-05-11",
    locationName: "Stanley Park, Vancouver",
  },
  {
    id: "lions-gate-bridge-landscapes",
    title: "Lions Gate Bridge Landscapes",
    description: "A collection of photos capturing the landscapes of the Lions Gate Bridge.",
    photoIds: ["blue-hour-lions-gate-bridge", "lions-gate-bridge-night", "lions-gate-bridge-pillar", "lions-gate-bridge-red-streak"],
    coverPhotoId: "blue-hour-lions-gate-bridge",
    categories: ["Landscapes"],
    dateTaken: "2026-05-12",
    locationName: "Stanley Park, Vancouver",
  },
  {
    id: "garry-point-flowers",
    title: "Garry Point Flowers",
    description: "A collection of photos capturing the flowers of Garry Point Park in various compositions and moments.",
    photoIds: ["circular-flowering-tree", "graphical-flower-wipe", "intense-circular-flower-field", "pastel-flower-field", "stairway-to-heaven", "swimming-petals"],
    coverPhotoId: "circular-flowering-tree",
    categories: ["Abstract & Detail"],
    dateTaken: "2026-05-15",
    locationName: "Garry Point Park, Richmond",
  },
  {
    id: "street-portrait-part-1",
    title: "Street Portrait Part 1",
    description: "A collection of candid street portraits of people in an urban setting.",
    photoIds: ["street-portrait-03", "street-portrait-04", "street-portrait-06", "street-portrait-01", "street-portrait-05", "street-portrait-02",],
    coverPhotoId: "street-portrait-03",
    categories: ["Portraits"],
    dateTaken: "2026-05-16",
    locationName: "Downtown Vancouver",
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

function createCollection({ itemIds, ...collection }: CollectionInput): Collection {
  const ids = itemIds || [];

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
    coverSrc: r2("Twin Falls in Lynn Canyon.jpg"),
    coverAlt: "Twin falls in Lynn Canyon",
    itemIds: [
      { type: "bundle", id: "lions-gate-bridge-front-view" },
      { type: "bundle", id: "lions-gate-bridge-landscapes" },
      "fog-of-war",
      "warm-iona-sunset",
      "oceanic-tide",
      "sandy-driftwood",
      "twin-falls-lynn-canyon",
      "stormy-lighthouse",
      "gordie-howe-bridge",
      "cloud-mountains-at-sea",
      "garry-point-structure",
      "battle-in-the-clouds",
      "lone-tree",
      "english-bay-sunset",
    ],
  }),
  createCollection({
    slug: "people-portraits",
    title: "People & Portraits",
    description: "Everyone has a story to share.",
    longDescription: "Moments, movement, and figures against light.",
    coverSrc: r2("Sunset Couple.jpg"),
    coverAlt: "Sunset couple",
    itemIds: [
      "sunset-couple",
      { type: "bundle", id: "blossom-portraits" },
      { type: "bundle", id: "street-portrait-part-1" },
      "english-bay-leisure",
      "fifa-girl",
      "man-on-fallen-tree",
      "thinking-man",
      "warm-chef",
    ],
  }),
  createCollection({
    slug: "urban-nature",
    title: "Urban Nature",
    description: "A blend of technology and nature.",
    longDescription: "City edges, blossoms, reflections, and atmosphere.",
    coverSrc: r2("Cherry Buildings.jpg"),
    coverAlt: "Cherry buildings",
    itemIds: [
      { type: "bundle", id: "golden-hour-skyline" },
      { type: "bundle", id: "cherry-blossom-buildings" },
      "mountain-vancouver",
      "skyscraper-greenery",
      "buildings-of-scale",
      "granville-bridge-pillar",
    ],
  }),
  createCollection({
    slug: "wildlife",
    title: "Wildlife",
    description: "Those we share our home with.",
    longDescription: "Birds, close encounters, and small living details.",
    coverSrc: r2("Raven Close-up.jpg"),
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
    coverSrc: r2("Flying Canopy.jpg"),
    coverAlt: "Flying canopy",
    itemIds: [
      "flying-canopy",
      { type: "bundle", id: "cherry-blossom-aerial" },
      "cruising-airliner",
      "fuel-trails",
      "monochrome-air-canada",
      "moon-and-plane",
      "E28-BMW-535i",
      "stormy-rescue-plane",
      "icy-mountain-helicopter",
      "1968-chevrolet-camaro-rally-sport",
      "BMW-M3-competition-sedan",
      "custom-1930s-ford-cabriolet-hot-rod",
      "lamborghini-aventador-SV-roadster",
      "red-yamaha",
      "toyota-GR-supra",
    ],
  }),
  createCollection({
    slug: "abstract-detail",
    title: "Abstract & Detail",
    description: "It's what you make of it.",
    longDescription: "Textures, moon shots, and fragments of a scene.",
    coverSrc: r2("Moon and Blossom.jpg"),
    coverAlt: "Moon and blossoms",
    itemIds: [
      "stanley-park-silhouette",
      { type: "bundle", id: "umbrellas-study" },
      "double-yellow-chairs",
      { type: "bundle", id: "moon-studies" },
      { type: "bundle", id: "flower-field" },
      { type: "bundle", id: "garry-point-flowers" },
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



