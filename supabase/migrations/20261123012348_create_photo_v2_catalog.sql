-- Independent v2 metadata catalog plus a private, one-time snapshot of v1 rows.
-- There are NO cross-catalog foreign keys, triggers, or ongoing synchronization.
-- R2 object keys are copied as references; image files are not changed or copied.
DO $migration$
DECLARE
  admin_predicate text;
  target_table text;
  source_photo_count bigint;
  source_bundle_count bigint;
  source_member_count bigint;
BEGIN
  PERFORM pg_catalog.set_config('lock_timeout', '5s', true);
  LOCK TABLE public.photos, public.bundles, public.bundle_photos IN SHARE MODE;

  IF pg_catalog.to_regnamespace('photo_backup_before_v2') IS NOT NULL
    OR pg_catalog.to_regclass('public.photo_v2_photos') IS NOT NULL
    OR pg_catalog.to_regclass('public.photo_v2_collections') IS NOT NULL
    OR pg_catalog.to_regclass('public.photo_v2_collection_photos') IS NOT NULL
  THEN
    RAISE EXCEPTION 'V2 catalog or backup already exists; refusing to overwrite it';
  END IF;

  SELECT qual INTO STRICT admin_predicate FROM pg_catalog.pg_policies
  WHERE schemaname = 'public' AND tablename = 'photos'
    AND policyname = 'Admin can read all photos' AND cmd = 'SELECT'
    AND roles = ARRAY['authenticated']::name[] AND permissive = 'PERMISSIVE';

  IF admin_predicate IS NULL OR admin_predicate !~ 'auth\.uid\('
    OR admin_predicate !~ '[0-9a-fA-F]{8}-[0-9a-fA-F-]{27}'
    OR admin_predicate ~* '\m(true|or)\M'
    OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies
      WHERE schemaname = 'public' AND tablename = 'bundles'
        AND policyname = 'Content admin can insert bundles'
        AND cmd = 'INSERT' AND with_check = admin_predicate
        AND roles = ARRAY['authenticated']::name[]
    )
  THEN
    RAISE EXCEPTION 'Apply and verify the bundle hardening migration first';
  END IF;

  -- Metadata snapshot only, not a replacement for a full managed database backup.
  -- RLS without application policies and revoked privileges protect these rows
  -- even if someone later exposes this schema through the Data API.
  CREATE SCHEMA photo_backup_before_v2;
  REVOKE ALL ON SCHEMA photo_backup_before_v2 FROM PUBLIC, anon, authenticated;
  CREATE TABLE photo_backup_before_v2.photos AS TABLE public.photos;
  CREATE TABLE photo_backup_before_v2.bundles AS TABLE public.bundles;
  CREATE TABLE photo_backup_before_v2.bundle_photos AS TABLE public.bundle_photos;
  REVOKE ALL ON ALL TABLES IN SCHEMA photo_backup_before_v2
    FROM PUBLIC, anon, authenticated;
  ALTER TABLE photo_backup_before_v2.photos ENABLE ROW LEVEL SECURITY;
  ALTER TABLE photo_backup_before_v2.bundles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE photo_backup_before_v2.bundle_photos ENABLE ROW LEVEL SECURITY;

  CREATE TABLE public.photo_v2_photos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    object_key text NOT NULL UNIQUE,
    title text NOT NULL,
    date_taken date NOT NULL,
    categories text[] NOT NULL DEFAULT '{}',
    tags text[] NOT NULL DEFAULT '{}',
    alt_text text NOT NULL,
    description text,
    location text,
    image_width integer CHECK (image_width > 0),
    image_height integer CHECK (image_height > 0),
    focus_x real CHECK (focus_x BETWEEN 0 AND 1),
    focus_y real CHECK (focus_y BETWEEN 0 AND 1),
    published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT photo_v2_focus_pair CHECK ((focus_x IS NULL) = (focus_y IS NULL)),
    CONSTRAINT photo_v2_dimension_pair CHECK ((image_width IS NULL) = (image_height IS NULL))
  );

  CREATE TABLE public.photo_v2_collections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    description text,
    kind text NOT NULL CHECK (kind IN ('selected', 'series', 'notebook')),
    cover_photo_id uuid REFERENCES public.photo_v2_photos(id) ON DELETE SET NULL,
    sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    published boolean NOT NULL DEFAULT false,
    date_taken date,
    location_name text,
    categories text[] NOT NULL DEFAULT '{}',
    legacy_bundle_id text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX photo_v2_one_published_selection
    ON public.photo_v2_collections(kind) WHERE kind = 'selected' AND published;
  CREATE INDEX photo_v2_collection_cover ON public.photo_v2_collections(cover_photo_id);

  CREATE TABLE public.photo_v2_collection_photos (
    collection_id uuid NOT NULL REFERENCES public.photo_v2_collections(id) ON DELETE CASCADE,
    photo_id uuid NOT NULL REFERENCES public.photo_v2_photos(id) ON DELETE CASCADE,
    position integer NOT NULL CHECK (position >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, photo_id),
    CONSTRAINT photo_v2_collection_position_key UNIQUE (collection_id, position)
      DEFERRABLE INITIALLY IMMEDIATE
  );
  CREATE INDEX photo_v2_member_photo ON public.photo_v2_collection_photos(photo_id);

  FOR target_table IN SELECT unnest(ARRAY[
    'photo_v2_photos', 'photo_v2_collections', 'photo_v2_collection_photos'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    -- Override broad default grants for this new application surface.
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', target_table);
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', target_table);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', target_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
      'Content admin can manage ' || target_table, target_table, admin_predicate, admin_predicate
    );
  END LOOP;

  CREATE POLICY "Public can read published v2 photos"
    ON public.photo_v2_photos FOR SELECT TO anon, authenticated USING (published = true);
  CREATE POLICY "Public can read published v2 collections"
    ON public.photo_v2_collections FOR SELECT TO anon, authenticated USING (published = true);
  CREATE POLICY "Public can read published v2 collection members"
    ON public.photo_v2_collection_photos FOR SELECT TO anon, authenticated
    USING (
      EXISTS (SELECT 1 FROM public.photo_v2_collections c
              WHERE c.id = photo_v2_collection_photos.collection_id AND c.published = true)
      AND EXISTS (SELECT 1 FROM public.photo_v2_photos p
                  WHERE p.id = photo_v2_collection_photos.photo_id AND p.published = true)
    );

  -- Preserve each photo's UUID, slug, metadata, and original publication state.
  -- Global insertion rank is retained in the private snapshot, not reused as
  -- editorial ordering: positions belong to each independent collection in v2.
  INSERT INTO public.photo_v2_photos (
    id, slug, object_key, title, date_taken, categories, alt_text, description,
    location, image_width, image_height, published, created_at, updated_at
  ) SELECT id, slug, object_key, title, date_taken, categories, alt_text, description,
           location, image_width, image_height, published, created_at, updated_at
    FROM public.photos;

  -- Imported groupings start as drafts: they are material for the new edit,
  -- not an automatic decision to publish every old bundle as a flagship series.
  INSERT INTO public.photo_v2_collections (
    slug, title, description, kind, sort_order, published, date_taken,
    location_name, categories, legacy_bundle_id, created_at, updated_at
  ) SELECT id, title, description, 'series',
           row_number() OVER (ORDER BY date_taken DESC NULLS LAST, id)::integer,
           false, date_taken, location_name, categories, id, created_at, updated_at
    FROM public.bundles;

  INSERT INTO public.photo_v2_collection_photos (collection_id, photo_id, position, created_at)
  SELECT c.id, p.id,
         (row_number() OVER (PARTITION BY bp.bundle_id ORDER BY bp.position, bp.photo_slug) - 1)::integer,
         bp.created_at
  FROM public.bundle_photos bp
  JOIN public.photos p ON p.slug = bp.photo_slug
  JOIN public.photo_v2_collections c ON c.legacy_bundle_id = bp.bundle_id;

  UPDATE public.photo_v2_collections c SET cover_photo_id = (
    SELECT m.photo_id FROM public.photo_v2_collection_photos m
    WHERE m.collection_id = c.id ORDER BY m.position LIMIT 1
  );
  INSERT INTO public.photo_v2_collections (slug, title, kind, published, sort_order)
    VALUES ('selected-work', 'Selected Work', 'selected', false, 0);

  SELECT count(*) INTO source_photo_count FROM public.photos;
  SELECT count(*) INTO source_bundle_count FROM public.bundles;
  SELECT count(*) INTO source_member_count FROM public.bundle_photos;
  IF (SELECT count(*) FROM photo_backup_before_v2.photos) <> source_photo_count
    OR (SELECT count(*) FROM photo_backup_before_v2.bundles) <> source_bundle_count
    OR (SELECT count(*) FROM photo_backup_before_v2.bundle_photos) <> source_member_count
    OR (SELECT count(*) FROM public.photo_v2_photos) <> source_photo_count
    OR (SELECT count(*) FROM public.photo_v2_collections WHERE legacy_bundle_id IS NOT NULL) <> source_bundle_count
    OR (SELECT count(*) FROM public.photo_v2_collection_photos) <> source_member_count
  THEN
    RAISE EXCEPTION 'Snapshot/import counts differ from source; rolling back entire migration';
  END IF;
-- Trigger changes only v2 timestamps. It never writes to source or backup rows.
CREATE FUNCTION public.photo_v2_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
BEGIN
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION public.photo_v2_set_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER photo_v2_photos_updated_at BEFORE UPDATE ON public.photo_v2_photos
  FOR EACH ROW EXECUTE FUNCTION public.photo_v2_set_updated_at();
CREATE TRIGGER photo_v2_collections_updated_at BEFORE UPDATE ON public.photo_v2_collections
  FOR EACH ROW EXECUTE FUNCTION public.photo_v2_set_updated_at();
CREATE TRIGGER photo_v2_members_updated_at BEFORE UPDATE ON public.photo_v2_collection_photos
  FOR EACH ROW EXECUTE FUNCTION public.photo_v2_set_updated_at();
END
$migration$;
