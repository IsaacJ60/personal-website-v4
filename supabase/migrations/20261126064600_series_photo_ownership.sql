-- Roll out with uploads paused, then deploy the matching application before reopening
-- admin writes. The legacy photos.published column is retained for rollback only;
-- no v3 policy, loader, or publication operation treats it as visibility authority.
BEGIN;
LOCK TABLE public.photo_v3_photos, public.photo_v3_collections,
  public.photo_v3_collection_photos, public.photo_v3_publications IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE public.photo_v3_photos ADD COLUMN owner_series_id uuid
  REFERENCES public.photo_v3_collections(id) ON DELETE RESTRICT;
CREATE INDEX photo_v3_photo_owner ON public.photo_v3_photos(owner_series_id);

-- Include current public snapshots when identifying canonical owners. Refuse to
-- silently curate ambiguous data if the catalog has changed since the audit.
CREATE TEMP TABLE photo_series_owners ON COMMIT DROP AS
  SELECT DISTINCT m.photo_id, c.id AS owner_id
  FROM public.photo_v3_collection_photos m
  JOIN public.photo_v3_collections c ON c.id=m.collection_id
  WHERE c.kind='series' AND NOT c.is_public_copy
  UNION
  SELECT m.photo_id, p.draft_id FROM public.photo_v3_collection_photos m
  JOIN public.photo_v3_publications p ON p.live_id=m.collection_id
  JOIN public.photo_v3_collections c ON c.id=p.draft_id WHERE c.kind='series';
DO $$ BEGIN
  IF EXISTS (SELECT photo_id FROM photo_series_owners GROUP BY photo_id HAVING count(*)>1)
  THEN RAISE EXCEPTION 'Ambiguous series ownership: resolve curation before migration'; END IF;
END $$;
UPDATE public.photo_v3_photos p SET owner_series_id=o.owner_id
  FROM photo_series_owners o WHERE o.photo_id=p.id;
DO $$ DECLARE organize uuid; BEGIN
  IF EXISTS (SELECT 1 FROM public.photo_v3_photos WHERE owner_series_id IS NULL) THEN
    INSERT INTO public.photo_v3_collections(slug,title,kind)
      VALUES ('to-organize-' || gen_random_uuid()::text,'To organize','series') RETURNING id INTO organize;
    UPDATE public.photo_v3_photos SET owner_series_id=organize WHERE owner_series_id IS NULL;
    INSERT INTO public.photo_v3_collection_photos(collection_id,photo_id,position)
      SELECT organize,id,(row_number() OVER(ORDER BY date_taken DESC,id)-1)::int
      FROM public.photo_v3_photos WHERE owner_series_id=organize;
  END IF;
END $$;
ALTER TABLE public.photo_v3_photos ALTER COLUMN owner_series_id SET NOT NULL;
ALTER TABLE public.photo_v3_photos ADD CONSTRAINT photo_v3_owned_media_key
  CHECK (object_key='uploads/' || id::text || '/display.webp');

CREATE SCHEMA IF NOT EXISTS photo_v3_private;
REVOKE ALL ON SCHEMA photo_v3_private FROM PUBLIC;
GRANT USAGE ON SCHEMA photo_v3_private TO anon, authenticated;
-- Intentional, narrowly scoped definer lookups break the photos/members RLS cycle.
-- They expose only public eligibility, contain no user-supplied SQL, and never
-- confer admin privileges. No identity check: public eligibility is anonymous.
CREATE FUNCTION photo_v3_private.photo_visible(photo uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.photo_v3_photos f
    JOIN public.photo_v3_publications p ON p.draft_id=f.owner_series_id
    JOIN public.photo_v3_collections c ON c.id=p.live_id
    JOIN public.photo_v3_collection_photos m ON m.collection_id=c.id AND m.photo_id=f.id
    WHERE f.id=photo AND c.kind='series' AND c.is_public_copy AND c.published)
$$;
CREATE FUNCTION photo_v3_private.collection_visible(collection uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.photo_v3_collections c
    JOIN public.photo_v3_publications p ON p.live_id=c.id
    WHERE c.id=collection AND c.published AND c.is_public_copy)
$$;
REVOKE ALL ON FUNCTION photo_v3_private.photo_visible(uuid), photo_v3_private.collection_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION photo_v3_private.photo_visible(uuid), photo_v3_private.collection_visible(uuid) TO anon,authenticated;
ALTER POLICY "Public can read published v3 photos" ON public.photo_v3_photos
  USING (photo_v3_private.photo_visible(id));
ALTER POLICY "Public can read published v3 collections" ON public.photo_v3_collections
  USING (photo_v3_private.collection_visible(id));
