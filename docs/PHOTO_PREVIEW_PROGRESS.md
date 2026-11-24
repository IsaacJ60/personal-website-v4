# Photo preview: UI checkpoints

## Search and sharing — Checkpoint 3, November 23, 2026

**All three local implementation checkpoints are ready for review.** Added native
`/sitemap.xml` and `/robots.txt`. The sitemap uses the existing anonymous,
published-only catalog, excluding code-defined demo Series and collection kinds
without public detail routes. Entries include the homepage, four photo overview
pages, every public photo, and real published Series; no admin, legacy, preview,
share-image, redirect, filter/search, or slide-parameter URLs are listed.

Photo and collection models now carry their database modification timestamps.
The sitemap uses those dates where known and omits dates for static overview
pages rather than inventing a new modification time on every request. It is
force-dynamic; publication, unpublication, and deletion require no redeployment
or separate sitemap cache invalidation. The served response uses max-age=0 and
must-revalidate. Robots advertises the canonical sitemap and permits crawling,
including public media/cards and pages whose existing noindex directives need
to be read. Admin authentication and admin/legacy noindex settings are unchanged.

Validation: four sitemap tests, TypeScript, and changed-file lint pass. Local
XML matched an independent anonymous public-catalog query exactly: 294 unique
URLs (288 photographs, one Series, five main pages), with 289 real modification
dates. Robots, freshness headers, and representative homepage/overview/photo/
Series responses and canonical URLs passed HTTP checks. No real publication
state was changed for testing. Deployment and hosted crawler/link-unfurl checks
remain the next release step; no deployment was performed in these checkpoints.

## Search and sharing — Checkpoint 2, November 23, 2026

**Stop for owner review of the sharing cards before sitemap work.** Public
Open Graph and Twitter images now point to 1200 × 630 JPEG cards with a graphite
background, uncropped photograph, and IJ.PRIME/title footer. Overview pages use
a branded fallback; Selected Work uses its first photo; Series use their chosen
cover or first photo; individual links use the photo displayed by the viewer.

The public card route accepts only known card kinds and published catalog slugs.
It reads prepared local derivatives or uses anonymous Storage access for new
uploads. Legacy remote media is restricted to the configured CDN/camera path
with bounded downloads. Missing/unpublished slugs return 404; temporary image
failures return a branded card. Responses are no-store so removed photos aren't
kept in this endpoint's cache. Prepared assets are explicitly included in its
production file trace. No schema changes, dependencies, new external image
service, deployment, or sitemap changes.

Validation: nine focused metadata/render tests pass, including portrait top/bottom
and landscape left/right edge preservation, JPEG dimensions, text escaping, and
matching OG/Twitter URLs and alt text. TypeScript passes. Local crawler requests
returned valid cards for the default, Selected Work, portrait, landscape, and
Series; actual rendered portrait/default examples were visually inspected.
Archive photo selection points to the matching card; unavailable/invalid card
paths return 404. Hosted link-unfurl behavior remains a post-deployment check.

## Search and sharing — Checkpoint 1, November 23, 2026

**Stop for owner review before sharing cards or sitemap work.** Public photo
routes now have explicit titles, descriptions, absolute canonical URLs, and
matching Open Graph/Twitter text through a small shared metadata helper. The
existing `/og.jpg` is retained until the visual sharing-card checkpoint.

- Selected Work, Series, Archive, and About have their own metadata. Photos use
  their title and caption, with an author description when no caption exists.
  Series use their published title/description; demo Series are noindex.
- Photo-page rendering and metadata share the same Archive sequence resolution.
  A valid `?photo=` selection canonicalizes to the displayed photo's permanent
  URL; missing/out-of-sequence selections follow the viewer's actual fallback.
- Archive pagination has distinct clamped canonical URLs. Filter/search results
  are noindex with normalized self-canonicals. Tracking parameters are omitted.
  Series and Selected Work retain collection canonicals during slide navigation.
