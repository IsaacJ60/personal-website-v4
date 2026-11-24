# Supabase changes: independent photo v2 catalog

Implemented November 22, 2026 (Toronto time). Migration versions use UTC, so their
filenames begin with November 23. Git branch: `codex/supabase-hardening`.

## Current status

Both migrations below have been applied to the connected photos Supabase project
and recorded in its migration history. The website has not been deployed or
switched to the new tables. Existing routes and admin actions still use v1.

| Migration | Effect |
| --- | --- |
| `20261123011754_harden_bundle_access.sql` | Makes existing bundle permissions match the existing photo-admin predicate; removes unconditional public draft reads |
| `20261123012348_create_photo_v2_catalog.sql` | Creates private snapshot tables and a separate, independently editable v2 catalog; copies existing metadata |

The first permission fix completed before the user requested separate tables.
It changed no content rows. The second migration implements that request without
rewiring any existing view or creating synchronization back to v1.

## Tables and ownership of data

| Location | Purpose | Verified count |
| --- | --- | ---: |
| `public.photos` | Original view's photo metadata | 286 |
| `public.bundles` | Original view's bundles | 35 |
| `public.bundle_photos` | Original view's memberships | 186 |
| `photo_backup_before_v2.photos` | Private pre-v2 metadata snapshot | 286 |
| `photo_backup_before_v2.bundles` | Private pre-v2 metadata snapshot | 35 |
| `photo_backup_before_v2.bundle_photos` | Private pre-v2 metadata snapshot | 186 |
| `public.photo_v2_photos` | Independent copy for the new view | 286 |
| `public.photo_v2_collections` | 35 imported draft series plus draft Selected Work | 36 |
| `public.photo_v2_collection_photos` | Independent ordered membership | 186 |

The snapshot tables are data copies, not a complete database backup: they do not
recreate source constraints, indexes, auth state, policy history, or R2 files.
Use the retained source catalog and managed backups for broader disaster recovery.

The private schema has no USAGE grant for `anon` or `authenticated`, no table
grants for those roles, and RLS enabled without application policies. The website
admin's authenticated account cannot read or update it through the app. Database
owners can inspect it in Supabase's database tools. Do not add public policies to
these tables just to silence the advisor's informational default-deny notices.

## Separation guarantees and the shared-media boundary

- V2 photo UUIDs, slugs, object keys, publication state, and metadata were copied
  from v1. New v2 photos default to unpublished.
- V2 collections use their own UUIDs and retain `legacy_bundle_id` only as import
  provenance. This is not a foreign key.
- Membership references only the v2 tables and uses stable photo UUIDs rather than
  editable slugs. Positions preserve the old ordering and are normalized to start
  at zero for each collection.
- There are no cross-catalog foreign keys, cross-catalog update triggers, or sync
  jobs. V2 title, publication, and membership changes do not modify v1.
- All imported series are drafts. The `selected-work` collection is also a draft
  with no assigned photos yet. The UI can use clearly labeled placeholder content
  until these edits are ready.
- Existing published photo flags were preserved in v2: their metadata remains
  public, just as the original published photo metadata is public. Draft collection
  metadata and membership are not public.
- The image files were neither copied nor modified. Both catalogs currently point
  at the same existing R2 keys. **Database separation does not isolate those files.**
  A future v2 upload path should use immutable keys such as `camera/v2/<uuid>.jpg`.
  Do not overwrite or delete an imported shared object from the new editor.
- Existing admin/upload endpoints still target v1 and its existing object-key
  convention. They should not be reused blindly as the new v2 editor.

## Access rules

The migrations derive the administrator predicate from the existing verified photo
policies. They do not hardcode an environment-specific administrator UUID into
tracked SQL. Before deployment, the database's admin identity was compared with
the local application's `ADMIN_USER_ID`, without printing its value.

| Role | Original bundles after hardening | New catalog | Snapshot |
| --- | --- | --- | --- |
| Visitor / anon | Published bundles and memberships whose photo is also published | Published photos and collections; membership only when both parent and photo are published | No access |
| Authenticated non-admin | Same public reads, no writes | Same public reads, no writes | No access |
| Existing admin | Read drafts and perform normal content writes | Read drafts and perform normal content writes | No application-role access |

New tables revoke broad application-role default grants, then grant public SELECT
and authenticated INSERT/UPDATE/DELETE, with RLS enforcing the administrator
predicate for writes. An `anon` request carrying an admin-looking subject still
does not get authenticated-role access.

