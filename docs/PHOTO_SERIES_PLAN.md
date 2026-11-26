# Series publishing implementation plan

Status: ownership, selection and public-view migrations applied to hosted v3. Anonymous public-view access and admin readiness verified; full editorial browser workflows remain user-driven.

## Goal and decisions

Every saved photo belongs to one owning series. Series control publication;
photos have no independent publish action. Selected Work can feature photos from multiple public series. Public placement
is explicit: Series lists featured series and Archive lists archived series.
Private drafts appear in neither view and are ineligible for public Selected Work.

- A series owns its uploaded photos and an ordered draft sequence. Owning a photo
  does not expose it publicly; it must appear in the published sequence.
- Create or choose a series before uploading. Both single and bulk uploads use
  this rule. Keep the global admin photo library for search and metadata editing,
  with series labels and filtering.
- Series have Draft, Published, and Published with changes states. Reuse the
  existing editable draft and public copy workflow.
- Publishing exposes the sequence, cover, title, and description together.
  Sequence changes and newly added photos remain private until publication.
- Selected Work remains a curated selection. It cannot publish a photo or keep
  one public after its owning series is unpublished. Archive is the deduplicated
  set of photos in published series versions.
- Unpublishing preserves the series draft, photos, and stored media. It removes
  public access and eligibility for Selected Work, Archive, and sharing.
- Work within the active v3 catalog. Preserve legacy catalogs, original files,
  existing storage isolation, upload retries, and media cleanup behavior.
- Keep the current visual design. Photo metadata versioning, scheduling,
  multiple owning series, and a new public homepage design are outside scope.

## Public placement and future views

The user confirmed three editorial states: Draft (private), Published (public in
Series), and Archived (public in Archive). Selected Work can draw from both Series
and Archive, while private draft photos remain ineligible. Archive contains series
cards and series sequences, rather than a flat photo archive.

Public placement is independent of ownership and publication snapshots. The
photo_v3_public_views registry currently contains series and archive; a foreign key
on collection public_view allows future placements such as projects or individuals
without altering photo ownership or access policies. Only the two requested views
are implemented in the UI. New view catalog entries require a deliberate database
change; anonymous/authenticated clients may read labels but cannot mutate them.

## Visibility and ownership rules

Use one required ownership reference from each photo to its canonical editable
series. Reuse collection memberships for ordered draft sequences, public
snapshots, and Selected Work; those memberships do not create additional owners.
Validate that an owner is an editable series rather than Selected Work or a
public copy. Keep ownership and sequence changes transactional.

Public photo access requires membership in the current published version of its
owning series. A legacy photo publication flag, membership in Selected Work, or
membership in an unpublished public copy cannot grant access. Apply this rule
to database reads, storage policies, application loaders, and every public media
or export endpoint. Avoid recursive row security policies when checking photos,
collections, and memberships.

Publishing a series validates its sequence, cover, ownership, and required media
before exposing any of it. An empty or invalid sequence cannot be published.
Uploading to an already published series adds private photos to its workspace;
the existing public version stays unchanged until an update is published.

Removing a photo from a draft sequence leaves it owned by that series. Moving a
photo to another series changes its owner and draft memberships together. If it
still appears in a live sequence, first publish its removal or unpublish that
series before moving it. This keeps ownership and public versions consistent.
Block deletion of a series while it owns photos or has a live publication;
unpublish and move or explicitly delete its photos first. Preserve the existing
explicit photo deletion and original retention behavior.

Previously issued signed media URLs and cached responses may remain usable until
expiry. Define the cache invalidation and expiry behavior during implementation;
unpublishing must stop new public reads and URL issuance. Previously downloaded
files cannot be recalled.

## Milestone 1 Audit the catalog and confirm the migration

- [x] Trace current photo publication, series drafts and public copies, uploads,
  Selected Work, Archive, sharing, social cards, sitemap, and media policies.
- [x] Inspect the current v3 catalog read-only. Do not assume it is still empty.
  Identify loose photos, photos in multiple series, and published photos outside
  published series.
- [x] Record the ownership reference, sequence validation, publication rules,
  nonrecursive access policies, and compatibility sequence for rollout.