- Existing admin and legacy noindex layouts remain unchanged. No authentication,
  database changes, URL migrations, preview-image generation, or deployment.

Validation: six targeted metadata/viewer tests, TypeScript, and changed-file lint
pass. Local Twitterbot HTML checks verified all four overview pages, Archive
page two, filtered Archive noindex, admin login noindex, matching direct/shared
photo titles/canonicals, and stable Series canonicals with a slide parameter.
Examples: Selected Work — IJ.PRIME; Blue Flower 9 — IJ.PRIME;
Archive — Page 2 — IJ.PRIME. Next: photography-specific sharing-card review.

## Bulk photo upload

### Checkpoint 3 — Batch publishing, November 23, 2026

**Stop for owner review at `/photo/admin/photos/bulk`.** Photos now links directly
to the batch uploader; the single-photo uploader remains linked from that page.

- Publish photos confirms the number of eligible photos becoming public. New
  uploads save privately first, then publish. Existing saved drafts publish
  without sending image bytes again. Preparation errors are excluded; missing
  required fields block the requested batch on confirmation without inline hints.
- Queue entries preserve separate saved-file and publication state. Publication
  failures retain the saved draft, UUID, and intended operation. Retry failed
  confirms any publications again and skips successful photos.
- Compact results show Published · View, with public links opening in a new tab.
  Draft results retain Saved · Edit. Footer counts drafts, publications, and failures.
- The new admin-only publish endpoint checks the origin, UUID, upload identity,
  reviewed metadata, and both derivatives. It changes only publication state,
  uses an optimistic revision check, and returns already-published photos safely
  after a lost response. It does not alter edited metadata or recreate deleted photos.
- Authentication pauses processing; retry retains publication intent. No schema
  changes or real photo publications were performed during implementation.

Verification: ten focused HTTP queue tests pass, covering drafts, new/saved
publication, partial failure, lost responses, authentication pause, and cancellation.
TypeScript and changed-file lint pass. The local publish endpoint returns HTTP
401 to a signed-out empty request. Signed-in save → publish → public-view behavior remains owner
review; the tests use mocked HTTP responses rather than live photo publications.

### Checkpoint 2 — Save drafts and retry, November 23, 2026

**Stop for owner review at `/photo/admin/photos/bulk`.** Checkpoint 1 was reviewed
and approved, including compact rows, filename tooltips, one details toggle, and
backdrop dismissal of the preview. Inline missing-field hints were removed.

- Save drafts validates the prepared batch on click, then sends one photo at a
  time through the existing upload endpoint with `mode=draft`. Invalid required
  fields block the batch with a single message before any request is sent.
- The footer shows current position and saved/failed/ready counts. Failed photos
  retain their data; Retry failed skips successes. Save drafts resumes both new
  and failed items. Preparation errors remain removable and do not block valid
  prepared photos.
- Submitted metadata is locked. Retries reuse the same UUID, prepared image, and
  metadata so an ambiguous response can resolve through endpoint idempotency.
  Saved rows link to their metadata editor and remain visible in the results.
- Authentication failures pause the batch. A new-tab login link preserves this
  page's queue. Unmount aborts the client request and stops further requests;
  saved server records remain saved. Queue state does not survive a reload.
- No schema, policies, storage settings, upload endpoint, or public visibility
  changes. Publishing remains the next milestone after review.

Verification: TypeScript and changed-file lint pass. Five focused tests with
mocked HTTP responses cover sequential/partial success, lost-response retry
identity, authentication pause, malformed responses, and unmount cancellation.
These do not exercise live storage or the signed-in browser flow. Owner review
should save a small batch, check its drafts in Photos, and exercise retry after
a network interruption before proceeding to batch publishing.

### Checkpoint 1 — Batch review UI, November 23, 2026

**Stop for owner review at `/photo/admin/photos/bulk`.** The single-photo upload
page links to this checkpoint and remains available at `/photo/admin/photos/new`.

