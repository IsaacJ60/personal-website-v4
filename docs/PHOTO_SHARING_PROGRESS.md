# Photo sharing progress

## HD copy and frame text — November 23, 2026

Added separate Copy HD image and Copy full-size image actions. HD is a PNG of
the same completed composition, limited to 1920 pixels on its longest edge with
no upscaling; full-size copies and JPEG downloads retain native photo resolution.
The endpoint reports the actual HD output dimensions and image/png content type.

The frame now uses the photo title instead of another IJ.PRIME label. IJ.PRIME
remains the embedded watermark. Photographer attribution stays on the left and
isaacjiang.ca aligns with the photo's right edge on the same credit line. Titles
are escaped and fitted within the frame. The sample generator now uses the actual
export renderer so regenerated reviews match the application.

Ten renderer tests, TypeScript, and changed-file lint pass. A real local HD request
returned a complete 1920 × 1633 PNG with matching dimension headers. Nothing deployed.

## Local original-storage verification — November 23, 2026

Configured the supplied R2 access credentials only in ignored `.env.local`.
Authenticated legacy reads and private original writes/reads now work locally.
A generated fixture passed signed PUT/CORS, byte preservation, immutable retries,
anonymous-access denial, and full-resolution framed rendering. The fixture was
removed; no catalog rows or user photos were changed. See
[storage verification and remaining release checks](PHOTO_ORIGINAL_STORAGE.md).
This supersedes the earlier local-credentials limitation. Hosted credentials and
deployment remain unchanged.

## Original retention fix — November 23, 2026

Implemented private R2 original retention for new single/bulk uploads and connected
sharing to those originals. Provisioned `photo-originals` with public access off,
restricted PUT CORS, and the bucket-name variable in Vercel Preview/Production.
See [storage behavior, checks, and release requirements](PHOTO_ORIGINAL_STORAGE.md).
Code is local and not deployed. An authenticated storage round trip and the existing
token's access to the new bucket remain unverified; originals for the two older
derivative-only uploads still need to be supplied or matched to existing source files.

The milestone 3 notes below describe the earlier checkpoint; their statements that
future original retention was unimplemented are superseded by this update.

## Milestone 3 — local implementation ready for review

November 23, 2026. Milestone 2's frame/wordmark was approved. Implementation is
local only; no deployment, policy change, storage mutation, or original-access
restriction was performed.

### Implemented

- Share appears in the shared photo viewer, including individual and sequence views.
- Native modal with a bounded preview, native photo/export dimensions, JPEG
  download, PNG copy, preparation status, retry, and clipboard fallback messaging.
- Original photo dimensions and edges are preserved, with the approved white
  frame/footer and watermark embedded in the photo pixels. EXIF/XMP are omitted.
- The endpoint accepts a UUID and allowlisted format, checks current publication
  through the anonymous catalog, and returns only composed images. It never
  redirects visitors to originals or accepts a user-supplied source URL.
- Full-size exports stream directly; previews alone are reduced to 1000 px bounds.
  Responses are no-store. Sharp's writable side is explicitly ended before Web
  stream conversion to prevent truncated responses at EOF.
- Closing the modal aborts its requests and releases the preview URL. Photo changes
  remount the sharing control, avoiding stale-photo actions. Escape closes the
  modal and returns focus to Share; existing viewer arrow navigation pauses while
  the dialog is open.

### Verification

- Eight renderer/regression tests passed: landscape, portrait, square, panorama,
  uncropped edges/native resolution, visible footer/watermark, JPEG/preview sizes,
  EXIF rotation, metadata removal, invalid inputs, and complete streamed decoding.
- Changed-file lint, TypeScript, and `git diff --check` passed.
- Local endpoint: malformed/missing IDs and unsupported format returned 404;
  derivative-only upload returned 409; full JPEG, full PNG, and preview returned
  complete decodable images with no-store and no Content-Length.
- Real sample: retained 5906 × 3937 photo pixels in a 6320 × 4883 framed export.
  JPEG 3,387,237 bytes; PNG 13,203,295 bytes; preview 1000 × 773, 67,174 bytes.
- Browser: downloaded JPEG saved successfully and independently inspected at
  6320 × 4883; Copy image reported successful completion; missing-original message,
  retry, modal dismissal, and focus return were checked.
- Desktop 1440 × 900 and mobile 390 × 844 layouts were inspected. Review screenshots
  are saved in the OS temp directory `photo-sharing-review`.

### Limits and next checkpoint

- Local R2 credentials are absent. Development alone can read the existing public
  CDN source server-side for review. Production has no public-source fallback and
  requires configured authenticated R2 access before release.
- Originals remain publicly accessible through the existing infrastructure. That
  requirement belongs to milestone 4 and is not complete.
- Two newer uploads retain only derivatives and correctly cannot generate a
  high-resolution export. Replacing their originals and retaining private originals
  in future uploads still need implementation alongside the storage design.
  The affected records are **Blossom Mist** (`blossom-mist-a79aac6a-db9`) and
  **Moon and Blossom V2** (`moon-and-blossom-v2-b1eab62d-795`), both 1600 × 1200.
  Isaac confirmed R2 must retain originals, with display images generated separately.
  An older `Moon and Blossom.jpg` exists in R2 at 4875 × 3900, but its aspect ratio
  and sampled pixels differ from the newer upload. Confirm the intended version
  before linking an existing original or requesting replacement files.
- There are currently no draft photo rows for a live unpublished-ID test; the
  endpoint explicitly filters published rows and uses the anonymous RLS client.
- Browser automation reported successful clipboard writing, but its separate
  virtual clipboard could not paste that image into another page. Isaac should
  verify pasting into a real app during manual review. Clipboard denial/unsupported
  browser behavior is implemented but still needs manual compatibility checks.
- Hosted streaming/font behavior and production credentials are unverified until
  the approved release. Streaming follows the documented alternative to large
  buffered responses in [Vercel's payload guidance](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions).

**Manual review:** open a photo locally, select Share, download/open the JPEG,
copy/paste into another app, and inspect the mobile layout. Approve milestone 3
before proceeding to private original retention and direct-access protection.
