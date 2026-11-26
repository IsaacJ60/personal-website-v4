-- A dedicated private bucket for new v3 uploads. Legacy R2 media is independent.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portfolio-v3-media', 'portfolio-v3-media', false, 3500000, ARRAY['image/webp']);

DO $migration$
DECLARE admin_predicate text;
DECLARE image_path text := '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(display|thumbnail)\.webp$';
BEGIN
  SELECT qual INTO STRICT admin_predicate FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'photo_v3_photos'
      AND policyname = 'Content admin can manage photo_v3_photos'
      AND cmd = 'ALL' AND roles = ARRAY['authenticated']::name[];
  IF admin_predicate IS NULL OR admin_predicate !~ 'auth\.uid\('
    OR admin_predicate !~ '[0-9a-fA-F]{8}-[0-9a-fA-F-]{27}'
    OR admin_predicate ~* '\m(true|or)\M'
  THEN RAISE EXCEPTION 'Expected verified v3 admin policy before enabling uploads'; END IF;

  EXECUTE format(
    'CREATE POLICY "Portfolio admin can insert new v3 photo derivatives" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND name ~ %L AND (%s))',
    'portfolio-v3-media', image_path, admin_predicate
  );
  EXECUTE format(
    'CREATE POLICY "Portfolio admin can read draft v3 photo derivatives" ON storage.objects
      FOR SELECT TO authenticated USING (bucket_id = %L AND name ~ %L AND (%s))',
    'portfolio-v3-media', image_path, admin_predicate
  );
  EXECUTE format($policy$
    CREATE POLICY "Public can read derivatives of published v3 uploads" ON storage.objects
      FOR SELECT TO anon, authenticated USING (
        bucket_id = 'portfolio-v3-media' AND name ~ %L AND EXISTS (
          SELECT 1 FROM public.photo_v3_photos p
          WHERE p.published AND p.object_key = replace(storage.objects.name, '/thumbnail.webp', '/display.webp')
            AND p.id::text = split_part(storage.objects.name, '/', 2)
        )
      )
  $policy$, image_path);
END
$migration$;

DO $migration$
DECLARE admin_predicate text;
BEGIN
  SELECT qual INTO STRICT admin_predicate FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'photo_v3_photos'
      AND policyname = 'Content admin can manage photo_v3_photos'
      AND cmd = 'ALL' AND roles = ARRAY['authenticated']::name[];
  IF admin_predicate IS NULL OR admin_predicate !~ 'auth\.uid\('
    OR admin_predicate !~ '[0-9a-fA-F]{8}-[0-9a-fA-F-]{27}'
    OR admin_predicate ~* '\m(true|or)\M'
  THEN RAISE EXCEPTION 'Expected verified v2 admin policy before enabling cleanup'; END IF;

  EXECUTE format($policy$
    CREATE POLICY "Portfolio admin can remove deleted v3 upload derivatives" ON storage.objects
    FOR DELETE TO authenticated USING (
      bucket_id = 'portfolio-v3-media'
      AND name ~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(display|thumbnail)\.webp$'
      AND (%s)
      AND EXISTS (SELECT 1 FROM public.photo_v3_media_cleanup q WHERE q.photo_id::text = split_part(storage.objects.name, '/', 2))
      AND NOT EXISTS (SELECT 1 FROM public.photo_v3_photos p
        WHERE p.id::text = split_part(storage.objects.name, '/', 2)
          OR p.object_key = replace(storage.objects.name, '/thumbnail.webp', '/display.webp'))
    )
  $policy$, admin_predicate);
END
$migration$;

