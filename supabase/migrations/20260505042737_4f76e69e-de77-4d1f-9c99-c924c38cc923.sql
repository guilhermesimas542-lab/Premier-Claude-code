BEGIN;

CREATE SCHEMA IF NOT EXISTS snapshots_refator_s2;

CREATE TABLE snapshots_refator_s2.users_snapshot AS
  SELECT id, email, main_tier, created_at, now() AS snapshot_at FROM users;

CREATE TABLE snapshots_refator_s2.entitlements_snapshot AS
  SELECT *, now() AS snapshot_at FROM entitlements;

CREATE TABLE snapshots_refator_s2.products_catalog_snapshot AS
  SELECT *, now() AS snapshot_at FROM products_catalog;

CREATE TABLE snapshots_refator_s2.features_snapshot AS
  SELECT *, now() AS snapshot_at FROM features;

DO $$
DECLARE v_u int; v_e int; v_p int; v_f int;
BEGIN
  SELECT count(*) INTO v_u FROM snapshots_refator_s2.users_snapshot;
  SELECT count(*) INTO v_e FROM snapshots_refator_s2.entitlements_snapshot;
  SELECT count(*) INTO v_p FROM snapshots_refator_s2.products_catalog_snapshot;
  SELECT count(*) INTO v_f FROM snapshots_refator_s2.features_snapshot;
  RAISE NOTICE 'Snapshot OK -- users=%, entitlements=%, products=%, features=%', v_u, v_e, v_p, v_f;
END $$;

COMMIT;