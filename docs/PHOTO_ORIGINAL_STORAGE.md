# Original photo retention

New single-photo and bulk uploads retain the selected file unchanged in private
Cloudflare R2 before saving display images or a catalog row. Display/thumbnail
WebPs remain in the existing Supabase derivative bucket. No database migration.

## Storage and configuration

- R2 account: the existing website account.
- Private bucket: `photo-originals`, created November 23, 2026.
- Object key: `originals/<photo UUID>/source`; the content type identifies its format.
- Public `r2.dev` access is disabled and no custom domain is attached.
- PUT CORS is limited to `https://www.isaacjiang.ca`, `https://isaacjiang.ca`,
  `http://localhost:3000`, and `http://localhost:3001`. Add the exact deployment
  origin if testing uploads on a Vercel preview hostname.
- `R2_ORIGINALS_BUCKET_NAME=photo-originals` is configured in Vercel Preview and
  Production. Environment changes take effect on a new deployment.
- Existing `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` must grant
  object read/write access to this new bucket. The public legacy bucket remains
  identified separately by `R2_BUCKET_NAME`; it cannot be used as original storage.
- Local testing needs these server-only variables in ignored `.env.local`.
  Vercel's sensitive credentials cannot be read back, so they were not copied locally.

## Save and retry behavior

1. Keep the selected original File in the upload review state while preparing
   the browsing preview. Hash the original bytes with SHA-256 when saving.
2. An admin-only endpoint issues a five-minute, single-object PUT URL. It signs
   the content type, hash metadata, and `If-None-Match: *` so the original cannot
   be overwritten. It never issues an original GET URL to a visitor.
3. Upload the original directly from the browser, avoiding the application's
   request-body limit. Confirm its size, type, and hash metadata through R2 HEAD.
4. Save the bounded display image and thumbnail, then insert the catalog row.
   The server rejects a new record when its private original is absent or invalid.
5. Retry with the same photo UUID and original. Identical originals are reused;
   a different original for the same UUID is rejected. Upload failures leave
   the selected file and details in the local review queue.

The R2 client requests optional SDK upload checksums only when required; otherwise
the current SDK signs the checksum of an empty body when creating a PUT URL,
which does not match the later browser upload. The original's SHA-256 is signed
as metadata and used to verify retries.

Sharing resolves uploaded originals from this private bucket server-side and
returns only framed, watermarked bytes. Existing two derivative-only uploads are
not automatically backfilled. Removing a photo from the website cleans up its
display derivatives; the private original is retained as an archive. Failed saves
can likewise leave a private archived original; no automatic expiry is configured.

## Verification and release boundary

24 targeted tests pass across original transfer, signed requests, queue retries,
and server save ordering. Tests check exact file bytes, immutable PUT constraints,
missing/mismatched originals preventing database writes, authentication expiry,
and unchanged publication retries. TypeScript and changed-file lint pass.
Anonymous local requests to both original authorization and photo saving return
401 with no-store. Bucket public-domain configuration was checked through Cloudflare.

Local credentials are now configured in ignored `.env.local` using the R2 access
key supplied by Isaac. The separate Cloudflare management token was not needed
or stored. A real storage integration check passed: signed PUT, localhost CORS,
HEAD verification, identical-original retry, rejected overwrite (412), exact-byte
server-side retrieval, denied anonymous retrieval, and watermarked PNG rendering.
A generated 2400 × 1600 JPEG produced a 2568 × 1984 framed export. The generated
private fixture was removed and its absence verified afterward.

Not deployed. An authenticated browser → R2 → photo save → watermarked export
round trip still needs manual review before release. The previously configured
Vercel credentials were not replaced; their access to the new bucket remains
unverified. No real photo was uploaded, republished, replaced, or deleted for testing.

This change retains new originals; restricting existing legacy public R2 originals
remains a separate outstanding sharing milestone.

References: [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/),
[conditional writes](https://developers.cloudflare.com/r2/api/s3/conditional-operations/),
[AWS SDK checksum configuration](https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html).
