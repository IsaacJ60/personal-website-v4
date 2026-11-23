-- Saved drafts and published collections are separate v2 records.
CREATE TABLE public.photo_v2_publications (
  draft_id uuid PRIMARY KEY REFERENCES public.photo_v2_collections(id) ON DELETE RESTRICT,
  live_id uuid NOT NULL UNIQUE REFERENCES public.photo_v2_collections(id) ON DELETE RESTRICT,
  draft_revision timestamptz NOT NULL,
  CHECK (draft_id <> live_id)
);

ALTER TABLE public.photo_v2_publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.photo_v2_publications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.photo_v2_publications TO authenticated;

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
  THEN RAISE EXCEPTION 'Expected verified v2 admin policy before enabling publication'; END IF;

  EXECUTE format(
    'CREATE POLICY "Content admin can manage v2 publications" ON public.photo_v2_publications
      FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
    admin_predicate, admin_predicate
  );

  EXECUTE format($definition$
    CREATE FUNCTION public.photo_v2_publish_draft(p_draft_id uuid, p_expected_updated_at timestamptz)
    RETURNS TABLE(public_slug text, collection_kind text)
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $body$
    DECLARE
      draft public.photo_v2_collections%%ROWTYPE;
      publication public.photo_v2_publications%%ROWTYPE;
      live_collection_id uuid;
      live_slug text;
      first_photo_id uuid;
    BEGIN
      IF NOT coalesce((%s), false) THEN
        RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
      END IF;

      -- Draft save operations lock this same row before changing memberships.
      SELECT * INTO draft FROM public.photo_v2_collections WHERE id = p_draft_id FOR UPDATE;
      IF NOT FOUND OR draft.published OR draft.kind NOT IN ('selected', 'series')
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
        SELECT slug INTO STRICT live_slug FROM public.photo_v2_collections
          WHERE id = live_collection_id AND published AND kind = draft.kind;
        IF publication.draft_revision = draft.updated_at THEN
          RETURN QUERY SELECT live_slug, draft.kind;
          RETURN;
        END IF;
      ELSE
        live_collection_id := gen_random_uuid();
        live_slug := CASE WHEN draft.kind = 'selected' THEN 'selected-work-live'
          ELSE coalesce(nullif(trim(both '-' FROM left(regexp_replace(lower(draft.title), '[^a-z0-9]+', '-', 'g'), 80)), ''), 'series') END;
        INSERT INTO public.photo_v2_collections (id, slug, title, kind)
          VALUES (live_collection_id, live_slug, draft.title, draft.kind) ON CONFLICT (slug) DO NOTHING;
        IF NOT FOUND THEN
          live_slug := live_slug || '-' || replace(live_collection_id::text, '-', '');
          INSERT INTO public.photo_v2_collections (id, slug, title, kind)
            VALUES (live_collection_id, live_slug, draft.title, draft.kind);
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

  REVOKE ALL ON FUNCTION public.photo_v2_publish_draft(uuid,timestamptz) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.photo_v2_publish_draft(uuid,timestamptz) TO authenticated;
END
$migration$;