V2 adds positive-dimension checks, paired dimensions/focal coordinates, per-collection
unique positions, a reverse membership index, and update timestamps maintained by
a v2-only invoker-rights trigger with an empty search path. Only one Selected edit
may be published at a time. The position constraint is deferrable for atomic reorder
transactions. Application-facing transaction/RPC operations still need to be built.

The current data has no populated dimensions; this migration does not guess them.
The existing category spelling drift was preserved in the copied data rather than
silently editing the old catalog. The future complete v2 archive must query its
photo table independently of category definitions.

## How the changes were tested and applied

1. Inspected live policies, constraints, grants, row counts, admin identity, migration
   history, and security advisories. No previous migration history or test branch
   existed.
2. Captured a source-schema/policy fixture with a synthetic admin identity for local
   tests. No real photo rows or credentials are stored in that fixture.
3. Added pinned dev dependencies for the Supabase CLI and PGlite. Local tests use
   synthetic data and a small `auth.uid()` stand-in; no production credentials,
   environment loading, HTTP client, or paid cloud test branch is involved.
4. Ran the actual migration SQL against isolated in-memory Postgres. Tests reproduce
   the original authorization issue before applying the repair.
5. Checked public/non-admin/admin reads and writes, hidden photos inside published
   collections, snapshot protection, catalog independence, timestamp updates,
   position swaps, constraints, repeat-import refusal, and failure rollback.
6. Applied each reviewed migration through the connected Supabase migration tool.
   Both migrations are atomic; errors roll back their changes. Locks have a five-second
   acquisition timeout. Source-table locks briefly block concurrent content writes,
   while ordinary public reads can continue.
7. Rechecked the live schema and read paths. All original-table row checksums stayed
   identical, and the private snapshot checksums exactly match the originals.

Local tests use PGlite/PostgreSQL 18; hosted Supabase uses PostgreSQL 17. This is
meaningful SQL/RLS regression coverage, not a full Supabase Auth/PostgREST/R2
integration replica. The live migration and postflight reads verify the hosted
schema; no test accounts or synthetic photo rows were created in production.

At verification: **43 tests passed** via `npm run test:db`. As anon, the live database
returned 286 original photos / 35 original bundles and 286 v2 photos / zero draft
v2 collections / zero draft v2 memberships.

Hosted read-only role checks also returned all 286 photos / 36 collections / 186
memberships for the verified admin subject, and only published photos / zero draft
collections or memberships for a synthetic non-admin subject. TypeScript and the
production build passed; no Vercel deployment was performed.

Local before/after policy/schema evidence and checksums are in the ignored
`.supabase-local/` directory. No application credentials or row dumps are written
there. The database snapshot tables hold the actual metadata copies.

## Files for future work

- `supabase/migrations/`: incremental migration SQL, aligned to hosted history.
- `supabase/tests/fixtures/content-schema-before.json`: redacted/synthetic baseline
  of the three original content tables, their constraints/grants, and policies.
- `scripts/test-supabase-policies.mjs`: isolated regression and import tests.
- `utils/supabase/database.types.ts`: generated types for the current public schema.
- `docs/PHOTO_REDESIGN_BRAINSTORM.md`: original findings and creative options.
- `docs/ARCHITECTURE.md`: existing route/file map.

These migrations assume the pre-existing content schema. They are not a complete
initial migration for an empty Supabase project. Reconstructing a full reproducible
Supabase environment is separate work; the test fixture is not a managed backup.

Commands:

```text
npm ci
npm run test:db
npx tsc --noEmit
npm run build
```

Do not re-run the catalog import to refresh v2: it intentionally refuses to overwrite
the snapshot or any v2 catalog tables. Further changes should be new migrations.
Changes to RLS take effect in Supabase immediately; they do not wait for a Vercel
deployment. Generated types alone do not switch application queries to v2.

## Recovery and next steps

No route rollback is needed yet because the application still reads v1. If work
on the new view is abandoned, the independent v2 tables can remain unused while
the existing website operates normally. Avoid automatically restoring the old
overly broad authorization rules. A policy correction should retain admin/public
boundaries and use a reviewed forward migration.

If restoring metadata ever becomes necessary, first compare the current source,
snapshot, and any edits since this change. A blind table replacement could discard
new work; the snapshot is a point-in-time record, not a synchronized replica.

### Private Selected Work draft operation — November 23, 2026

Applied `20261123170803_save_photo_v2_selection_draft.sql` to the hosted project.
`photo_v2_save_selection_draft` is a security-invoker RPC with an empty search path,
authenticated execute grant, explicit existing-admin check, and normal RLS.
It locks an unpublished Selected collection, compares its revision, validates the
photo list, replaces memberships, and updates the cover atomically. It refuses
published collections and other collection kinds; it does not publish anything.
No source catalog rows were changed. Generated database types include the RPC.

