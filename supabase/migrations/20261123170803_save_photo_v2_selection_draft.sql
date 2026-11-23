-- New invoker-rights operation only. No content import, v1 writes, or publishing.
DO $migration$
DECLARE admin_predicate text;
BEGIN
  SELECT qual INTO STRICT admin_predicate FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'photo_v2_collections'
      AND policyname = 'Content admin can manage photo_v2_collections'
      AND cmd = 'ALL' AND roles = ARRAY['authenticated']::name[];
  IF admin_predicate IS NULL OR admin_predicate !~ 'auth\.uid\('
    OR admin_predicate !~ '[0-9a-fA-F]{8}-[0-9a-fA-F-]{27}'
    OR admin_predicate ~* '\m(true|or)\M'
  THEN RAISE EXCEPTION 'Expected verified v2 admin policy before adding draft saves'; END IF;

  EXECUTE format($definition$
    CREATE FUNCTION public.photo_v2_save_selection_draft(
      p_collection_id uuid, p_expected_updated_at timestamptz, p_photo_ids uuid[]
    ) RETURNS timestamptz
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $body$
    DECLARE target public.photo_v2_collections%%ROWTYPE; saved_at timestamptz;
    BEGIN
      IF NOT coalesce((%s), false) THEN
        RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
      END IF;
      IF p_photo_ids IS NULL OR cardinality(p_photo_ids) > 1000
        OR (cardinality(p_photo_ids) > 0 AND array_ndims(p_photo_ids) <> 1)
        OR EXISTS (SELECT 1 FROM unnest(p_photo_ids) x(id) WHERE id IS NULL)
        OR (SELECT count(DISTINCT id) FROM unnest(p_photo_ids) x(id)) <> cardinality(p_photo_ids)
      THEN RAISE EXCEPTION 'Invalid photo selection' USING ERRCODE = '22023'; END IF;

      SELECT * INTO target FROM public.photo_v2_collections
        WHERE id = p_collection_id FOR UPDATE;
      IF NOT FOUND OR target.kind <> 'selected' OR target.published THEN
        RAISE EXCEPTION 'Only an unpublished Selected Work draft can be edited' USING ERRCODE = '22023';
      END IF;
      IF target.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        RAISE EXCEPTION 'This draft changed in another session; reload before saving' USING ERRCODE = '40001';
      END IF;
      IF (SELECT count(*) FROM public.photo_v2_photos WHERE id = ANY(p_photo_ids)) <> cardinality(p_photo_ids) THEN
        RAISE EXCEPTION 'One or more selected photographs no longer exist' USING ERRCODE = '22023';
      END IF;

      DELETE FROM public.photo_v2_collection_photos WHERE collection_id = p_collection_id;
      INSERT INTO public.photo_v2_collection_photos (collection_id, photo_id, position)
        SELECT p_collection_id, id, (ordinality - 1)::integer
        FROM unnest(p_photo_ids) WITH ORDINALITY AS selection(id, ordinality);
      UPDATE public.photo_v2_collections SET cover_photo_id = (
        SELECT id FROM unnest(p_photo_ids) WITH ORDINALITY AS selection(id, ordinality)
        ORDER BY ordinality LIMIT 1
      ) WHERE id = p_collection_id RETURNING updated_at INTO saved_at;
      RETURN saved_at;
    END
    $body$;
  $definition$, admin_predicate);
  REVOKE ALL ON FUNCTION public.photo_v2_save_selection_draft(uuid,timestamptz,uuid[]) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.photo_v2_save_selection_draft(uuid,timestamptz,uuid[]) TO authenticated;
END
$migration$;