- [x] Map existing photos to owners. Put loose photos in a private `To organize`
  series. Resolve ambiguous existing series memberships before enforcing single
  ownership; ask for a curation decision only where the actual data requires it.
- [x] Record how Selected Work references become ineligible after a series is
  unpublished, while retaining private editorial selections for later reuse.

Done when: the migration accounts for every current v3 photo, identifies any
public visibility changes, and defines a consistent upload and publication flow.

## Milestone 2 Enforce ownership and series publication

- [x] Add and backfill the required series ownership reference, constraints, and
  indexes without deleting or duplicating photos or media.
- [x] Update series save and publish operations to validate ownership and ordered
  membership, preserve revision conflict checks, and publish atomically.
- [x] Remove independent photo publication as an authority. Remove its database
  field after all application consumers have migrated, or keep it temporarily
  only for a documented rollout dependency.
- [x] Update photo, membership, and derivative storage access policies to use
  published series membership. Preserve authenticated admin access.
- [x] Enforce valid moves and series deletion rules in the database as well as
  the UI. Ensure concurrent saves cannot produce orphans or invalid ownership.
- [x] Synchronize database types with the local migration and extend the existing database policy tests. Official hosted types regenerated after the authorized migration.

Done when: direct database operations cannot save an unowned photo or expose one
through an independent publish flag. Publishing and unpublishing a series change
access for its live members together, and drafts remain private.

## Milestone 3 Make admin editing and uploads start with a series

- [x] Allow an empty series draft to be created before photos are uploaded.
- [x] Add upload actions within the series workspace. Global single and bulk
  upload entry points require choosing or creating a destination series.
- [x] Finalize each upload with ownership assigned atomically. Preserve original
  verification, immutable uploads, retries, and cleanup after failed saves.
- [x] Remove individual photo publish buttons, dialogs, request modes, and the
  standalone publish endpoint. Update metadata editing to save details only.
- [x] Scope the series workspace to its owned photos, with sequence ordering,
  cover selection, preview, publish, update, and unpublish actions.
- [x] Show series ownership in the global photo library and photo editor. Provide
  an explicit move action with the live publication restriction described above.
- [x] Keep Selected Work editing limited to photos eligible through published
  series. Show unavailable saved selections clearly without exposing them.

Done when: an admin can create a series, upload one or many photos, arrange and
preview the sequence, and publish it without individually publishing photos.
Uploads and retries cannot create standalone catalog photos.

## Milestone 4 Derive the public portfolio from published series

- [x] Update catalog loaders and types to derive public photos from live series
  memberships, preserving sequence order and avoiding duplicates in Archive.
- [x] Filter Selected Work against current series visibility. A stale selection
  cannot preserve access to a private photo; handle empty selections gracefully.
- [x] Update public series pages, Archive, counts, filters, metadata, social cards,
  and sitemap to use the same visibility rule.
- [x] Check derivative delivery, individual sharing and full-size exports, and
  collection sharing routes. Direct URLs must check current public eligibility.
- [x] Revalidate affected pages after publish, update, unpublish, move, and delete.
  Document and verify signed URL lifetimes and cache behavior.

Done when: every public surface agrees on visibility. A photo removed from its
live series or hidden by unpublishing disappears from discovery and cannot be
fetched through a new public media or export request.

## Milestone 5 Verify the complete feature and prepare release

- [ ] Test create series, single upload, bulk upload, retry, save, preview,
  publish, edit draft, republish, and unpublish using disposable v3 content.
- [x] Confirm a new photo added to a published series remains private until its
  sequence is published. Confirm the existing live sequence stays unchanged.
- [x] Test Selected Work and Archive before and after unpublishing, including a
  photo retained in a saved Selected Work selection.
- [x] Test move and delete restrictions, empty series, invalid covers, missing
  derivatives, stale revisions, and interrupted upload finalization.
- [ ] Check anonymous database and storage access, direct media/export requests,
  authenticated previews, and original retention after deletion.
- [x] Run `npm run test:db`, focused tests for changed upload/catalog/media flows,
  changed-file lint, and `npx --no-install tsc --noEmit --pretty false`.
