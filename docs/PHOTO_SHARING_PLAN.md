# Photo sharing implementation plan

Status: milestone 2 approved; milestone 3 is implemented locally and awaiting manual
review. See [implementation progress and verification](PHOTO_SHARING_PROGRESS.md),
[the access review](PHOTO_SHARING_ACCESS_REVIEW.md), and
[the design review](PHOTO_SHARING_DESIGN_REVIEW.md).

Original retention has also been implemented locally and its private R2 bucket
provisioned; see [configuration and remaining verification](PHOTO_ORIGINAL_STORAGE.md).
Legacy original-access protection and deployment remain outstanding.

## Scope and assumptions

Visitors can select Share in the photo viewer, preview a polished frame containing
the photograph and Isaac's watermark, then download or copy the composed image.
The photograph keeps its aspect ratio and is not cropped. Start with one approved
design; no frame editor, accounts, or social-network integrations.

Public pages continue to show appropriately sized display images. Full-resolution
originals must not be publicly retrievable, including through old URLs or fallback
paths. Display images can still be saved or screenshotted; this feature cannot
prevent that. Watermarks must be embedded in the exported pixels, not just HTML.

Use the current Next.js application and hosting. Reuse Sharp and the existing
branding/font assets where appropriate. No new image service or database table is
assumed necessary until original retention is designed. Sharing must use private
high-resolution originals, preserving native photo dimensions without upscaling.
Existing display derivatives are for browsing only. Two current uploads have no
retained original; require original replacement before enabling high-resolution
sharing for them. Future uploads must retain a private original as well as the
existing display/thumbnail derivatives. Store originals privately in R2; the
derivative pipeline must never replace or discard the retained source file.
Legacy site compatibility is not required.

**Review process:** stop after each milestone with a reviewable result, the checks
performed, and any remaining limitations. Wait for Isaac's approval before starting
the next milestone. Implement locally until the final release checkpoint.

## Milestone 1 — Confirm image access and delivery design

- Trace legacy R2 images, prepared local assets, new Supabase uploads, social cards,
  public catalog payloads, image optimization, and fallback paths.
- Identify which files are actual originals versus bounded derivatives. Check live
  anonymous access read-only; source inspection alone cannot establish protection.
- Inventory consumers of the public R2 domain before proposing access changes;
  preserve unrelated website media and authenticated admin workflows.
- Record how display images, thumbnails, and framed exports will be delivered,
  and how public access to originals will be removed without breaking photographs.
- Define cache handling and the rollback sequence. Previously downloaded files
  cannot be recalled; old CDN copies and alternate public origins need explicit checks.

**Manual review:** a short access matrix showing each image path, what it serves,
current public access, and proposed access. Approve the architecture and the exact
scope of any later storage/CDN changes. No remote mutations in this milestone.

## Milestone 2 — Approve frame and watermark design

- Produce local sample exports for landscape, portrait, square, and panoramic
  photos, including light and dark photographs.
- Start with a quiet frame using existing IJ.PRIME branding. Confirm the actual
  watermark asset/text, whether it overlays the photo or sits in the border,
  its size and contrast, and whether a title/site address belongs in the frame.
- Agree on export dimensions and format. Prefer one PNG artifact for both copy
  and download initially; inspect actual file sizes before committing to that choice.
- Show the proposed Share button and dialog placement on desktop and mobile.

**Manual review:** inspect the sample images at full size and phone size; approve
the visual treatment, output size/format, and interaction layout before integration.
The existing 1200 × 630 social preview card is a reference, not a required export shape.

## Milestone 3 — Build the complete sharing flow locally

- Add a server-rendered export using the approved design and bounded original inputs.
  Resolve a known photo ID/slug through published-only data; never accept an
  arbitrary source URL or expose an original as an error fallback.
- Add Share to the shared photo viewer so individual, Selected Work, and Series
  views use the same flow. Preview, copy, and download must use the same composition.
- Include loading, retry, download filenames, copy success/failure feedback, and
  a download fallback when clipboard access is unavailable or denied.
- Preserve keyboard navigation, focus return, dialog dismissal, and mobile layout.
  Ensure changing photos cannot download/copy the previous photo accidentally.
- Keep social preview cards working. Bound input bytes/pixels and output size;
  avoid publicly caching exports beyond the agreed publication/removal behavior.

Approved implementation adjustment: full-resolution JPEG downloads and PNG clipboard
copies share one composition. Stream large exports directly instead of adding artifact
storage; only dialog previews are resized.

**Verification:** focused renderer/route checks for aspect ratio, watermark pixels,
published-only access, invalid IDs, and failures; changed-file lint and TypeScript.

**Manual review:** open real portrait/landscape photos on desktop and mobile;
download and open the file, paste the copied image into another app, deny clipboard
access, retry a failed request, and navigate between photos. Approve the full flow.

## Milestone 4 — Close direct full-resolution access

- Add private original retention for future uploads and original replacement for
  the two existing derivative-only uploads. Verify authenticated original reads and
  configure the required R2 credentials before production release.
- Ensure all public viewers, cards, and fallbacks consume bounded derivatives.
  Generate any missing derivatives before restricting their original sources.
- Remove original URLs from browser payloads and direct public delivery paths.
  Legacy routes may be retired or redirected; preserving their behavior is not required.
  Apply the storage/CDN changes reviewed in milestone 1 only after showing the
  exact affected resources and a ready recovery procedure.
- Check old R2/custom-domain URLs, alternate public bucket origins, optimizer
  requests, direct storage access, and cached responses. Restrict originals at
  their source; hiding links or disabling right-click is insufficient.
- Preserve authenticated admin access and the upload/publish workflow. If policies
  change, record migrations and run the relevant database policy tests.

**Manual review:** in a signed-out browser, confirm representative old original
URLs no longer return image bytes, while public display images and watermarked
exports still work. Review the access matrix again with actual verification results.
Do not call the protection requirement complete while a public original path remains.

## Milestone 5 — Release and verify on the hosted site

- Present the final diff, completed checkpoint results, required infrastructure
  changes, deployment order, and rollback steps for release approval.
- After approval, deploy and verify the actual hosted renderer, fonts, image
  delivery, clipboard behavior over HTTPS, downloads, and mobile layout.
- Recheck anonymous original access, publication boundaries, existing social cards,
  and admin upload/publish behavior without changing real publication state as a test.
- If a rollback is needed, keep originals protected; restoring application code
  must not depend on restoring public access to original objects.

**Manual review:** Isaac tries the hosted flow on desktop and phone and approves
the saved/pasted result. Record the deployed version and any remaining limitations.

## Main implementation touchpoints

- `features/photo-portfolio/components/PortfolioViewer.tsx` and `portfolio.module.css`
- `features/photo-portfolio/components/PortfolioImage.tsx` and `data/catalog.ts`
- `features/photo-portfolio/lib/share-card.ts` and `app/photo/share/[...path]/route.ts`
  as existing renderer/source-loading references; keep social metadata contracts intact
- `app/api/photo-preview/media/[id]/[variant]/route.ts` and upload-media helpers
- `scripts/prepare-photo-preview.mjs` and legacy R2 delivery configuration

Add only the export renderer/route, dialog, and focused checks needed by the approved
design. Update this document with milestone results as implementation proceeds.
