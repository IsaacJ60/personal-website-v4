-- Policy-only change for the existing photos project. No rows, grants, storage,
-- or auth accounts are changed. One DO statement makes replacement atomic even
-- when executed outside a migration runner's surrounding transaction.
DO $migration$
DECLARE
  admin_predicate text;
  target_table text;
  operation text;
  expected_policy_names text[] := ARRAY[
    'Allow admin to delete bundle_photos',
    'Allow admin to insert bundle_photos',
    'Allow admin to update bundle_photos',
    'Allow public to read bundle_photos',
    'Photos in published bundles are publicly readable',
    'Allow admin to delete bundles',
    'Allow admin to insert bundles',
    'Allow admin to update bundles',
    'Allow public to read bundles',
    'Published bundles are publicly readable'
  ];
BEGIN
  PERFORM pg_catalog.set_config('lock_timeout', '5s', true);
  LOCK TABLE public.photos, public.bundles, public.bundle_photos
    IN SHARE ROW EXCLUSIVE MODE;

  -- Fail before changing policies if the audited assumptions have drifted.
  IF (SELECT count(*) FROM pg_catalog.pg_policies
      WHERE schemaname = 'public' AND tablename IN ('bundles', 'bundle_photos')) <> 10
    OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies
      WHERE schemaname = 'public' AND tablename IN ('bundles', 'bundle_photos')
        AND (policyname <> ALL(expected_policy_names) OR permissive <> 'PERMISSIVE')
    )
  THEN
    RAISE EXCEPTION 'Bundle policies differ from audited baseline; inspect before applying';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid IN ('public.photos'::regclass, 'public.bundles'::regclass,
                  'public.bundle_photos'::regclass)
      AND NOT relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Content RLS must already be enabled';
  END IF;

  -- Reuse the existing, proven photo-admin predicate instead of embedding an
  -- environment-specific user UUID or granting access to every signed-in user.
  SELECT qual INTO STRICT admin_predicate
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public' AND tablename = 'photos'
    AND policyname = 'Admin can read all photos'
    AND cmd = 'SELECT' AND roles = ARRAY['authenticated']::name[]
    AND permissive = 'PERMISSIVE';

  IF admin_predicate IS NULL OR admin_predicate !~ 'auth\.uid\('
    OR admin_predicate !~ '[0-9a-fA-F]{8}-[0-9a-fA-F-]{27}'
    OR admin_predicate ~* '\m(true|or)\M'
    OR (SELECT count(*) FROM pg_catalog.pg_policies
        WHERE schemaname = 'public' AND tablename = 'photos'
          AND roles = ARRAY['authenticated']::name[] AND permissive = 'PERMISSIVE'
          AND (
            (policyname = 'Admin can insert photos' AND cmd = 'INSERT'
              AND with_check = admin_predicate)
            OR (policyname = 'Admin can update photos' AND cmd = 'UPDATE'
              AND qual = admin_predicate AND with_check = admin_predicate)
            OR (policyname = 'Admin can delete photos' AND cmd = 'DELETE'
              AND qual = admin_predicate)
          )) <> 3
  THEN
    RAISE EXCEPTION 'Photo admin predicates are missing or inconsistent; inspect before applying';
  END IF;

  -- Drop every audited legacy bundle policy, including the unconditional public
  -- reads. Another restrictive-looking permissive policy would not override them.
  FOR target_table IN SELECT unnest(ARRAY['bundles', 'bundle_photos']) LOOP
    FOR operation IN
      SELECT policyname FROM pg_catalog.pg_policies
      WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', operation, target_table);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
      'Content admin can read all ' || target_table, target_table, admin_predicate
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
      'Content admin can insert ' || target_table, target_table, admin_predicate
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      'Content admin can update ' || target_table, target_table, admin_predicate, admin_predicate
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
      'Content admin can delete ' || target_table, target_table, admin_predicate
    );
  END LOOP;

  CREATE POLICY "Public can read published bundles"
    ON public.bundles FOR SELECT TO anon, authenticated
    USING (published = true);

  -- A membership is public only when BOTH the series and its photo are public.
  CREATE POLICY "Public can read published bundle members"
    ON public.bundle_photos FOR SELECT TO anon, authenticated
    USING (
      EXISTS (SELECT 1 FROM public.bundles b
              WHERE b.id = bundle_photos.bundle_id AND b.published = true)
      AND EXISTS (SELECT 1 FROM public.photos p
                  WHERE p.slug = bundle_photos.photo_slug AND p.published = true)
    );
END
$migration$;