ALTER POLICY "Public can read published v3 collection members" ON public.photo_v3_collection_photos
  USING (photo_v3_private.collection_visible(collection_id) AND photo_v3_private.photo_visible(photo_id));
ALTER POLICY "Public can read derivatives of published v3 uploads" ON storage.objects
  USING (CASE WHEN bucket_id='portfolio-v3-media'
    AND name ~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(display|thumbnail)\.webp$'
    THEN photo_v3_private.photo_visible(split_part(name,'/',2)::uuid) ELSE false END);

-- Retain the existing RPC revision checks, admin checks, slug handling and
-- atomic snapshot replacement; replace only their old photo-flag validation.
DO $$ DECLARE definition text; signature text; BEGIN
  definition := pg_get_functiondef('public.photo_v3_publish_draft(uuid,timestamptz)'::regprocedure);
  IF position('AND NOT p.published' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected publish definition'; END IF;
  definition := replace(definition,'AND NOT p.published',
    'AND ((draft.kind = ''series'' AND p.owner_series_id <> draft.id) OR (draft.kind = ''selected'' AND NOT photo_v3_private.photo_visible(p.id)))');
  definition := replace(definition,'Every photograph must be public before publishing a collection',
    'Series photos must belong to this series; Selected Work photos must be in a published series');
  EXECUTE definition;
  definition := pg_get_functiondef('public.photo_v3_save_series_draft(uuid,text,text,uuid[],timestamptz,uuid)'::regprocedure);
  definition := replace(definition,'WHERE id = ANY(p_photo_ids)', 'WHERE id = ANY(p_photo_ids) AND owner_series_id = p_collection_id');
  EXECUTE definition;
  FOREACH signature IN ARRAY ARRAY[
    'public.photo_v3_publish_draft(uuid,timestamptz)',
    'public.photo_v3_save_series_draft(uuid,text,text,uuid[],timestamptz,uuid)',
    'public.photo_v3_save_selection_draft(uuid,timestamptz,uuid[])',
    'public.photo_v3_unpublish_draft(uuid,timestamptz)',
    'public.photo_v3_save_and_publish_draft(uuid,text,uuid[],timestamptz,text,text,uuid)'
  ] LOOP
    definition := pg_get_functiondef(signature::regprocedure);
    EXECUTE regexp_replace(definition,'\mBEGIN\M',E'BEGIN\n  PERFORM pg_advisory_xact_lock(306260,3);');
  END LOOP;
END $$;

-- Serialize catalog writers before taking row locks. This small single-admin
-- catalog favors deterministic correctness across RPC and direct SQL writes.
CREATE FUNCTION photo_v3_private.lock_catalog() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
  PERFORM pg_advisory_xact_lock(306260,3); RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION photo_v3_private.lock_catalog() FROM PUBLIC;
DO $$ DECLARE tab text; BEGIN
  FOREACH tab IN ARRAY ARRAY['photo_v3_photos','photo_v3_collections','photo_v3_collection_photos','photo_v3_publications'] LOOP
    EXECUTE format('CREATE TRIGGER serialize_series_catalog BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION photo_v3_private.lock_catalog()',tab);
  END LOOP;
END $$;

CREATE FUNCTION photo_v3_private.validate_series_catalog() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.photo_v3_photos f JOIN public.photo_v3_collections c ON c.id=f.owner_series_id
    WHERE c.kind<>'series' OR c.is_public_copy OR c.published) THEN
    RAISE EXCEPTION 'A photo owner must be an editable series' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.photo_v3_collections c WHERE NOT c.is_public_copy AND c.kind='series'
    AND c.cover_photo_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.photo_v3_collection_photos m
      WHERE m.collection_id=c.id AND m.photo_id=c.cover_photo_id)) THEN
    RAISE EXCEPTION 'The cover must be in the sequence' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.photo_v3_collection_photos m
    JOIN public.photo_v3_photos f ON f.id=m.photo_id
    JOIN public.photo_v3_collections c ON c.id=m.collection_id
    LEFT JOIN public.photo_v3_publications p ON p.live_id=c.id
    WHERE c.kind='series' AND f.owner_series_id IS DISTINCT FROM
      CASE WHEN c.is_public_copy THEN p.draft_id ELSE c.id END) THEN
    RAISE EXCEPTION 'Series sequence must contain only owned photos; remove live photos before moving' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.photo_v3_publications p
    JOIN public.photo_v3_collections d ON d.id=p.draft_id JOIN public.photo_v3_collections l ON l.id=p.live_id
    WHERE d.is_public_copy OR d.published OR NOT l.is_public_copy OR d.kind<>l.kind OR d.kind NOT IN ('series','selected')) THEN
    RAISE EXCEPTION 'Invalid publication mapping' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.photo_v3_collections c WHERE c.published AND (
    NOT c.is_public_copy OR NOT EXISTS(SELECT 1 FROM public.photo_v3_publications p WHERE p.live_id=c.id)
    OR NOT EXISTS(SELECT 1 FROM public.photo_v3_collection_photos m WHERE m.collection_id=c.id)
    OR NOT EXISTS(SELECT 1 FROM public.photo_v3_collection_photos m WHERE m.collection_id=c.id AND m.photo_id=c.cover_photo_id)
    OR EXISTS(SELECT 1 FROM public.photo_v3_collection_photos m JOIN public.photo_v3_photos f ON f.id=m.photo_id
      WHERE m.collection_id=c.id AND (f.image_width IS NULL OR f.image_height IS NULL
        OR NOT EXISTS(SELECT 1 FROM storage.objects s WHERE s.bucket_id='portfolio-v3-media' AND s.name=f.object_key)
        OR NOT EXISTS(SELECT 1 FROM storage.objects s WHERE s.bucket_id='portfolio-v3-media' AND s.name=replace(f.object_key,'/display.webp','/thumbnail.webp'))))
  )) THEN RAISE EXCEPTION 'Published sequences require a valid cover, photos and both derivatives' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION photo_v3_private.validate_series_catalog() FROM PUBLIC;
