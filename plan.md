# Fresh photo v3 catalog

Status: v3 is live in Production. Commit 6cc5153dbcb9d279dd5b397bc0b379be09f2f556 deployed successfully; empty-catalog launch is complete. Upload the curated collection through the live admin.

## Goal and decisions

Start with an empty photo catalog for the newly edited files on Isaac's computer,
then connect the website and admin to it. Keep the existing catalogs and image
files in place without changing or deleting them.

- Use the existing Supabase project and admin account.
- No backups, database dumps, or copies of the old image files are required.
- No import of old photos, collections, memberships, or publication state.
- Reuse the current editor and schema design; do not build a catalog selector or
  redesign the upload workflow.
- New uploads get fresh UUIDs. Separate storage is still required: a new table
  alone does not isolate object keys, storage policies, or cleanup operations.
- Preserving the current production presentation is not a requirement. Preparing
  v3 in a protected preview is useful for verification, not a requirement for
  uninterrupted availability.
- Old-link redirects and legacy media access changes are outside this task.

## Milestone 1: Create the empty v3 database structure

- [x] Check the current hosted schema and relevant migration definitions before
  writing the additive migration.
- [x] Create `photo_v3_photos`, `photo_v3_collections`,
  `photo_v3_collection_photos`, `photo_v3_publications`, and
  `photo_v3_media_cleanup` in `public`.
- [x] Recreate the required constraints, indexes, timestamp triggers, draft/save/
  publish RPCs, grants, and RLS policies for v3. All relationships, RPC queries,
  and cleanup triggers must reference v3 exclusively.
- [x] Seed only the empty private `selected-work` draft needed by the editor.
  Do not seed demo collections or existing content.
- [x] Generate the updated TypeScript database types.

Done when: v3 has zero photos, memberships, publications, and cleanup tasks;
the empty Selected Work draft exists; public users cannot read drafts or write;
the existing admin can manage v3; existing catalog rows remain unchanged.

Verified: 81 database tests pass; hosted v3 counts are 0 photos, 1 private
Selected Work draft, and 0 memberships/publications/cleanup tasks. All five tables
have RLS. All seven functions use invoker rights and a fixed empty search path.
Existing catalog row fingerprints and storage policies are unchanged. Security
advisors report no new findings. Generated database types include v3. TypeScript
and changed-file lint pass. Hosted anonymous reads hide the draft and deny writes/
draft RPC execution; an admin read/update check passed inside a rolled-back transaction.

## Milestone 2: Isolate new image storage

- [x] Create a new private Supabase derivative bucket, `portfolio-v3-media`,
  with the existing WebP size/type restrictions.
- [x] Create a new private R2 originals bucket, `photo-v3-originals`, with public
  access disabled and upload CORS limited to the required site/preview origins.
- [ ] Finish preview credentials and verify access to the new originals bucket.
  `R2_V3_ORIGINALS_BUCKET_NAME=photo-v3-originals` is staged in Vercel Preview only.
  Keep production configuration and the existing R2 variables unchanged.
- [ ] Keep the existing immutable upload behavior: fresh UUIDs, no overwrite,
  original verification before inserting a photo, and retries that reuse only
  matching bytes. Re-edited files are new uploads, even if their titles match.
- [x] Make new derivative read policies check only published v3 rows; restrict
  draft reads and uploads to the admin. Leave existing bucket policies intact.
- [x] Scope cleanup to the new derivative bucket and v3 cleanup queue. Preserve
  private originals under the existing retention behavior. Do not grant v3 cleanup
  access to old buckets or reuse old image files.

Done when: one real v3 upload stores its original and both derivatives in the new
buckets; retries cannot overwrite different bytes; draft media is private;
deleting a v3 photo cannot remove any v1/v2 media or its retained original.

Implementation status (November 25, 2026, Toronto):

- Applied `20261126033316_add_photo_v3_media_storage.sql`: new private WebP
  derivative bucket (3,500,000-byte limit), v3 admin insert/draft-read policies,
  published-only public reads, and cleanup requiring a v3 queue entry and no v3
  catalog reference. No overwrite/update policy is granted.
