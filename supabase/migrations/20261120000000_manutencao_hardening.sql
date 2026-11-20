-- =============================================================================
-- MORANO — Manutenção: hardening de segurança e consistência
-- Corrige: GRANT ALL → por coluna, ON DELETE SET NULL em created_by,
-- trigger de mesma casa para room_id, e índices.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Grants por coluna (revoga o GRANT ALL da migration anterior)
-- -----------------------------------------------------------------------------
REVOKE ALL ON maintenance_items FROM authenticated;
GRANT SELECT ON maintenance_items TO authenticated;
GRANT INSERT (home_id, room_id, title, description, notes, created_by) ON maintenance_items TO authenticated;
GRANT UPDATE (room_id, title, description, notes, status, resolved_at) ON maintenance_items TO authenticated;
GRANT DELETE ON maintenance_items TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. FK created_by → ON DELETE SET NULL (alinha com home_issues e demais tabelas)
-- -----------------------------------------------------------------------------
ALTER TABLE maintenance_items
  DROP CONSTRAINT maintenance_items_created_by_fkey,
  ADD CONSTRAINT maintenance_items_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE maintenance_items ALTER COLUMN created_by DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. Trigger de consistência de casa para room_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_maintenance_item_same_home()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.room_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM rooms WHERE id = NEW.room_id AND home_id = NEW.home_id
    ) THEN
      RAISE EXCEPTION 'room does not belong to the same home';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintenance_items_check_same_home
  BEFORE INSERT OR UPDATE ON maintenance_items
  FOR EACH ROW EXECUTE FUNCTION check_maintenance_item_same_home();

REVOKE EXECUTE ON FUNCTION check_maintenance_item_same_home() FROM public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Índices
-- -----------------------------------------------------------------------------
CREATE INDEX ON maintenance_items(home_id);
CREATE INDEX ON maintenance_items(room_id) WHERE room_id IS NOT NULL;