DO $$ DECLARE tab text; BEGIN
  FOREACH tab IN ARRAY ARRAY['photo_v3_photos','photo_v3_collections','photo_v3_collection_photos','photo_v3_publications'] LOOP
    EXECUTE format('CREATE CONSTRAINT TRIGGER valid_series_catalog AFTER INSERT OR UPDATE OR DELETE ON public.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION photo_v3_private.validate_series_catalog()',tab);
  END LOOP;
END $$;

-- An upload becomes owned and enters its draft sequence in the same transaction.
CREATE FUNCTION photo_v3_private.append_upload() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.owner_series_id=OLD.owner_series_id THEN RETURN NEW; END IF;
    DELETE FROM public.photo_v3_collection_photos m USING public.photo_v3_collections c
      WHERE c.id=m.collection_id AND c.kind='series' AND m.photo_id=NEW.id;
    UPDATE public.photo_v3_collections SET cover_photo_id=CASE WHEN cover_photo_id=NEW.id THEN NULL ELSE cover_photo_id END,
      updated_at=clock_timestamp() WHERE id=OLD.owner_series_id;
  END IF;
  INSERT INTO public.photo_v3_collection_photos(collection_id,photo_id,position)
    SELECT NEW.owner_series_id,NEW.id,coalesce(max(position)+1,0)
    FROM public.photo_v3_collection_photos WHERE collection_id=NEW.owner_series_id;
  UPDATE public.photo_v3_collections SET updated_at=clock_timestamp() WHERE id=NEW.owner_series_id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION photo_v3_private.append_upload() FROM PUBLIC;
CREATE TRIGGER append_owned_upload AFTER INSERT OR UPDATE OF owner_series_id ON public.photo_v3_photos
  FOR EACH ROW EXECUTE FUNCTION photo_v3_private.append_upload();

CREATE FUNCTION photo_v3_private.guard_photo_move() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
  IF NEW.owner_series_id IS DISTINCT FROM OLD.owner_series_id AND photo_v3_private.photo_visible(OLD.id) THEN
    RAISE EXCEPTION 'Publish its removal or unpublish its series before moving' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION photo_v3_private.guard_photo_move() FROM PUBLIC;
CREATE TRIGGER guard_owned_photo_move BEFORE UPDATE OF owner_series_id ON public.photo_v3_photos
  FOR EACH ROW EXECUTE FUNCTION photo_v3_private.guard_photo_move();