- R2 bucket `photo-v3-originals` has r2.dev disabled, no custom domain, PUT-only
  CORS for the two site origins and localhost ports 3000/3001, and no completed-
  object expiration rule. Add the exact protected preview origin when one exists.
- Vercel rejected a branch override because `codex/photo-v3` does not exist
  remotely. A separate Preview-only variable was created instead; milestone 3
  must explicitly consume the v3 variables. No deployment or remote branch was created.
- V3 credentials have been supplied in ignored `.env.v3.local`. Real signed PUT,
  HEAD/hash verification, exact-byte GET, immutable overwrite rejection (412),
  localhost CORS, unrelated-origin rejection, and anonymous download denial pass.
  Generated test objects were deleted and their absence verified.
- The supplied v3 key can access old buckets too. Isaac explicitly accepted
  this broader scope and authorized continuing. A replacement token is not
  required. Application reads and cleanup still target only v3.
- `.env.v3.local` is a staging file, not a Next.js automatically loaded env file.
  Verified v3 names are now in ignored `.env.local` for local development,
  preserving old settings. The two sensitive Preview variables still need
  been configured as sensitive Preview-only variables with explicit approval.
  Use a separate v3 S3 client, with no fallback to old bucket credentials.
- All 82 database tests and 13 original-upload/retention tests pass. Changed-file
  lint passes. Tests cover same-UUID v2/v3 visibility and cleanup isolation,
  rejection of overwrite and invalid paths, immutable originals, and retry matching.
- Hosted verification confirms the private bucket and four new policies. Existing
  catalog fingerprints, original storage policies, and existing Vercel variables
  are unchanged. Security advisors report no new findings.
- Real R2 upload verification passes. The broader credential scope is accepted.
  The full app upload (original plus both derivatives and catalog row) remains
  pending authenticated milestone 4 review. Production is unchanged.

## Milestone 3: Connect the app to v3

- [x] Update public/admin loaders, photo mutations, nested relationship queries,
  and draft/publish RPC calls to use v3 consistently.
- [x] Update uploads, publish endpoints, public/draft media delivery, sharing,
  and cleanup to use the v3 catalog and storage.
- [x] Remove demo collection fallback from the active v3 catalog path and prevent
  old prepared-image mappings or legacy media fallbacks from supplying v3 images.
- [x] Ensure archive, Selected Work, Series, metadata, social cards, and sitemap
  all derive from v3. Do not fall back to an old catalog when v3 is empty.
- [x] Keep the legacy routes and their data outside these edits. Account for
  existing API URLs containing `photo-preview`; their names alone do not identify
  a separate environment.

Main implementation areas: `features/photo-portfolio/data/`,
`features/photo-portfolio/lib/upload-media.ts`, original-storage helpers,
`app/photo/admin/`, `app/api/photo-preview/`, `app/api/photo-sharing/`, and
`app/photo/share/`. Change other files only where a concrete v2 dependency requires it.

Done when: the v3 admin starts empty and every active v3 read/write/media path
uses the new catalog and buckets, with no changes to legacy content.

Verification and release notes:

- Public/admin loaders, photo edits, draft/publication RPCs, upload/publish APIs,
  sharing, derivative delivery, and cleanup now use v3 exclusively. Originals
  use a separate v3 S3 client and require the exact private v3 bucket. There is
  no old credential, prepared-image, demo, or legacy-original fallback in active
  v3 paths. Legacy routes and their storage client were not changed.
- Local browser checks show empty Selected Work and Archive (0 photos). Unsigned
  admin access redirects to login. Series and sitemap return 200; sitemap has no
  old photo entries. Unsigned original and derivative upload requests return 401.
- 32 focused catalog/upload/original/cleanup/metadata/sitemap tests, TypeScript,
  and changed-file lint pass. The 82 database tests passed in the previous
  milestone; SQL has not changed since then. React review found no new issues.
- Isaac explicitly authorized copying `R2_V3_ACCESS_KEY_ID` and
  `R2_V3_SECRET_ACCESS_KEY` into Vercel Preview. Both were saved as sensitive
  Preview-only variables in `personal-website-v4` and verified through metadata
  without decrypting their stored values. The Production equivalents were added
  with explicit release authorization; all pre-existing variables remain unchanged.