All 59 local database tests pass, including denied callers, stale revisions,
invalid lists, and an injected insert failure proving transaction rollback.
Hosted read-only checks confirm invoker mode, restricted execute privileges,
an unchanged empty private Selected Work draft, and 286 photos in each catalog.

### Private Series draft operation — November 23, 2026

Applied `20261123172029_save_photo_v2_series_draft.sql` to the hosted project.
The admin-only invoker function creates or updates an unpublished series and
saves its ordered members and cover in one transaction. The cover must belong to
the sequence. The function preserves imported provenance and slugs, rejects
stale revisions, and blocks repeat creation under the same draft ID.
Hosted checks confirmed 35 private Series rows and zero published Series rows.
Local tests cover draft creation, imported draft edits, privacy, invalid covers,
stale revisions, and rollback after an insert failure.

### Publishing saved drafts — November 23, 2026

Applied `20261123174024_publish_photo_v2_draft.sql` to the hosted project. The
admin-only `photo_v2_publications` table maps each private draft to the public
copy and records which draft revision is live. The invoker RPC locks the draft,
checks its revision and member visibility, and copies metadata and memberships
in one transaction. Repeating the same publication is safe. Later publication
uses the same public collection and slug. No draft or legacy content was
published or changed by the migration.

### Direct publishing and unpublishing

Applied `20261123175439_manage_photo_v2_publications.sql`. An explicit marker
keeps inactive public copies out of the draft editor and list. The admin-only
invoker functions support atomic save and publish and revision-checked
unpublish. Republish reuses the public copy and URL. Hosted counts and
fingerprints matched for collection content and photo membership before and
after the migration.

### Storage for uploaded v2 photos

Applied `20261123182612_add_photo_v2_media_storage.sql`. The new private
`portfolio-v2-media` bucket accepts WebP derivatives. Its insert and draft read
policies require the existing admin identity. Public object reads require a
published v2 photo with the matching UUID and display key.

The app stores both immutable keys before inserting the draft row. A retry can
reuse matching bytes from an interrupted request. Retained partial writes stay
private and have no catalog entry. Public delivery signs a one-hour URL and
caches the redirect for a shorter interval. The hosted verification found zero
objects and no changes to the photo catalog counts.

Next implementation phase:

1. Build `/photo-preview` against the v2 tables only, with placeholder Selected/series
   presentation where no collection is published.
2. Add typed server loaders and a separate admin curation path for v2. Use a transaction
   for metadata plus memberships; don't carry forward ignored membership errors.
3. Add dimension extraction/backfill and an immutable v2 media upload convention.
4. Define draft preview access deliberately: `noindex` is not authentication, and a
   public client cannot load the imported draft collections.
5. Test the public viewer and editor end to end before changing `/photo` route wiring.

Remaining legacy advisor warnings were not mixed into these changes:

- [The original ordering RPC has a mutable search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
- [Leaked-password protection is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The private snapshot's [RLS-without-policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
are intentional: the backup should not have application access.

## Deleted upload media cleanup — November 23, 2026

Applied `20261123234314_add_photo_v2_media_cleanup.sql` to the photos project.
An invoker trigger records a private cleanup task in the catalog deletion
transaction only when the old object key matches that photo's new-upload path.
The admin action removes both WebP derivatives through the Storage API, verifies
that neither file remains, and then acknowledges the task. Failures retain the
task for the Photos page's Retry image cleanup button (up to 25 tasks per retry).
Imported/legacy media is never queued or removed by this flow.

The storage DELETE policy requires the existing admin identity, the dedicated
bucket, a matching queued UUID, one of the two supported derivative filenames,
and no remaining catalog reference. The queue has RLS and no anonymous grants.
Local policy tests cover stale deletion, transactional enqueue/rollback, active
photo protection, derivative-only deletion, and unauthorized access. Four
Storage API tests cover success, partial/silent failures, retry, and API errors.
TypeScript and changed-file lint pass. Hosted metadata checks confirm the new
trigger/policies, zero pending tasks, and no new feature-related advisor notices.
No real photo or storage object was deleted during verification; signed-in
deletion with Storage API cleanup remains an owner browser review.

Follow-up: two real deletions removed their files but left cleanup tasks pending
because `exists()` returns an error for a missing object. Completion now checks
the UUID folder listing instead. Regression tests cover the missing-object error,
partial removal, and listing failures. Cleared only those two tasks after hosted
queries verified their photo records and both derivatives were absent; the queue
then contained zero tasks. No additional image files were removed by this repair.
