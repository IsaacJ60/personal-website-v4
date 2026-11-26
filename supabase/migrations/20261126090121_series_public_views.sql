BEGIN;
-- Placement is separate from publication. Add future view keys here without
-- changing photo ownership, snapshot structure or public eligibility policies.
CREATE TABLE public.photo_v3_public_views (
  key text PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9-]*$'),
  label text NOT NULL
);
INSERT INTO public.photo_v3_public_views(key,label) VALUES ('series','Series'),('archive','Archive');
ALTER TABLE public.photo_v3_public_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.photo_v3_public_views FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.photo_v3_public_views TO anon,authenticated;
CREATE POLICY "Public can read portfolio view labels" ON public.photo_v3_public_views
  FOR SELECT TO anon,authenticated USING (true);
ALTER TABLE public.photo_v3_collections ADD COLUMN public_view text NOT NULL DEFAULT 'series'
  REFERENCES public.photo_v3_public_views(key);
CREATE INDEX photo_v3_collection_public_view ON public.photo_v3_collections(public_view);

CREATE FUNCTION public.photo_v3_publish_in_view(
  p_draft_id uuid,p_expected_updated_at timestamptz,p_public_view text
) RETURNS TABLE(public_slug text,collection_kind text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE result record;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.photo_v3_public_views WHERE key=p_public_view) THEN
    RAISE EXCEPTION 'Unknown public view' USING ERRCODE='22023';
  END IF;
  SELECT * INTO result FROM public.photo_v3_publish_draft(p_draft_id,p_expected_updated_at);
  IF result.collection_kind<>'series' THEN
    RAISE EXCEPTION 'Only series can be assigned to a public view' USING ERRCODE='22023';
  END IF;
  UPDATE public.photo_v3_collections c SET public_view=p_public_view
    FROM public.photo_v3_publications p WHERE p.draft_id=p_draft_id AND c.id=p.live_id;
  RETURN QUERY SELECT result.public_slug::text,result.collection_kind::text;
END $$;

CREATE FUNCTION public.photo_v3_save_and_publish_in_view(
  p_draft_id uuid,p_photo_ids uuid[],p_title text,p_description text,
  p_cover_photo_id uuid DEFAULT NULL,p_expected_updated_at timestamptz DEFAULT NULL,
  p_public_view text DEFAULT 'series'
) RETURNS TABLE(public_slug text,collection_kind text,saved_revision timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE revision timestamptz;
BEGIN
  revision := public.photo_v3_save_series_draft(p_draft_id,p_title,p_description,p_photo_ids,p_expected_updated_at,p_cover_photo_id);
  RETURN QUERY SELECT published.public_slug,published.collection_kind,revision
    FROM public.photo_v3_publish_in_view(p_draft_id,revision,p_public_view) published;
END $$;
REVOKE ALL ON FUNCTION public.photo_v3_publish_in_view(uuid,timestamptz,text),
  public.photo_v3_save_and_publish_in_view(uuid,uuid[],text,text,uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.photo_v3_publish_in_view(uuid,timestamptz,text),
  public.photo_v3_save_and_publish_in_view(uuid,uuid[],text,text,uuid,timestamptz,text) TO authenticated;
COMMIT;