- [x] Review the migration against current catalog contents and prepare a release
  sequence that keeps application code and database access rules compatible.
  Record the rollback approach, including preservation of new uploads.
- [ ] After release is authorized, deploy and repeat the core public visibility
  and admin workflow checks on the hosted site. Record the results here.

Done when: the feature passes local and hosted verification, every saved v3 photo
has one valid series owner, and all public access follows series publication.

## Implementation areas

- `supabase/migrations/` and `scripts/test-supabase-policies.mjs`
- `utils/supabase/database.types.ts`
- `features/photo-portfolio/data/` and `features/photo-portfolio/types.ts`
- Admin photo, upload, sequence, and publishing components and their hooks
- `app/photo/admin/` and `app/api/photo-preview/`
- Public portfolio routes, sharing/export helpers and routes, and sitemap

Preserve unrelated working tree changes, including the existing `plan.md` and
ongoing photo export work. Update milestone checkboxes and verification notes as
implementation progresses. Run the cheapest relevant check after each change;
repeat successful checks only when later edits can affect their results.

## Implementation and release notes (2026-11-26)

### Read-only hosted audit

Project: photos (fzywfhnogtiscynqrxrg). No hosted writes, migrations, uploads,
deletions, policy changes or deployments were performed.

- 97 current v3 photos, all with the old independent publication flag set.
- 12 have exactly one canonical series owner: Still (5), WC (2), City (5).
  Their draft and public ownership candidates agree; no ambiguous photos.
- 85 loose photos will be assigned to one private To organize series, with a
  deterministic draft sequence ordered by date and ID. No photos/media are copied
  or deleted. The migration rechecks actual memberships and aborts atomically if
  new ambiguous ownership is found before release.
- The current public Selected Work has 11 photos; none belong to a published
  series. All 11 become publicly ineligible on migration. Their editorial
  memberships remain saved privately. Selected Work shows its existing empty state.
- Archive decreases from 97 to 12 public photos. Existing Still, WC and City
  publications retain their sequences. Both derivatives exist for their 12 photos.
- Loose photos remain privately editable; publish their owning series to expose
  them again. No additional curation decision is needed to apply the agreed plan.

### Ownership, publication and access

Migration: 20261126064600_series_photo_ownership.sql. Required indexed
owner_series_id references an editable series with RESTRICT deletion. Database
triggers append new uploads and move draft memberships atomically, block moves
of live photos, validate ownership/covers/media and repair explicit photo deletion.
An emptied live snapshot is hidden; originals and the cleanup queue retain their
existing behavior. Empty unpublished series can be deleted through the guarded RPC.

Existing revision checks and atomic draft/public-copy RPCs remain. Catalog writes
and RPCs share a transaction advisory lock acquired before row locks. Deferred
constraints validate the final transaction, including direct SQL operations.
The single-admin catalog uses full integrity checks at commit; revisit their cost
if the catalog grows substantially. Real multi-session contention remains a
hosted/local-Postgres release check; PGlite tests use one connection.

Private-schema SECURITY DEFINER functions return only anonymous public eligibility
and avoid recursive photos/membership RLS. Their search paths are empty and public
execution is revoked; only anon/authenticated receive the deliberate boolean API.
All other new functions run with invoker rights. Admin policies are preserved.
Storage signs only currently eligible owned-photo derivatives. Original R2 storage
and all legacy catalogs remain independent.

The legacy photo published column is retained solely for deployment overlap with
the old application and a reviewed rollback. New code never reads it as authority
and never writes it to publish. New upload responses keep published:false as a
compatibility result field. Remove the database column in a follow-up after old
application instances and the rollback window are retired.

Admin uploads require a chosen/created series before files can be selected. Upload
finalization verifies the untouched original, stores immutable derivatives, then
inserts the photo and its owner/sequence in one database transaction. Retries require
the same ID, media key and owner. Metadata saves have no publication mode or endpoint.
The global library labels/filters by owner; series editors see their owned photos.
Selected Work retains unavailable selections privately and blocks their publication.

### Caching and expiry

