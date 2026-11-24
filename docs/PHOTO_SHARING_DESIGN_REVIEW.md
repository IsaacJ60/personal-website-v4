# Photo sharing — milestone 2 design review

November 23, 2026. Local frame samples only; no production changes.

## Revised requirements

Isaac requested high-resolution sharing and does not require legacy-site
compatibility. This supersedes the derivative-only recommendation in milestone 1.

- Preserve the original photo's native pixel dimensions; add the frame around it.
- Read originals server-side from private storage in the final implementation.
  Never return source bytes or a signed original URL to a public visitor.
- Retain originals for future uploads, independently of public display derivatives.
  The two existing derivative-only uploads need their originals supplied again;
  do not present upscaled display files as high-resolution exports.
- Legacy routes may be retired or redirected instead of migrated individually.
  Restricting original access must still cover all origins and optimizer paths.
- High-resolution files need a delivery design checked against hosting limits.
  Prefer storage-backed delivery of generated watermarked artifacts if needed;
  public clients must never obtain the unwatermarked source as an intermediate step.

## Proposed visual treatment

White frame, proportional spacing, IJ.PRIME footer with photographer/site credit,
and a small IJ.PRIME watermark baked into the lower-right corner of the photo.
The watermark has a translucent dark backing to remain readable over light areas.
Using the existing wordmark is a proposal; no separate watermark asset was found.

The local preview script generated four samples from published originals:

| Sample | Photo pixels retained | Framed output | JPEG | PNG |
| --- | --- | --- | --- | --- |
| City of Embers | 5906 × 3937 | 6320 × 4883 | 3.4 MB | 13.2 MB |
| Grazing Bunny | 4000 × 6000 | 4420 × 6960 | 5.4 MB | 33.0 MB |
| Flair Airplane | 4000 × 5333 | 4374 × 6187 | 4.6 MB | 23.7 MB |
| Rays of Light | 5984 × 2240 | 6402 × 3197 | 3.2 MB | 16.3 MB |

The closest-to-square available published sample is still 3:4; no real square
photo was substituted or cropped. Square geometry still needs a fixture check
during renderer implementation. Samples cover bright and dark photographs.

Recommend quality-95 JPEG with 4:4:4 chroma for download and PNG for clipboard,
using the same composited pixels. A smaller preview can be shown in the dialog;
the exported photo retains native resolution. No source upscaling or cropping.

Outputs are in the local OS temp directory `photo-sharing-review`: `review.png`,
individual `.jpg`/`.png` samples, and `samples.json`. Regenerate with
`node scripts/preview-photo-sharing.mjs`. Originals are downloaded into memory
and are not saved to the repository or uploaded anywhere.

## Interaction direction for milestone 3

Place Share beside Details in the viewer toolbar. Open a dialog with an image
preview, photo title, output dimensions, Download image and Copy image actions.
On mobile, keep the preview contained and actions easy to reach. Show preparation
and copy feedback; offer download when clipboard access is unavailable. Validate
the actual desktop/mobile dialog layout during milestone 3 before release.

## Review checkpoint

Approve or revise the frame, embedded watermark, footer, and JPEG/PNG choice
before implementing the application flow. Changed-script lint passed, and the
contact sheet was visually inspected. Actual browser clipboard behavior, hosted
delivery limits, private original retention, and original replacement remain
implementation work, not completed features.