- Multiple selection/drop appends to a local queue. Images prepare sequentially
  with the existing WebP/EXIF helper; individual failures do not stop the queue.
- All titles, dates, and locations are editable together, with independent
  caption/alt-text expansions and Expand all / Collapse all controls.
- Select photos to explicitly apply a shared date or location. Desktop rows
  become stacked cards on mobile; thumbnails open a larger native-dialog preview.
- Unsaved navigation warnings and object-URL cleanup cover the local queue.
- Review only: no upload requests or saving/publishing controls in this checkpoint.
  Closing/reloading the page loses the queue. Existing single-photo saving remains
  unchanged.

Verification: changed-file lint passes. The local route redirects signed-out
visitors to admin login. The verification browser has no admin session, so the
populated desktop/mobile queue and interactions still need owner browser review.

Next, after review: sequential upload processing, progress, partial-failure
retries with stable photo IDs, then publishing confirmation and final results.

## Launch rehearsal — November 23, 2026

Signed-out requests passed for Selected Work, Series, Archive, and both new
uploads. Both sizes of both uploads returned WebP bytes from Supabase Storage
without going through the image optimizer. At 390 × 844, the public pages
fit the screen width, the slideshows fit the viewport, and Blossom Mist loaded.

Route mapping for cutover:

| Existing entry | Cutover destination |
| --- | --- |
| `/photo` | New Selected Work |
| `/photo/photos/:slug` | Same URL, served by the new viewer. All 286 original public photo slugs match. |
| `/photo/gallery` | New Archive at `/photo/archive` |
| `/photo/gallery/:category` | Keep the old category route until Archive can represent the category |
| `/photo/bundles/:id` | Map to `/photo/series/:slug` when the import has a public copy. Keep the old route for the remaining 33. |
| `/photo/admin` | New admin, with the old admin available at a separate rollback path |

Only two of the 35 old public bundles currently have matching public Series.
Keep the original handlers as a fallback for unmatched links during cutover.

## Milestone 12 — Single-photo upload

**Review from Photos → Upload photo.** Choose a JPEG, PNG, or WebP, review the
image and fields, then save it as a draft. The form uses the capture date when
available. The resulting photo opens in the existing details editor and can be
selected in a collection draft. Publish photo makes the photo visible in
Archive and eligible for published collections.

The browser prepares an orientation-aware display WebP inside 1600 × 1400.
The authenticated upload validates it and makes a thumbnail inside 480 × 480.
Only derivatives are stored. The private bucket's read policy follows the
corresponding photo's publication state. Public image URLs redirect to the
prepared objects without invoking a transformation. Existing R2 photos use
their original delivery paths.

Verified 77 database tests, signed-out route protections, and a local synthetic
upload retry, save, publish, and media redirect. The hosted bucket was created
empty and both existing catalogs still have 286 photos. The signed-in upload
flow is ready for owner review before the portfolio route switch.

## Milestone 11 — Photo metadata editor

**Review at `/photo-preview/admin/photos`.** Manage photos links from the
curation editors and the Series list. The photo editor reuses the photo library,
search, pagination, buttons, and field styles. Returning from a photo restores
the library search and page. Edit title, date taken, location, caption, and alt
text. Blank alt text uses the photo's title.

The save action checks the admin session and matches the record revision under
existing Supabase RLS. Metadata edits appear wherever the photo is used in v2
after saving. Photo identity, membership, media, and visibility are outside this
save path. Uploads are the next checkpoint.

## Milestone 10 — Publishing from the editor and unpublishing

The Series photo library puts selected photos first, before applying pagination.
The Series and Selected Work editors offer Publish for saved drafts and Save &
publish for unsaved edits. The preview remains available for checking the edit.
The Series list marks each row as Draft, Published, or Unpublished, and flags
saved edits that differ from the live version.

Unpublish hides the public copy and keeps the draft and the public URL reserved
for republishing. Save & publish commits both operations together. Database
tests cover rollback, stale actions, and public visibility after unpublishing.
The hosted migration preserved the two existing public versions and their order.

