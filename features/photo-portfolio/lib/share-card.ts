import sharp from "sharp";
import { join } from "node:path";

export const shareCardSize = { width: 1200, height: 630 };
const background = "#141517";
const xml = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
const fontfile = join(process.cwd(), "features/photo-portfolio/fonts/instrumentsans-share.ttf");

async function textLayer(text: string, size: number, color: string, left: number, top: number, width = 1104) {
  const input = await sharp({ text: {
    text: `<span foreground="${color}">${xml(text)}</span>`,
    font: `Instrument Sans ${size}`, fontfile, rgba: true, dpi: 72,
  } }).resize({ width, withoutEnlargement: true }).png().toBuffer();
  return { input, left, top };
}

export async function renderShareCard(title: string, image?: Buffer) {
  const label = [...title.trim()];
  const caption = label.length > 54 ? `${label.slice(0, 53).join("")}…` : label.join("");
  const photograph = image ? await sharp(image, { limitInputPixels: 100_000_000 }).rotate()
    .resize({ width: 1104, height: 482, fit: "contain", background }).flatten({ background }).toBuffer() : null;
  // Register the bundled font for each text render instead of relying on the
  // host's SVG/fontconfig defaults (serverless Linux may have no system fonts).
  const layers = await Promise.all([
    ...(!photograph ? [textLayer("IJ.PRIME", 132, "#f4f3ef", 64, 166),
      textLayer("Photographs by Isaac Jiang", 32, "#c0c1c2", 68, 310)] : []),
    textLayer("IJ.PRIME", 27, "#f4f3ef", 48, 570, 180),
    textLayer(caption || "Photography by Isaac Jiang", 25, "#c0c1c2", 260, 570, 892),
  ]);
  const rule = await sharp({ create: { width: 1104, height: 1, channels: 3, background: "#454649" } }).png().toBuffer();
  return sharp({ create: { ...shareCardSize, channels: 3, background } })
    .composite([...(photograph ? [{ input: photograph, left: 48, top: 36 }] : []), { input: rule, left: 48, top: 550 }, ...layers])
    .jpeg({ quality: 85 }).toBuffer();
}