Public pages and sitemap already use force-dynamic; React.cache deduplicates only
within each request. Publish/update/unpublish/move/delete revalidate the photo
layout and affected editor/pages; publication/move/series deletion also invalidate
sitemap.xml. Public loaders and export routes rely on anonymous series-membership
RLS, never an authenticated or service-role read.

New derivative and full-size redirect responses use Cache-Control:no-store and
new signatures expire after 60 seconds. New derivative uploads advertise a
60-second cache lifetime. Full-size signatures override the object response cache
to private,no-store. Existing derivative objects retain their prior object cache
metadata (typically 3600 seconds); they are not rewritten by this migration.

Unpublishing immediately prevents new anonymous catalog/storage reads and new
signed URL issuance. Previously issued signatures may remain valid for their
original lifetime (up to 3600 seconds before this release); previously cached
redirects, already fetched objects, browser pages and downloaded files cannot be
recalled. An object fetched while an old signature is still valid may remain
cached for the object's cache lifetime after that fetch. Purge deployment/CDN
page and redirect caches at release; third-party social-card caches are external.

### Local verification

- Database policy suite and added ownership/publication cases run entirely in
  disposable PGlite databases with synthetic identities/storage. Includes independent
  flag non-authority, draft/live isolation, retained Selected Work, direct SQL moves,
  owner/cover/media validation, stale saves, deletion, and ambiguous-backfill rollback.
- Upload/batch tests mock transport and original storage; check destination gating,
  private saves, immutable retry identity, auth expiry and original verification.
- Catalog, export, full-size, metadata, sharing-card, sitemap, original upload and
  cleanup tests use fixtures. No test contacts hosted storage or changes content.
- Database TypeScript definitions were synchronized locally with the migration;
  official CLI regeneration requires a running local Supabase/Postgres stack or
  the hosted migration. Docker is unavailable here. Regenerate and compare at release.
- Browser-based authenticated workflows and real storage/signed-URL expiry checks
  remain release checks; no disposable content was written to hosted v3.
- npm run test:db: 87 passing tests, including five new series/ownership scenarios.
- Focused batch/upload/catalog/full-size/public-media tests: 26 passing tests.
- Additional original-upload/export/metadata/share-card/sitemap/cleanup/archive
  checks: 38 passed, one pre-existing Archive test failed. The unchanged test at
  scripts/test-photo-archive.mjs:33 expects /photo-preview/archive while the
  unchanged archiveHref implementation returns /photo/archive. Left outside scope.
- Changed-file lint and npx --no-install tsc --noEmit --pretty false both passed.
- Automatic approval review declined a full hosted metadata export because it
  could contain private catalog content. No full snapshot was exported. Migration
  verification uses the successful read-only aggregate audit and synthetic fixtures.

### Release sequence (requires release authorization)

1. Re-run the read-only audit, including ownership candidates, publication mappings,
   valid covers and derivative availability. Confirm the known 85-photo Archive
   reduction and empty Selected Work. Preserve a database backup and media inventories.
2. Stage the matching application artifact. Pause admin writes/uploads across all
   old instances and allow in-flight saves/uploads to finish. Leave public reads on.
3. Apply the single transactional ownership migration. It locks only v3 catalog
   tables, backfills all owners and changes RLS together. If ambiguity is detected,
   the migration rolls back; resolve the specific ownership decisions before retrying.
4. Deploy the matching application before reopening admin writes. The retained
   legacy field lets old read instances survive the overlap but old upload writers
   cannot be reopened against the required-ownership schema. Clear old route/CDN caches.
5. Regenerate hosted database types and compare owner_series_id/FK and the new RPCs.
   Run database security/performance advisors, including private helper grants and
   function search paths. Confirm 97 owned photos and the expected 12 public photos.
6. Use disposable v3 content to check empty series creation, single/bulk upload,
   interrupted retry, metadata save, ordering/cover, preview, publish, draft additions,
   republish, unpublish, unavailable Selected Work, moves and deletion. Confirm
   anonymous database/storage access and direct media/export/social/sitemap behavior.
   Test two simultaneous editor sessions and real signed URL expiry. Verify original
   retention. Delete only the explicitly disposable content afterward.