## Milestone 9 — Publishing from private preview, November 23, 2026

**Review the Publish control in the Selected Work or Series draft preview.**
The dialog names the saved draft and explains its visibility before submitting.
A published draft links to its public view. After another save, Publish update
replaces that version and preserves the Series URL.

Public copies use independent collection records and ordered memberships. They
share the public photo catalog. The first real publication of each kind takes
the place of its demo content. The original gallery remains on its old tables.

All 72 local database tests pass, including first publication, updates at a
stable URL, draft privacy, stale previews, and rollback. The hosted migration
created zero publications. Local HTTP checks confirmed demo rendering and that
both publishing previews require sign-in. Signed-in publication is ready for
the owner's review. Uploads and photo metadata editing are the next milestone.

## Milestone 8 — Private Series editor, November 23, 2026

**Review at `/photo-preview/admin/series` using the existing admin account.**
The Selected Work editor also links to this list. It includes all 35 imported
series. You can open an import or start a new series, edit its title and
description, and arrange the photographs with the shared library and sequence
controls. Use a star to choose a cover independently of the sequence. Without
an explicit cover, the first photograph is used.

Save & preview opens a private tile using the public Series card. Opening that
card shows the slideshow and Index in the saved order. Draft saves write
metadata and membership in one transaction and reject stale edits. Series
publishing is the next milestone after review.

Verified TypeScript, scoped ESLint, 66 local database tests, hosted RPC
permissions, sign-in redirects for all five Series admin routes, and public demo
cards. Authenticated rendering and the full save-to-preview interaction are
pending the owner's browser review.

## Milestone 7 — Private Selected Work editor, November 23, 2026

**Pause for the owner's UI review at `/photo-preview/admin`.** Sign in using the
existing admin account. This is the first curation milestone, not a replacement
for the old admin yet.

- Searchable, paginated v2 photo library; add/remove photographs and reorder with
  keyboard-accessible arrow buttons. The first photograph becomes the cover.
- Empty drafts stay empty. “Start with demo selection” explicitly loads the demo
  into local editor state; nothing is saved until requested.
- Save draft uses one atomic, admin-only database operation with an optimistic
  revision check. A stale editor cannot overwrite a newer save. Failed saves keep
  local edits. The browser warns before unloading with unsaved edits.
- “Save & preview” saves pending edits before opening the authenticated viewer at
  `/photo-preview/admin/preview`. This route reads private v2 data independently
  from the anonymous public catalog. There is no publishing control.
- New login/actions and typed session client use the existing admin identity and
  Supabase session. Guards run in loaders/actions as well as the protected layout.
  No service-role access, original-table edits, uploads, or deployments.

Validation: TypeScript, scoped ESLint, diff checks, and all 59 database tests pass.
Database tests cover authorization, stale edits, invalid selections, atomic
rollback, and draft privacy. Live metadata confirms an invoker RPC with empty
search path, no anonymous execute access, and unchanged 286-photo catalogs.
Anonymous browser visits to both editor and preview correctly redirect to login.
The verification browser has no admin session, so authenticated editor rendering
and save/preview interactions still need the owner's browser review; do not claim
they have been exercised end to end yet.

Key files: `features/photo-portfolio/data/admin.ts`,
`components/SelectionEditor.tsx`, `admin.module.css`, and `app/photo-preview/admin/`.
Next: review this UI and authenticated flow, then add v2 series management and
deliberate publishing. Upload/media editing remains a later milestone.

## Milestone 6 — Mobile and navigation polish, November 23, 2026

**Pause here for review before starting v2 curation tools.**

Fixed issues found in the browser/source review:

- Mobile menu closes with Escape (restoring button focus), outside clicks, focus
  leaving the sidebar, and browser history navigation. Arrow shortcuts no longer
  advance the underlying photo while the menu or sidebar controls have focus.
