-- A dedicated private bucket for new v2 uploads. Legacy R2 media is independent.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portfolio-v2-media', 'portfolio-v2-media', false, 3500000, ARRAY['image/webp']);

DO $migration$
DECLARE admin_predicate text;
DECLARE image_path text := '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(display|thumbnail)\.webp$';
BEGIN
  SELECT qual INTO STRICT admin_predicate FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'photo_v2_photos'
      AND policyname = 'Content admin can manage photo_v2_photos'
      AND cmd = 'ALL' AND roles = ARRAY['authenticated']::name[];
  IF admin_predicate IS NULL OR admin_predicate !~ 'auth\.uid\('
    OR admin_predicate !~ '[0-9a-fA-F]{8}-[0-9a-fA-F-]{27}'
    OR admin_predicate ~* '\m(true|or)\M'
  THEN RAISE EXCEPTION 'Expected verified v2 admin policy before enabling uploads'; END IF;

  EXECUTE format(
    'CREATE POLICY "Portfolio admin can insert new photo derivatives" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND name ~ %L AND (%s))',
    'portfolio-v2-media', image_path, admin_predicate
  );
  EXECUTE format(
    'CREATE POLICY "Portfolio admin can read draft photo derivatives" ON storage.objects
      FOR SELECT TO authenticated USING (bucket_id = %L AND name ~ %L AND (%s))',
    'portfolio-v2-media', image_path, admin_predicate
  );
  EXECUTE format($policy$
    CREATE POLICY "Public can read derivatives of published v2 uploads" ON storage.objects
      FOR SELECT TO anon, authenticated USING (
        bucket_id = 'portfolio-v2-media' AND name ~ %L AND EXISTS (
          SELECT 1 FROM public.photo_v2_photos p
          WHERE p.published AND p.object_key = replace(storage.objects.name, '/thumbnail.webp', '/display.webp')
            AND p.id::text = split_part(storage.objects.name, '/', 2)
        )
      )
  $policy$, image_path);
END
$migration$;
