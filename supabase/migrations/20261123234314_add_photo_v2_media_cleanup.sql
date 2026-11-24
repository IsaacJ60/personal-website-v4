-- Record cleanup in the same transaction as catalog deletion. File bytes are
-- removed through the Storage API, never by deleting storage.objects in SQL.
CREATE TABLE public.photo_v2_media_cleanup (
  photo_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.photo_v2_media_cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.photo_v2_media_cleanup FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.photo_v2_media_cleanup TO authenticated;

DO $migration$
DECLARE admin_predicate text;
BEGIN
  SELECT qual INTO STRICT admin_predicate FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'photo_v2_photos'
      AND policyname = 'Content admin can manage photo_v2_photos'
      AND cmd = 'ALL' AND roles = ARRAY['authenticated']::name[];
  IF admin_predicate IS NULL OR admin_predicate !~ 'auth\.uid\('
    OR admin_predicate !~ '[0-9a-fA-F]{8}-[0-9a-fA-F-]{27}'
    OR admin_predicate ~* '\m(true|or)\M'
  THEN RAISE EXCEPTION 'Expected verified v2 admin policy before enabling cleanup'; END IF;

  EXECUTE format('CREATE POLICY "Portfolio admin can manage media cleanup" ON public.photo_v2_media_cleanup
    FOR ALL TO authenticated USING (%s) WITH CHECK (%s)', admin_predicate, admin_predicate);
  EXECUTE format($policy$
    CREATE POLICY "Portfolio admin can remove deleted upload derivatives" ON storage.objects
    FOR DELETE TO authenticated USING (
      bucket_id = 'portfolio-v2-media'
      AND name ~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(display|thumbnail)\.webp$'
      AND (%s)
      AND EXISTS (SELECT 1 FROM public.photo_v2_media_cleanup q WHERE q.photo_id::text = split_part(storage.objects.name, '/', 2))
      AND NOT EXISTS (SELECT 1 FROM public.photo_v2_photos p
        WHERE p.id::text = split_part(storage.objects.name, '/', 2)
          OR p.object_key = replace(storage.objects.name, '/thumbnail.webp', '/display.webp'))
    )
  $policy$, admin_predicate);
END
$migration$;

CREATE FUNCTION public.photo_v2_queue_media_cleanup() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
BEGIN
  IF OLD.object_key = 'uploads/' || OLD.id::text || '/display.webp' THEN
    INSERT INTO public.photo_v2_media_cleanup(photo_id) VALUES (OLD.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN OLD;
END
$function$;
REVOKE ALL ON FUNCTION public.photo_v2_queue_media_cleanup() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER photo_v2_deleted_media_cleanup AFTER DELETE ON public.photo_v2_photos
FOR EACH ROW EXECUTE FUNCTION public.photo_v2_queue_media_cleanup();