- Short mobile menus scroll within the viewport. Desktop-style sidebars also
  scroll on short landscape tablets, making the footer/theme control reachable.
- A 667 × 375 phone landscape viewer had a zero-height photograph and clipped
  return link. Compact landscape spacing now keeps the photograph and controls
  visible; it hides only the preview label/byline on those short screens.
- Archive photo viewers retain the active Archive marker. Their return links now
  follow the current photograph and its filtered page, including crossing page
  boundaries. The grid scrolls to and focuses the matching thumbnail on return.
- Fullscreen keeps an explicit accessible name when its visible label is hidden
  at tablet widths.

Verification:

- All four overview destinations checked in both themes at 320 × 568 and
  834 × 1112 (16 page/theme/size cases); no horizontal overflow. Slideshow stays
  viewport-height while other pages scroll normally.
- 667 × 375 phone landscape: bounded scrollable menu, visible photo/return link.
  844 × 390 tablet landscape: sidebar scrolls; photograph retains positive height.
- Filtered Archive page two → photo → previous boundary / Back / return checked;
  return restores query/page, scrolls to `photo-orange-light`, and focuses it.
- Escape/outside dismissal, menu arrow-key isolation, browser Back/Forward photo
  updates, and keyboard Index selection/focus verified. No captured console errors.
- TypeScript, scoped ESLint, and diff checks passed. Used the existing dev server;
  no production build, deployment, schema changes, or legacy gallery changes.

Key files: `Sidebar.tsx`, `PortfolioViewer.tsx`, `Archive.tsx`,
`app/photo-preview/photos/[slug]/page.tsx`, and the scoped responsive stylesheet.

## Milestone 5 — About / Contact, November 23, 2026

Review URL: `http://localhost:3000/photo-preview/about`.
**Pause here for the user's review of the copy, spacing, and contact layout.**

- Replaced the placeholder with a dedicated About route and metadata. Removed
  the generic `[section]` placeholder route, now that all sidebar pages exist.
- Bio was revised by the user to: `CS student @ University of Waterloo who enjoys
  taking photos :)`. Preserve their wording and casual punctuation.
- Direct email link uses `isaac.jiang66@gmail.com`, explicitly supplied by the
  user for public display. Photography Instagram and personal-site links use the
  existing public destinations. No form, database writes, or sent messages.
- Public link details are centralized in `features/photo-portfolio/data/profile.ts`
  and reused in the sidebar. The email was not inferred from connected accounts.
- Two-column desktop layout, stacked mobile layout, shared title spacing and both
  approved typography/themes. New styles use existing theme variables.
- TypeScript, scoped ESLint, and diff checks passed. Browser verified the mailto,
  photography Instagram and `/` destinations, active navigation, both themes,
  keyboard traversal, and 390 px / 320 px phone widths without horizontal overflow.
  No captured browser console errors. Did not launch a mail client or send mail.
- Existing local dev server used. No build, deployment, or `/photo` cutover.

Key files: `app/photo-preview/about/page.tsx`,
`features/photo-portfolio/data/profile.ts`, `components/Sidebar.tsx`, and the
`.aboutLayout` / `.contactList` rules in `portfolio.module.css`.

## Milestone 4 — Light/dark themes, November 23, 2026

Review URLs: `/photo-preview` and `/photo-preview/series` on the existing local
dev server. **Approved:** user settled on darker graphite (`#141517`). Theme/font
review is complete. Next proposed UI milestone is the compact About/Contact page,
which is still a placeholder; stop for review after implementing that milestone.

- Light mode uses the approved Fraunces + Manrope combination. Dark uses Space
  Grotesk + IBM Plex Sans. Both keep Instrument Sans for the IJ.PRIME wordmark.