7. Reopen admin writes after these checks pass and record deployment/results here.

Rollback: prefer a forward fix or temporarily disabling admin writes while keeping
the ownership schema and tightened policies. Do not drop v3 tables, restore a stale
catalog over new uploads, or reverse the backfill automatically. If an application
rollback is necessary, keep uploads/admin writes paused because old writers cannot
supply owners. A full schema/policy reversal requires a separately reviewed migration
and current backup, preserving every new photo, owner, sequence, publication and
original/media key. Restoring the old photo-flag policies would re-expose the 85
loose photos, so do not do that implicitly as part of an application rollback.

## Correctness review (2026-11-26)

The connected database still has 97 photos and three editable/public series, but
owner_series_id is absent: the ownership migration has not been applied. The
screenshot's single generic Series filter option came from undefined owner IDs
being silently mapped to the fallback title Series. The public Series cards are
public copies; owner filter options must refer to their canonical editable drafts.

Removed the fallback, explicitly select/validate owner IDs and require resolvable
owner titles. The protected admin layout now checks schema readiness with a
zero-row projection and displays a setup-pending message before offering editors
against the old database. Public pages are unchanged. Photo editing also handles
a photo disappearing between its detail and library reads without asserting that
an undefined photo exists.

Four added regression tests cover distinct canonical owner labels/IDs, missing
migration, corrupt/missing ownership and connection errors. The 26 upload/catalog/
media tests pass again. The database suite passes all 87 tests; changed-file lint and TypeScript pass.
No hosted writes or release were performed. This feature remains unavailable on
the connected database until the reviewed migration/release sequence is authorized.

## Authorized hosted migration (2026-11-26)

The user explicitly authorized applying the prepared migration. Supabase applied
series_photo_ownership successfully as version 20261126064600. The local filename
now matches that applied version so this migration is not offered for reapplication.
Earlier historical local/hosted timestamp differences were not changed.

Post-migration checks: 97 photos preserved, zero unowned photos, zero invalid
owners. City owns 5, Still owns 5, WC owns 2, and private To organize owns 85.
A real anonymous REST client sees exactly 12 photos; the ownership-column readiness
query succeeds. Published collections expose Still 5, WC 2, City 5 and Selected Work
0 photo memberships. A formerly loose photo is hidden; signing a published thumbnail
succeeds, while signing its private counterpart is denied. No media were deleted.

