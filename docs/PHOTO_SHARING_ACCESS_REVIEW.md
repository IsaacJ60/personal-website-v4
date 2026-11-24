# Photo sharing — milestone 1 review

Update: Isaac approved proceeding with high-resolution originals for sharing and
no requirement to preserve legacy-site compatibility. The derivative-only export
recommendation below is superseded by [the milestone 2 review](PHOTO_SHARING_DESIGN_REVIEW.md).
The observed access results remain applicable.

Reviewed November 23, 2026. Read-only source, live database configuration, and
anonymous hosted HTTP checks. No application, storage, policy, or CDN changes.

## Findings

The live published v2 catalog contains 288 photos: 286 legacy R2 photos and two
new uploads. All 286 legacy photos have display and thumbnail files available
locally in the prepared manifest; none require regeneration to start this feature.

A representative legacy original is publicly downloadable: HTTP 200, JPEG,
4629 × 3472, 6,823,555 bytes. Its hosted prepared display is HTTP 200, WebP,
1600 × 1200, 281,976 bytes. Protecting originals requires changing delivery at
the origin, not just adding the Share button.

## Access matrix

| Path / consumer | Current evidence | Proposed treatment |
| --- | --- | --- |
| `media.isaacjiang.ca/camera/**` | Sample original returned 200 without authentication; cache max-age 14400 | Keep originals in private storage, remove anonymous access to original bytes after dependent paths use derivatives |
| `/photo-preview/<slug>.webp` and thumbnails | All 286 legacy pairs exist locally; sample hosted display returned 200 at 1600 × 1200 | Retain as intentionally public bounded derivatives |
| V2 catalog fallback in `data/catalog.ts` | Falls back to the original R2 URL when a local derivative is absent | Fail closed with an unavailable display; never expose an original as fallback |
| `PortfolioImage.tsx` retry | “Load source image” retries the catalog source without optimization; legacy fallback could be an original | Restrict retry to approved derivatives and update misleading copy |
| `/photo-legacy/**`, including legacy admin previews | Legacy photo route returned 200; source constructs R2 original URLs; category compatibility redirects still lead here | Route legacy public views to v2 derivatives or compatible v2 pages; use protected derivative/admin delivery where needed |
| `/_next/image` for R2 `/camera/**` | Config permits R2 source transformations and 31-day minimum TTL; sampled hosted request returned 402 | Remove original-source optimizer access after legacy consumers migrate; existing caches require separate review |
| `portfolio-v2-media` Storage bucket | Live configuration: private, 3,500,000-byte file limit; source accepts only bounded display/thumbnail WebPs | Retain existing derivative-only upload model; no original retention added |
| `/api/photo-preview/media/<id>/<variant>` | Sample uploaded display returned 200 at 1600 × 1200; anonymous Storage download also succeeded for that published photo | Retain public access to published derivatives; variants are allowlisted |
| Direct Storage public-bucket URL | Sample published upload returned 400 rather than image bytes | Preserve private bucket configuration |
| `/api/photo-preview/draft-media/<id>/<variant>` | Anonymous request returned 404, private/no-store; source requires admin | Preserve authenticated admin boundary |
| `/photo/share/photos/<slug>` | Sample social card returned 200, 1200 × 630 JPEG, no-store | Keep existing social-card contract; use only derivatives, remove R2 original fallback |
| Proposed framed export route | Not implemented | Known published photo only, bounded derivative input, baked-in watermark, no-store initially, never redirect to an original |
| Alternate R2 origins / custom domains / CDN copies | Not enumerated in this checkpoint | Obtain exact bucket/domain/cache configuration before access changes; audit every public origin, not just the custom domain |

Live Storage policy names match the derivative-only design: admin insert/read,
admin cleanup delete, and public SELECT for published v2 derivatives. There are
no current draft uploads, so no actual draft-object denial test was possible.
The anonymous draft-route check used a published ID to verify its login boundary.

## Recommended implementation

1. Keep display images and thumbnails intentionally public. Use the existing
   1600 × 1400 maximum display bounds for export inputs; do not upscale or fetch
   originals. Smaller originals may naturally have the same dimensions as their
   derivatives; the protection is for the retained source bytes, not a claim that
   every photo can be made lower resolution.
2. Build a separate framed export renderer and endpoint. Reuse Sharp and bundled
   branding assets; preserve the social card's existing size/metadata behavior.
   Resolve published photos server-side and load only prepared files or published
   upload derivatives. Missing images produce an error, not a source URL.
3. Start with a single PNG composition for preview, copy, and download, subject
   to milestone 2's visual and file-size review. No new database tables or image
   service are needed for this design.
4. Before locking down R2, replace original consumers in legacy views, admin
   previews, social-card fallback, and the v2 catalog. Ensure preparation tooling
   can use authenticated server-side source access for future maintenance.

## Infrastructure cutover and recovery

Before milestone 4 mutations, enumerate the R2 bucket, custom domains, any
`r2.dev` public endpoint, cached object paths, other consumers, and effective
cache rules. No exact resource mutation is approved by this source audit alone.
Choose the smallest restriction that protects originals while preserving unrelated
media. If the bucket is mixed-use, migrate protected source bytes to private
storage or replace public photo keys with bounded derivatives only after verifying
the private originals; do not simply disable the entire media domain.

Order: verify private source retention and derivative coverage; deploy derivative-only
consumers; verify pages/admin; restrict original access at all public origins;
purge affected CDN copies; repeat signed-out requests to old URLs and alternate
origins. Previous downloads and browser caches cannot be recalled. The sampled
original and static display both advertise four-hour caching.

Do not declare protection complete while an old original URL returns source bytes.
Rollback application changes only to a version compatible with protected originals;
keep originals private and preserve derivatives throughout recovery.

Publication removal is a separate existing constraint: prepared static derivatives
remain directly accessible until removed/redeployed. Current upload redirects
cache for up to 30 minutes at the edge and signed URLs last one hour. Existing
access cannot be treated as immediately revoked by changing a database row.
Use no-store for new exports and check current publication on each export request;
do not expand this feature into a full static-media revocation redesign.

## Review checkpoint

Milestone 1 is ready for architecture review. Approve derivative-only exports,
the legacy consumer migration, and the scoped origin-protection approach before
milestone 2 visual prototypes. Exact infrastructure changes remain a later review
item once their affected resources have been enumerated.

Verification limits: representative live image checks, not an exhaustive audit of
all originals; optimizer returned 402 so successful transformations were not
verified; alternate R2 origins/cache configuration and actual draft objects remain
unverified. No application tests were needed for this documentation-only change.