- Palette review now offers warm beige/taupe, neutral graphite grey, and deep ink
  blue. All three previewed at 1280 × 720. The user is leaning toward graphite
  and requested darker beige/graphite variants: revised to `#1f1c18` / `#141517`,
  with corresponding surfaces/borders and softer text. Both rechecked at the
  same viewport; darker graphite is now the approved active palette.
  Switch through `portfolioDarkPalette` in `features/photo-portfolio/appearance.ts`.
  Each palette includes text, surfaces, borders, and focus accents. No palette UI;
  light mode and typography are preserved. Do not change the approved palette
  without a new user request.
- Theme button sits beside copyright on desktop and beside the menu on mobile.
  Existing `next-themes` root preference is reused; persistence/default/system
  behavior comes from `app/providers.tsx`. No new dependency or preference store.
- Typography/palette respond to the root class through scoped CSS variables.
  Button markup is identical between server and client; theme icons/actions are
  shown through CSS. See [PHOTO_TYPOGRAPHY_OPTIONS.md](PHOTO_TYPOGRAPHY_OPTIONS.md)
  for current implementation; earlier one-at-a-time font review is superseded.
- Filter/Index/Details state survives a theme switch. Browser verified both theme
  reloads, Archive picker, mobile menu, keyboard switching, and local font loads.
  Desktop viewer remained 720 px document / 720 px viewport; mobile 844 / 844 with
  no horizontal overflow. No captured console errors.
- TypeScript, scoped ESLint, and diff checks passed. User's existing dev server
  used; no production build, deployment, database writes, or legacy gallery edits.

Key files: `features/photo-portfolio/typography.ts`,
`components/PortfolioThemeSwitch.tsx`, `components/Sidebar.tsx`, and
`portfolio.module.css`.

## Milestone 3 — Archive, November 23, 2026

Review URL: `http://localhost:3000/photo-preview/archive`.

Review revisions:

- Selected Work now explicitly omits its viewer subtitle, including in Index.
  Series can retain their temporary demo labels. Sidebar footer contains only
  Instagram/Personal website as a single group, followed by copyright with a
  separate 24 px gap. Removed the Current gallery link and its special spacing.
- Final typography combination requested: option 2 throughout (Fraunces headings,
  Manrope body/navigation/byline), with Instrument Sans from option 1 used only
  for the IJ.PRIME wordmark. Verified browser font families and weight 500 on the
  wordmark. Saved as the preferred combination; user subsequently requested
  previewing option 3 while retaining that wordmark. Awaiting their feedback.
- Typography review now has three code-selectable pairings, recorded in
  [PHOTO_TYPOGRAPHY_OPTIONS.md](PHOTO_TYPOGRAPHY_OPTIONS.md). Option 3 is the active
  preview with an independent wordmark override; wait for user instruction before switching. Fonts
  are local and roles are consistent across pages. Overview headings are now
  32 px desktop / 28 px mobile, series card titles 20 px. No UI font toggle.
- Series, Archive, and About now share `PortfolioPageHeader.tsx`: explicit title
  margins, 40 px title-to-content gap on desktop / 32 px on mobile. Removed
  Archive's extra filter-row padding and both outer divider rules; the individual
  control underlines remain. Selected Work and sequence viewers keep their own
  compact layout. Browser measured identical desktop title top (127.2 px) on all
  three overview pages and mobile title top (192.9 px) for Series/Archive.
  Selected Work still measures 720 px document / 720 px viewport with 15 px title.
- Search/filter underlines are now explicitly present in the idle state and
  darken on keyboard/text focus; blur restores the same faint baseline. Browser
  confirmed matching idle/blur border colors and no rectangular outline.
- Series cards now cap at 280 px with 22 px titles: three columns on desktop,
  two at 900 px, one at 390 px. All three responsive sizes verified, with no
  horizontal overflow on mobile. Photo hover animation remains removed.
- Removed the Archive and Series overview introduction paragraphs. Keep headings
  alone for now; avoid adding generic descriptions as filler.