Official hosted TypeScript types were regenerated and synchronized. Security
advisors reported no v3 findings; existing unrelated findings are a
[legacy mutable function search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
and [backup tables deliberately without RLS policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
These were not changed.

This authorized operation applied the database migration only. It did not deploy
the application or write disposable content for authenticated browser workflow
tests. Refresh the updated admin to clear its setup-pending screen.

## New-series library picker correction (2026-11-26)

The new-series page incorrectly passed an empty photo library, forcing uploads or
manual moves before curation. It now loads existing photos and allows selecting
private photos from other series. Live photos belonging elsewhere are disabled;
photos can be arranged and assigned a cover before the first save. The UI explains
that saving transfers selected photos to the new owning series.

Prepared migration 20261126081333_allow_series_photo_selection.sql extends the
existing save-series RPC to transfer selected private owners after its admin and
revision checks, before replacing the sequence. The existing triggers handle old
memberships/covers/revisions and reject live transfers. Creation, ownership moves
and sequence save share one transaction; save-and-publish uses the same path.
Applying this function-only migration does not itself move any photos.

Local regression coverage verifies creation with existing photos, ordered sequence,
owner transfers, old-cover cleanup, full rollback when one selected photo is live,
and save-and-publish. Hosted application of this follow-up migration was rejected
by automatic approval review because the user had not separately authorized this
persistent ownership-transfer behavior change. The user subsequently explicitly approved applying it. Supabase applied the migration
as version 20261126081333; the local filename matches that history entry. A read-only
check confirms the save-series RPC now includes ownership transfer. All 97 photos
remain, zero are unowned, and the same 12 are public. No existing photo was moved
by applying the function update. Local verification passed 88 database tests,
changed-file lint and TypeScript. Actual photo selections remain the user’s action.

## Existing-series library correction (2026-11-26)

Edit Series now receives the full admin library, matching New Series, rather than
filtering it to current owners before rendering. This supersedes the original
owned-only workspace behavior. Private photos from other owners can be selected;
foreign live photos remain disabled. The editor explains ownership transfer on
save. Empty-series deletion eligibility counts only the target series's owned
photos, so unrelated library contents do not disable deletion.

No further hosted migration is needed: the already-applied selection RPC supports
existing series with revision checks. A focused regression confirms that adding a
private photo transfers ownership while leaving the existing live snapshot
unchanged, and a stale save transfers nothing.

## Public Archive and extensible placements (2026-11-26)

Prepared migration: 20261126090121_series_public_views.sql. It adds the public view
registry, placement FK/index, and invoker-rights publish/save-and-publish wrappers.
Existing rows default to Series; no draft is exposed and no current series is
archived automatically. The archived state uses a published public snapshot with
public_view=archive, so the existing nonrecursive photo/storage eligibility rules
continue to enforce public snapshots without special-case photo flags.

The UI offers Publish to Series, Archive / Save & archive, and Make private.
Archiving explicitly snapshots the saved/current edit, including title, cover and
sequence. Archived snapshots stay eligible for Selected Work. Making private hides
both the series and its photo media, even with retained editorial selections.
Draft edits/uploads to an archived series remain private until an Archive update
is saved. Moving an archived photo between owners still requires making its series
private or publishing removal from the live sequence.

Archive now lists only archived series and opens /photo/archive/[slug]. Series
lists only series placement. Shared series rendering preserves ordered photos,
metadata/social cards and correct back navigation. Links to a former placement
redirect to the current canonical placement; sitemap entries use those canonical
paths. Public catalog deployment overlap defaults existing public copies to Series
if the new column is not yet present; the admin checks placement readiness and
shows setup pending until the migration is applied.

Local verification: all 90 database tests pass, including archive/Series switching,
Selected Work from Archive, private draft/media exclusion, atomic archive updates,
rollback for invalid views, role restrictions and a synthetic future Projects view
without any ownership/RLS changes. Fifteen catalog/admin/sitemap tests also pass.
TypeScript and changed-file lint pass. No current content was reclassified.

The supporting hosted migration was subsequently authorized and applied; see the
verification record below. Local and hosted migration filenames are aligned and
official types are synchronized. No actual user content is archived as part of
migration verification; that remains an explicit editorial action.

## Authorized public-view migration (2026-11-26)

The user explicitly authorized applying the public-view migration. Supabase applied
series_public_views successfully as 20261126090121; the local filename now matches
hosted history. Official hosted TypeScript types were regenerated and synchronized.

Post-migration database and real anonymous REST checks: 97 photos, zero unowned,
55 public photos, 10 public series in Series and zero archived series. These are
current editorial counts (the user has curated additional series since the first
ownership audit). The migration did not publish drafts, archive content, move
photos or delete files. Series and Archive view labels are readable anonymously;
the placement readiness query passes. Existing security advisor findings are
unchanged; none concern the new view registry or publication functions.

Archive is intentionally empty until an admin explicitly chooses Archive or
Save & archive for a series. Archived photos then become eligible for Selected
Work through the same published-snapshot rule. Private drafts remain unavailable.
The public-view update was applied to the database; no separate app deployment
or content-curation action was performed during verification.

## Handoff prompt

> Implement the series publishing feature in `docs/PHOTO_SERIES_PLAN.md`.
> Follow `AGENTS.md`, inspect the current working tree, and preserve unrelated
> changes. Start with milestone 1 and audit the current v3 catalog read-only;
> do not assume it is empty. Every saved photo must have one owning series,
> and only membership in that series's published version may grant public access.
> Reuse existing series drafts and public copies. Work through the milestones
> locally, update this plan with progress and checks, and keep changes surgical.
> Ask only for actual unresolved curation decisions or required access. Prepare
> the migration and release steps for review; do not mutate hosted data or deploy
> as part of this handoff without release authorization.
