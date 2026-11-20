-- shopping_categories
CREATE TABLE shopping_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id uuid NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 50),
  icon text NOT NULL DEFAULT '🛒',
  sort_order int NOT NULL DEFAULT 0,
  default_slug text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shopping_categories_home_id ON shopping_categories(home_id);
ALTER TABLE shopping_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home members full access" ON shopping_categories
  USING (EXISTS (SELECT 1 FROM home_members hm
    WHERE hm.home_id = shopping_categories.home_id AND hm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM home_members hm
    WHERE hm.home_id = shopping_categories.home_id AND hm.user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON shopping_categories TO authenticated;

-- New columns on shopping_items
ALTER TABLE shopping_items
  ADD COLUMN category_id uuid REFERENCES shopping_categories(id) ON DELETE SET NULL,
  ADD COLUMN notes text CHECK (char_length(notes) <= 200),
  ADD COLUMN room_id uuid REFERENCES rooms(id) ON DELETE SET NULL;

-- Seed default categories for all homes + migrate existing items
DO $$
DECLARE
  h uuid;
  slugs  text[] := ARRAY['alimentacao','higiene','limpeza','lavanderia','bebe','pet','saude','cozinha','outros'];
  names  text[] := ARRAY['Alimentação','Higiene','Limpeza','Lavanderia','Bebê','Pet','Saúde','Cozinha','Outros'];
  icons  text[] := ARRAY['🍎','🧴','🧹','🧺','🍼','🐾','🩹','🍳','📦'];
  i int;
  new_id uuid;
  slug_map JSONB;
BEGIN
  FOR h IN SELECT id FROM homes LOOP
    slug_map := '{}'::JSONB;
    FOR i IN 1..array_length(slugs, 1) LOOP
      INSERT INTO shopping_categories(home_id, name, icon, sort_order, default_slug)
        VALUES (h, names[i], icons[i], i, slugs[i])
        RETURNING id INTO new_id;
      slug_map := jsonb_set(slug_map, ARRAY[slugs[i]], to_jsonb(new_id::text));
    END LOOP;
    -- Migrate existing items (enum casts to text in PG)
    UPDATE shopping_items
      SET category_id = (slug_map->>(category::text))::uuid
      WHERE home_id = h AND category IS NOT NULL;
  END LOOP;
END $$;

-- Drop old enum column
ALTER TABLE shopping_items DROP COLUMN category;

-- shopping_lists
CREATE TABLE shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id uuid NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shopping_lists_home_id ON shopping_lists(home_id);
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home members full access" ON shopping_lists
  USING (EXISTS (SELECT 1 FROM home_members hm
    WHERE hm.home_id = shopping_lists.home_id AND hm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM home_members hm
    WHERE hm.home_id = shopping_lists.home_id AND hm.user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON shopping_lists TO authenticated;

-- shopping_list_items
CREATE TABLE shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  category_id uuid REFERENCES shopping_categories(id) ON DELETE SET NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit shopping_unit NOT NULL DEFAULT 'un',
  notes text CHECK (char_length(notes) <= 200),
  reorder_months int CHECK (reorder_months > 0 AND reorder_months <= 24),
  last_added_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(list_id);
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home members full access" ON shopping_list_items
  USING (EXISTS (
    SELECT 1 FROM home_members hm
    JOIN shopping_lists sl ON sl.home_id = hm.home_id
    WHERE sl.id = shopping_list_items.list_id AND hm.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM home_members hm
    JOIN shopping_lists sl ON sl.home_id = hm.home_id
    WHERE sl.id = shopping_list_items.list_id AND hm.user_id = auth.uid()
  ));
GRANT SELECT, INSERT, UPDATE, DELETE ON shopping_list_items TO authenticated;