- Replaced native year/place selects with `ArchiveFilter.tsx`, using the pinned
  Radix popover primitive. Places have a search field, a bounded scrollable list,
  a selected check, arrow/Enter navigation, Escape/outside dismissal, and focus
  restoration. The year picker uses the same visual treatment without search.
- Search and filter triggers now use a thin underline for focus, replacing the
  large rectangular outline. Other portfolio keyboard-focus styles are intact.
- Verified typing `burn` + Enter selects Central Park, Burnaby (10 photos);
  year selection works with arrows/Enter; Escape/outside dismiss; unmatched place
  search shows an empty state. Mobile popup at 390 × 844 remained within bounds
  (left 16, right 316, bottom 710). Series header has no introductory paragraph.
  Browser console clean; TypeScript, scoped lint, and five archive tests passed.
- Possible useful heading metadata later: actual date range, photo/series count,
  or a short edit-specific note. Do not implement replacement copy without review.

**Pause here for the user's visual review before further UI development.** Review
grid density, uncropped thumbnail framing, spacing, and the search/year/place
controls. The cards are a contact-sheet grid with contained photographs, not a
cropped masonry layout. Photo hover animations remain removed.

- The public v2 archive is now routed: 286 photos, newest first, 18 per page.
  Desktop has three columns; phones have two. No genre tabs were introduced.
- Search covers title, alt text, description, place, and existing metadata tags;
  it ignores case and accents. Year and exact-place filters combine with search.
- Filter state lives in the URL. Changing filters resets pagination. Pagination
  uses links; malformed/out-of-range page values are bounded safely.
- Photo links open the shared single-image viewer with the current filtered
  sequence. Back to archive restores filters/page and includes an anchor to the
  original card. Reloading preserves the current viewer photo.
- Empty results include a reset link, result counts announce updates, and photo
  links avoid prefetching a separate catalog request for every visible card.
- `prepare-photo-preview.mjs --all` now prepares every published v2 photo, merging
  the manifest and reusing existing assets. Three at a time, with resumable batch
  saves. Public catalog/media reads only; all writes are local derivatives.
- All 286 photos have static display/thumbnail WebPs: 572 files, 50,897,432 bytes
  (about 48.5 MiB). Prepared images bypass Vercel transformations. This is a local
  preview delivery choice; a production derivative upload/update workflow is
  still a later milestone. New photos need preparation before they use this path.
- No database changes, deployment, or switch of the old `/photo` gallery.

Verification: `npx tsc --noEmit`, scoped ESLint, `git diff --check`, and five
archive logic tests (`node --test scripts/test-photo-archive.mjs`) passed. Browser
checks used the user's existing dev server and confirmed:

- Local WebP thumbnails load, desktop grid has three columns at 1280 × 900.
- Combined query `light`, year 2026, Bridgeport Station returns four photos;
  the viewer uses those four and survives reload. Back restores all three filters.
- Page two shows photos 19–36 of 286 and survives opening/returning from a photo.
- A new search resets page two; zero results render the reset state correctly.
- Single-photo viewer document/viewport both 720 px. At 390 × 844, Archive has
  two columns, normal vertical scrolling, and no horizontal overflow.
- No captured browser console errors. No production build during active dev.

Key files: `app/photo-preview/archive/page.tsx`,
`app/photo-preview/photos/[slug]/page.tsx`,
`features/photo-portfolio/components/Archive.tsx`,
`features/photo-portfolio/lib/archive.ts`, `scripts/test-photo-archive.mjs`.

## Milestone 2 — Series, November 23, 2026

Review URL: `http://localhost:3000/photo-preview/series`.

**Pause here for the user's visual review before starting Archive or further UI
development.** Review the cover proportions, two-column spacing, typography, and
the transition from the overview to a single sequence. Names and descriptions
remain provisional demo curation.

- Series overview now shows Between Stops, Edges of the Day, and Small Worlds.
  Each has a cover, description, photo count, and explicit demo label.
- All three routes use the shared viewer with their own six-photo order, Index,
  details, URL navigation, and an All series return link.
