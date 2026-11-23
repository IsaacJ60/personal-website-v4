-- Distinguish inactive public copies from editable drafts without moving either.
ALTER TABLE public.photo_v2_collections ADD COLUMN is_public_copy boolean NOT NULL DEFAULT false;
UPDATE public.photo_v2_collections AS c SET is_public_copy = true
  FROM public.photo_v2_publications AS p WHERE p.live_id = c.id;

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
  THEN RAISE EXCEPTION 'Expected verified v2 admin policy before modifying publication'; END IF;

  EXECUTE format($definition$
    CREATE OR REPLACE FUNCTION public.photo_v2_publish_draft(p_draft_id uuid, p_expected_updated_at timestamptz)
    RETURNS TABLE(public_slug text, collection_kind text)
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $body$
    DECLARE
      draft public.photo_v2_collections%%ROWTYPE;
      publication public.photo_v2_publications%%ROWTYPE;
      live_collection_id uuid;
      live_slug text;
      first_photo_id uuid;
      already_public boolean;
    BEGIN
      IF NOT coalesce((%s), false) THEN
        RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
      END IF;

      -- Draft save operations lock this same row before changing memberships.
      SELECT * INTO draft FROM public.photo_v2_collections WHERE id = p_draft_id FOR UPDATE;
      IF NOT FOUND OR draft.published OR draft.is_public_copy OR draft.kind NOT IN ('selected', 'series')
        OR (draft.kind = 'selected' AND draft.slug <> 'selected-work')
      THEN RAISE EXCEPTION 'Only Selected Work or a Series draft can be published' USING ERRCODE = '22023'; END IF;
      IF draft.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        RAISE EXCEPTION 'Draft was changed after this preview opened' USING ERRCODE = '40001';
      END IF;

      SELECT photo_id INTO first_photo_id FROM public.photo_v2_collection_photos
        WHERE collection_id = draft.id ORDER BY position LIMIT 1;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Select at least one photograph before publishing' USING ERRCODE = '22023';
      END IF;
      IF draft.cover_photo_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.photo_v2_collection_photos
        WHERE collection_id = draft.id AND photo_id = draft.cover_photo_id
      ) THEN RAISE EXCEPTION 'The cover must be in the sequence' USING ERRCODE = '22023'; END IF;

      -- Also serialize against edits to the selected photos' visibility.
      PERFORM p.id FROM public.photo_v2_collection_photos AS m
        JOIN public.photo_v2_photos AS p ON p.id = m.photo_id WHERE m.collection_id = draft.id
        ORDER BY p.id FOR SHARE OF p;
      IF EXISTS (
        SELECT 1 FROM public.photo_v2_collection_photos AS m
        JOIN public.photo_v2_photos AS p ON p.id = m.photo_id
        WHERE m.collection_id = draft.id AND NOT p.published
      ) THEN RAISE EXCEPTION 'Every photograph must be public before publishing a collection' USING ERRCODE = '23514'; END IF;

      SELECT * INTO publication FROM public.photo_v2_publications WHERE draft_id = draft.id;
      IF FOUND THEN
        live_collection_id := publication.live_id;
        SELECT slug, published INTO STRICT live_slug, already_public FROM public.photo_v2_collections
          WHERE id = live_collection_id AND is_public_copy AND kind = draft.kind;
        IF already_public AND publication.draft_revision = draft.updated_at THEN
          RETURN QUERY SELECT live_slug, draft.kind;
          RETURN;
        END IF;
      ELSE
        live_collection_id := gen_random_uuid();
        live_slug := CASE WHEN draft.kind = 'selected' THEN 'selected-work-live'
          ELSE coalesce(nullif(trim(both '-' FROM left(regexp_replace(lower(draft.title), '[^a-z0-9]+', '-', 'g'), 80)), ''), 'series') END;
        -- Keep placeholder routes distinct from anything that can be unpublished.
        IF draft.kind = 'series' AND live_slug IN ('between-stops', 'edges-of-the-day', 'small-worlds') THEN
          live_slug := live_slug || '-series';
        END IF;
        INSERT INTO public.photo_v2_collections (id, slug, title, kind, is_public_copy)
          VALUES (live_collection_id, live_slug, draft.title, draft.kind, true) ON CONFLICT (slug) DO NOTHING;
        IF NOT FOUND THEN
          live_slug := live_slug || '-' || replace(live_collection_id::text, '-', '');
          INSERT INTO public.photo_v2_collections (id, slug, title, kind, is_public_copy)
            VALUES (live_collection_id, live_slug, draft.title, draft.kind, true);
        END IF;
      END IF;

      DELETE FROM public.photo_v2_collection_photos WHERE collection_id = live_collection_id;
      INSERT INTO public.photo_v2_collection_photos (collection_id, photo_id, position)
        SELECT live_collection_id, photo_id, position FROM public.photo_v2_collection_photos
        WHERE collection_id = draft.id ORDER BY position;
      UPDATE public.photo_v2_collections
        SET title = draft.title, description = draft.description,
          cover_photo_id = coalesce(draft.cover_photo_id, first_photo_id), sort_order = draft.sort_order,
          date_taken = draft.date_taken, location_name = draft.location_name,
          categories = draft.categories, published = true
        WHERE id = live_collection_id;

      INSERT INTO public.photo_v2_publications (draft_id, live_id, draft_revision)
        VALUES (draft.id, live_collection_id, draft.updated_at)
        ON CONFLICT (draft_id) DO UPDATE SET draft_revision = excluded.draft_revision;
      RETURN QUERY SELECT live_slug, draft.kind;
    END
    $body$;
  $definition$, admin_predicate);

  EXECUTE format($definition$
    CREATE OR REPLACE FUNCTION public.photo_v2_save_series_draft(
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
        IF NOT FOUND OR target.kind <> 'series' OR target.published OR target.is_public_copy THEN
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

  EXECUTE format($definition$
    CREATE FUNCTION public.photo_v2_unpublish_draft(p_draft_id uuid, p_expected_live_updated_at timestamptz)
    RETURNS TABLE(public_slug text, collection_kind text)
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $body$
    DECLARE
      live public.photo_v2_collections%%ROWTYPE;
    BEGIN
      IF NOT coalesce((%s), false) THEN
        RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
      END IF;
      -- Match the locking order of publish and both draft saves.
      PERFORM id FROM public.photo_v2_collections WHERE id = p_draft_id FOR UPDATE;
      SELECT c.* INTO live FROM public.photo_v2_publications AS p
        JOIN public.photo_v2_collections AS c ON c.id = p.live_id AND c.is_public_copy
        WHERE p.draft_id = p_draft_id FOR UPDATE OF c;
      IF NOT FOUND THEN RAISE EXCEPTION 'No public version exists' USING ERRCODE = '22023'; END IF;
      IF live.published THEN
        IF live.updated_at IS DISTINCT FROM p_expected_live_updated_at THEN
          RAISE EXCEPTION 'The public version changed after this editor opened' USING ERRCODE = '40001';
        END IF;
        UPDATE public.photo_v2_collections SET published = false WHERE id = live.id;
      END IF;
      RETURN QUERY SELECT live.slug, live.kind;
    END
    $body$;
  $definition$, admin_predicate);

  REVOKE ALL ON FUNCTION public.photo_v2_unpublish_draft(uuid,timestamptz) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.photo_v2_unpublish_draft(uuid,timestamptz) TO authenticated;
END
$migration$;

-- Saved edits and publication commit together, including when the draft is new.
CREATE FUNCTION public.photo_v2_save_and_publish_draft(
  p_draft_id uuid, p_kind text, p_photo_ids uuid[],
  p_expected_updated_at timestamptz DEFAULT NULL, p_title text DEFAULT NULL,
  p_description text DEFAULT NULL, p_cover_photo_id uuid DEFAULT NULL
) RETURNS TABLE(public_slug text, collection_kind text, saved_revision timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $body$
DECLARE saved_at timestamptz;
BEGIN
  CASE p_kind
    WHEN 'selected' THEN
      saved_at := public.photo_v2_save_selection_draft(p_draft_id, p_expected_updated_at, p_photo_ids);
    WHEN 'series' THEN
      saved_at := public.photo_v2_save_series_draft(
        p_draft_id, p_title, p_description, p_photo_ids, p_expected_updated_at, p_cover_photo_id
      );
    ELSE RAISE EXCEPTION 'Invalid collection kind' USING ERRCODE = '22023';
  END CASE;
  RETURN QUERY SELECT published.public_slug, published.collection_kind, saved_at
    FROM public.photo_v2_publish_draft(p_draft_id, saved_at) AS published;
END
$body$;

REVOKE ALL ON FUNCTION public.photo_v2_save_and_publish_draft(uuid,text,uuid[],timestamptz,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.photo_v2_save_and_publish_draft(uuid,text,uuid[],timestamptz,text,text,uuid) TO authenticated;
