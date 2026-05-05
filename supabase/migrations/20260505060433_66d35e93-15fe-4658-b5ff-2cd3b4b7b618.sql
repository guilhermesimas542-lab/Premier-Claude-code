DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM content_entries WHERE addon_required = 'desaltas';
  RAISE NOTICE 'Tips com addon_required=desaltas antes do backfill: %', v_count;
END $$;

UPDATE content_entries
   SET addon_required = 'multiplas_bingo',
       feature_required = 'multiplas_bingo'
 WHERE addon_required = 'desaltas';

DO $$
DECLARE v_left int; v_migrated int;
BEGIN
  SELECT count(*) INTO v_left FROM content_entries WHERE addon_required = 'desaltas';
  SELECT count(*) INTO v_migrated FROM content_entries
   WHERE addon_required = 'multiplas_bingo' AND feature_required = 'multiplas_bingo';
  IF v_left > 0 THEN
    RAISE EXCEPTION 'Backfill abort: % tips ainda com desaltas', v_left;
  END IF;
  RAISE NOTICE 'Backfill OK. Total agora com multiplas_bingo: %', v_migrated;
END $$;