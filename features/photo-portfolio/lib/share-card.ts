import sharp from "sharp";

export const shareCardSize = { width: 1200, height: 630 };
const background = "#141517";
const xml = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);

export async function renderShareCard(title: string, image?: Buffer) {
  const label = [...title.trim()];
  const caption = xml(label.length > 54 ? `${label.slice(0, 53).join("")}…` : label.join(""));
  const photograph = image ? await sharp(image, { limitInputPixels: 100_000_000 }).rotate()
    .resize({ width: 1104, height: 482, fit: "contain", background }).flatten({ background }).toBuffer() : null;
  const svg = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <g fill="#f4f3ef" font-family="Arial, Helvetica, sans-serif">
      ${photograph ? "" : `<text x="64" y="265" font-size="132" letter-spacing="-7">IJ.PRIME</text>
      <text x="68" y="333" font-size="32" fill="#c0c1c2">Photographs by Isaac Jiang</text>`}
      <path d="M48 550H1152" stroke="#454649"/>
      <text x="48" y="593" font-size="27" letter-spacing="-1">IJ.PRIME</text>
      <text x="260" y="591" font-size="25" fill="#c0c1c2">${caption}</text>
    </g>
  </svg>`);
  return sharp({ create: { ...shareCardSize, channels: 3, background } })
    .composite([...(photograph ? [{ input: photograph, left: 48, top: 36 }] : []), { input: svg, left: 0, top: 0 }])
    .jpeg({ quality: 85 }).toBuffer();
}