- Before a hosted v3 preview, add the exact preview origin to the new R2 bucket
  CORS list. Full authenticated upload, publish, sharing, and removal checks
  remain in milestone 4.

## Milestone 4: Verify and load the curated collection

- [ ] Extend the existing database policy tests for v3 access, draft publishing,
  catalog independence, and cleanup isolation; run `npm run test:db`.
- [ ] Run focused upload/media tests for changed behavior, changed-file lint,
  and `npx --no-install tsc --noEmit --pretty false`.
- [ ] Verify the protected preview end to end: sign in, upload, retry, save a
  draft, edit metadata, publish a photo, publish Selected Work/Series, and view
  public media and a watermarked export. Use a disposable v3 photo to verify removal.
- [ ] Verify anonymous users cannot access draft metadata, draft media, or private
  originals. Confirm existing catalogs and objects were not modified by these checks.
- [ ] Upload Isaac's newly edited files and arrange the desired Selected Work and
  Series. Check dates, orientation, titles, ordering, and covers.

Done when: the full upload-to-publication flow passes and the intended collection
is ready. Isaac can choose to launch earlier with an empty or partial collection.

## Milestone 5: Switch production and check it live

- [x] Record the current production deployment and verify which catalog it uses
  so any rollback target is known.
- [x] Confirm production credentials can access the new private originals bucket
  and that production configuration targets v3 storage.
- [x] Build and deploy the v3-connected app. Coordinate code and environment
  changes so production never runs with a mixture of v2 and v3 storage settings.
- [x] Check the live empty Selected Work, Archive, Series, sitemap, sharing card,
  admin sign-in redirect, and denied anonymous upload endpoints.
- [ ] Confirm the first authenticated production upload and its image delivery.
  This remains a follow-up; local manual testing was confirmed by Isaac.
- [x] Record the released deployment, table/bucket names, and verification results
  in the relevant project docs. Leave all previous tables and buckets in place.

Done when: production reads and writes v3 successfully. If a release issue requires
rollback, restore the prior deployment with its matching storage configuration;
leave uploaded v3 data in place. No data restore or destructive reset is needed.

## Production release record

- Previous production: `dpl_2Q6ktqDU7FqN57JokQTTpoYr3k65`, commit
  `094facf2a2c26231173c3a514a215f26d04e96f1` (v2 app). Keep this deployment
  available for rollback; its captured environment remains suitable for v2.
- Release target: Vercel project `personal-website-v4`, team
  `team_wllHaZRBRtZDRyHnKW01wnnN`, production domain `www.isaacjiang.ca`.
- Production now has `R2_V3_ORIGINALS_BUCKET_NAME=photo-v3-originals` and the
  two approved v3 credentials as sensitive, Production-only variables. Existing
  Preview and legacy variables were verified unchanged. No bucket or catalog
  data was copied or removed for the release.
- Isaac confirmed manual functionality and explicitly approved launching the
  empty catalog; uploading the curated collection can happen after release.

## Completed production release

- Source commit: `6cc5153dbcb9d279dd5b397bc0b379be09f2f556`, pushed to `main`.
- Deployment: `dpl_4ZEL6Zhd67xse6YZDnU4nzigyh6u` (READY, Production).
- Live URL: https://www.isaacjiang.ca/photo
- Isolated production build passed. The first sandboxed attempt stalled; the
  retry outside the sandbox passed without disturbing the development server.
  Vercel independently built the same release commit successfully.
- Live checks passed: empty Selected Work, Archive, and Series; sitemap contains
  no old photo entries; selected sharing card returns JPEG; unsigned original
  and derivative upload endpoints return 401. The browser confirms admin access
  redirects to login. No authenticated production upload was performed.
- Legacy counts remain 286 v1 photos/35 bundles and 288 v2 photos/39 collections.
  V3 remains 0 photos, 1 private Selected Work draft, and 0 cleanup tasks. No old
  catalog data or media was deleted. R2 originals remain retained on photo deletion.
- Production credentials and code target `photo-v3-originals` and
  `portfolio-v3-media`. New uploads can now be made through the live admin.
- The old photo URL renders the not-found state, and the bare domain redirects
  to www. Next.js streamed redirects/not-found responses can initially return
  HTTP 200; browser navigation and rendered page state were checked accordingly.
