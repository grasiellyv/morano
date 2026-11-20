CREATE TYPE maintenance_item_status AS ENUM ('pendente', 'em_andamento', 'concluido', 'cancelado');

CREATE TABLE maintenance_items (
  id           UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id      UUID                     NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  room_id      UUID                     REFERENCES rooms(id) ON DELETE SET NULL,
  title        TEXT                     NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description  TEXT,
  notes        TEXT,
  status       maintenance_item_status  NOT NULL DEFAULT 'pendente',
  created_by   UUID                     NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

ALTER TABLE maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home members full access"
  ON maintenance_items FOR ALL
  USING (
    home_id IN (SELECT current_home_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    home_id IN (SELECT current_home_id FROM profiles WHERE id = auth.uid())
  );

GRANT ALL ON maintenance_items TO authenticated;