DO $$ DECLARE predicate text; BEGIN
  SELECT qual INTO STRICT predicate FROM pg_policies WHERE schemaname='public' AND tablename='photo_v3_photos'
    AND policyname='Content admin can manage photo_v3_photos' AND cmd='ALL' AND roles=ARRAY['authenticated']::name[];
  IF predicate IS NULL OR predicate !~ 'auth\.uid\(' OR predicate ~* '\m(true|or)\M' THEN
    RAISE EXCEPTION 'Expected verified admin policy'; END IF;
  EXECUTE format($def$
    CREATE FUNCTION public.photo_v3_move_photo(p_photo_id uuid,p_series_id uuid,p_expected_updated_at timestamptz)
    RETURNS timestamptz LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $body$
    DECLARE photo public.photo_v3_photos%%ROWTYPE; revision timestamptz;
    BEGIN
      IF NOT coalesce((%s),false) THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
      PERFORM pg_advisory_xact_lock(306260,3);
      SELECT * INTO photo FROM public.photo_v3_photos WHERE id=p_photo_id FOR UPDATE;
      IF NOT FOUND OR photo.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        RAISE EXCEPTION 'Photo changed; reload before moving' USING ERRCODE='40001'; END IF;
      IF photo_v3_private.photo_visible(p_photo_id) THEN
        RAISE EXCEPTION 'Publish its removal or unpublish its series before moving' USING ERRCODE='23514'; END IF;
      IF NOT EXISTS(SELECT 1 FROM public.photo_v3_collections WHERE id=p_series_id AND kind='series' AND NOT is_public_copy AND NOT published) THEN
        RAISE EXCEPTION 'Choose an editable series' USING ERRCODE='23514'; END IF;
      -- Ownership triggers move draft memberships and clear inactive snapshots.
      UPDATE public.photo_v3_photos SET owner_series_id=p_series_id WHERE id=p_photo_id RETURNING updated_at INTO revision;
      RETURN revision;
    END $body$;
  $def$,predicate);
  EXECUTE format($def$
    CREATE FUNCTION public.photo_v3_delete_series(p_series_id uuid,p_expected_updated_at timestamptz)
    RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $body$
    DECLARE draft public.photo_v3_collections%%ROWTYPE; live uuid;
    BEGIN
      IF NOT coalesce((%s),false) THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
      PERFORM pg_advisory_xact_lock(306260,3);
      SELECT * INTO draft FROM public.photo_v3_collections WHERE id=p_series_id FOR UPDATE;
      IF NOT FOUND OR draft.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        RAISE EXCEPTION 'Series changed; reload before deleting' USING ERRCODE='40001'; END IF;
      IF draft.kind<>'series' OR draft.is_public_copy OR draft.published
        OR EXISTS(SELECT 1 FROM public.photo_v3_photos WHERE owner_series_id=p_series_id)
        OR EXISTS(SELECT 1 FROM public.photo_v3_publications p JOIN public.photo_v3_collections c ON c.id=p.live_id WHERE p.draft_id=p_series_id AND c.published)
      THEN RAISE EXCEPTION 'Unpublish and move or delete owned photos before deleting the series' USING ERRCODE='23514'; END IF;
      SELECT live_id INTO live FROM public.photo_v3_publications WHERE draft_id=p_series_id;
      DELETE FROM public.photo_v3_publications WHERE draft_id=p_series_id;
      DELETE FROM public.photo_v3_collections WHERE id IN (p_series_id,live);
    END $body$;
  $def$,predicate);
END $$;
REVOKE ALL ON FUNCTION public.photo_v3_move_photo(uuid,uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.photo_v3_move_photo(uuid,uuid,timestamptz) TO authenticated;
GRANT DELETE ON public.photo_v3_publications TO authenticated;
REVOKE ALL ON FUNCTION public.photo_v3_delete_series(uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.photo_v3_delete_series(uuid,timestamptz) TO authenticated;

CREATE FUNCTION photo_v3_private.guard_series_deletion() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
  IF OLD.published OR EXISTS(SELECT 1 FROM public.photo_v3_photos WHERE owner_series_id=OLD.id) THEN
    RAISE EXCEPTION 'Unpublish and move or delete owned photos before deleting the series' USING ERRCODE='23514';
  END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION photo_v3_private.guard_series_deletion() FROM PUBLIC;
CREATE TRIGGER guard_series_deletion BEFORE DELETE ON public.photo_v3_collections
  FOR EACH ROW EXECUTE FUNCTION photo_v3_private.guard_series_deletion();

-- Explicit photo deletion remains available, including deletion of a live cover.
-- Repair the cover and hide an emptied snapshot in that same transaction.
CREATE FUNCTION photo_v3_private.prepare_photo_deletion() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
  UPDATE public.photo_v3_collections c SET
    cover_photo_id=CASE WHEN c.cover_photo_id=OLD.id THEN (
      SELECT m.photo_id FROM public.photo_v3_collection_photos m
      WHERE m.collection_id=c.id AND m.photo_id<>OLD.id ORDER BY m.position LIMIT 1
    ) ELSE c.cover_photo_id END,
    published=c.published AND EXISTS(SELECT 1 FROM public.photo_v3_collection_photos m
      WHERE m.collection_id=c.id AND m.photo_id<>OLD.id)
  WHERE EXISTS(SELECT 1 FROM public.photo_v3_collection_photos m WHERE m.collection_id=c.id AND m.photo_id=OLD.id);
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION photo_v3_private.prepare_photo_deletion() FROM PUBLIC;
CREATE TRIGGER prepare_owned_photo_deletion BEFORE DELETE ON public.photo_v3_photos
  FOR EACH ROW EXECUTE FUNCTION photo_v3_private.prepare_photo_deletion();
COMMIT;