- Covers temporarily use the first photograph in each sequence. Custom cover
  selection from v2 `cover_photo_id` is a later curation integration task.
- Overview uses two columns on desktop and one on narrow phones. It scrolls
  normally; the single-image viewer continues to lock document scrolling.
- Uses the existing public v2 loader and prepared assets. No database changes,
  publishing, deployment, or legacy gallery changes at this checkpoint.

Verification: TypeScript, scoped ESLint, and diff whitespace checks passed.
Browser checks confirmed all three cover assets loaded, Between Stops navigation
and URL changes, six-photo Index selection, disabled Next at photo six, return to
overview, and opening Small Worlds. Desktop viewer document/viewport were both
720 px; Index restored scrolling (938 px document). At 390 × 844, the viewer
document remained 844 px with no horizontal overflow; overview cards stacked in
one column. The user's existing dev server was used throughout.

Key additions: `app/photo-preview/series/page.tsx` and
`app/photo-preview/series/[slug]/page.tsx`. Shared viewer return-link text is now
configurable.

## Milestone 1 — November 23, 2026

Review URL: `http://localhost:3000/photo-preview` on the existing local dev server.
Branch: `codex/photo-portfolio-redesign`.

The user requested incremental visual reviews. Pause here for feedback before
developing Series, Archive, or About further. The current names, demo edit, and
copy are provisional. No deployment or switch of `/photo` has occurred.

Review decision: slideshow mode displays exactly one photograph. The adjacent
preview strip and its overlaid next arrow have been removed; navigation stays
in the footer and on the keyboard.

Implemented at this checkpoint:

- A scoped white portfolio shell, desktop sidebar, and collapsible mobile menu.
- Selected Work with a temporary sequence of 12 already-public v2 photographs.
- Previous/next controls, arrow keys, URL/history updates, Index, details, and
  fullscreen controls. Index selection returns to the focused viewer.
- Slideshow fits the dynamic viewport and disables page scrolling. Index restores
  normal document scrolling. Details can scroll inside their own bounded panel.
- Separate public v2 data reads; no legacy table queries, admin credentials, draft
  access, or database writes in the preview data loader.
- Loading/error/empty states and a clearly marked demo edit. Published v2 edits
  take precedence over code-defined demos.
- Individual-photo preview routes. Other sidebar destinations currently show
  intentional placeholder pages, not the completed archive/series interfaces.

Verification:

- `npx tsc --noEmit` and `git diff --check` passed.
- The existing dev server rendered the v2 catalog and prepared images successfully.
- Browser checks confirmed photo navigation and URL updates, details, Index, and
  selection from the contact sheet.
- Desktop slideshow: 720 px viewport / 720 px document, overflow hidden.
- Desktop Index: 720 px viewport / 1461 px document, normal scrolling.
- Mobile slideshow: 844 px viewport / 844 px document, overflow hidden.
- No production build was run against the user's active development output.

Media:

`scripts/prepare-photo-preview.mjs` creates static display and thumbnail WebPs from
the public v2 catalog. Sixteen images (32 files) total roughly 2.22 MB. The script
only reads Supabase/R2 and writes local files; it never changes remote metadata or
media. The demo stage and contact sheet use these prepared assets without Vercel
transformations. Later media delivery for the full archive still needs review.

Key files:

- `app/photo-preview/layout.tsx`, `page.tsx`, `[section]/page.tsx`
- `features/photo-portfolio/components/Sidebar.tsx`, `PortfolioViewer.tsx`, `PortfolioImage.tsx`
- `features/photo-portfolio/portfolio.module.css`
- `features/photo-portfolio/data/catalog.ts`, `demo.ts`, `prepared-images.json`
- `public/photo-preview/`

Archive/filter components and demo series definitions have initial scaffolding,
but are intentionally not exposed as completed UI at this milestone. Next review
should settle the image scale, whitespace, identity/sidebar, and control placement
before connecting those sections.
