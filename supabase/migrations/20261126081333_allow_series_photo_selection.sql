-- Saving a series may explicitly transfer selected private photos from another
-- workspace. Keep creation, transfers and sequence replacement in one transaction.
DO $$
DECLARE definition text; marker text := 'IF (SELECT count(*) FROM public.photo_v3_photos WHERE id = ANY(p_photo_ids) AND owner_series_id = p_collection_id)';
BEGIN
  definition := pg_get_functiondef('public.photo_v3_save_series_draft(uuid,text,text,uuid[],timestamptz,uuid)'::regprocedure);
  IF position(marker IN definition)=0 THEN
    RAISE EXCEPTION 'Expected owned-series save operation before enabling photo selection';
  END IF;
  definition := replace(definition,marker,
    'UPDATE public.photo_v3_photos SET owner_series_id=p_collection_id
       WHERE id=ANY(p_photo_ids) AND owner_series_id<>p_collection_id;
     ' || marker);
  -- Existing owner-move triggers reject live photos, transfer draft memberships,
  -- clear old covers and update revisions. Any failure rolls back every transfer.
  EXECUTE definition;
END $$;
