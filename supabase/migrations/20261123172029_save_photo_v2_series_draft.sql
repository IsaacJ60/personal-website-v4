-- One transaction for a series draft and its ordered membership.
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
  THEN RAISE EXCEPTION 'Expected verified v2 admin policy before adding series drafts'; END IF;

  EXECUTE format($definition$
    CREATE FUNCTION public.photo_v2_save_series_draft(
      p_collection_id uuid, p_title text, p_description text, p_photo_ids uuid[],
      p_expected_updated_at timestamptz DEFAULT NULL, p_cover_photo_id uuid DEFAULT NULL
    ) RETURNS timestamptz
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $body$
    DECLARE
      target public.photo_v2_collections%%ROWTYPE;
      saved_at timestamptz;
      cleaned_title text := btrim(p_title);
      cleaned_description text := nullif(btrim(p_description), '');
    BEGIN
      IF NOT coalesce((%s), false) THEN
        RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
      END IF;
      IF p_collection_id IS NULL OR cleaned_title IS NULL OR char_length(cleaned_title) NOT BETWEEN 1 AND 120
        OR char_length(cleaned_description) > 2000
        OR p_photo_ids IS NULL OR cardinality(p_photo_ids) > 1000
        OR (cardinality(p_photo_ids) > 0 AND array_ndims(p_photo_ids) <> 1)
        OR EXISTS (SELECT 1 FROM unnest(p_photo_ids) x(id) WHERE id IS NULL)
        OR (SELECT count(DISTINCT id) FROM unnest(p_photo_ids) x(id)) <> cardinality(p_photo_ids)
        OR (p_cover_photo_id IS NOT NULL AND NOT (p_cover_photo_id = ANY(p_photo_ids)))
      THEN
        RAISE EXCEPTION 'Invalid series draft' USING ERRCODE = '22023';
      END IF;

      IF p_expected_updated_at IS NULL THEN
        INSERT INTO public.photo_v2_collections (id, slug, title, kind, published)
        VALUES (p_collection_id, 'series-' || p_collection_id::text, cleaned_title, 'series', false)
        ON CONFLICT (id) DO NOTHING;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Series draft already exists' USING ERRCODE = '40001';
        END IF;
      ELSE
        SELECT * INTO target FROM public.photo_v2_collections
          WHERE id = p_collection_id FOR UPDATE;
        IF NOT FOUND OR target.kind <> 'series' OR target.published THEN
          RAISE EXCEPTION 'Only an unpublished Series draft can be edited' USING ERRCODE = '22023';
        END IF;
        IF target.updated_at IS DISTINCT FROM p_expected_updated_at THEN
          RAISE EXCEPTION 'This draft changed in another session' USING ERRCODE = '40001';
        END IF;
      END IF;

      IF (SELECT count(*) FROM public.photo_v2_photos WHERE id = ANY(p_photo_ids)) <> cardinality(p_photo_ids) THEN
        RAISE EXCEPTION 'One or more selected photographs no longer exist' USING ERRCODE = '22023';
      END IF;

      DELETE FROM public.photo_v2_collection_photos WHERE collection_id = p_collection_id;
      INSERT INTO public.photo_v2_collection_photos (collection_id, photo_id, position)
        SELECT p_collection_id, id, (ordinality - 1)::integer
        FROM unnest(p_photo_ids) WITH ORDINALITY AS selection(id, ordinality);
      UPDATE public.photo_v2_collections
        SET title = cleaned_title, description = cleaned_description, cover_photo_id = p_cover_photo_id
        WHERE id = p_collection_id RETURNING updated_at INTO saved_at;
      RETURN saved_at;
    END
    $body$;
  $definition$, admin_predicate);
  REVOKE ALL ON FUNCTION public.photo_v2_save_series_draft(uuid,text,text,uuid[],timestamptz,uuid) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.photo_v2_save_series_draft(uuid,text,text,uuid[],timestamptz,uuid) TO authenticated;
END
$migration$;
