-- Retroactive seed of shopping_categories for homes that have none
-- Covers homes created after the initial compras_v2 migration
DO $$
DECLARE
  h      uuid;
  slugs  text[] := ARRAY['alimentacao','higiene','limpeza','lavanderia','bebe','pet','saude','cozinha','outros'];
  names  text[] := ARRAY['Alimentação','Higiene','Limpeza','Lavanderia','Bebê','Pet','Saúde','Cozinha','Outros'];
  icons  text[] := ARRAY['🍎','🧴','🧹','🧺','🍼','🐾','🩹','🍳','📦'];
  i      int;
BEGIN
  FOR h IN
    SELECT id FROM homes
    WHERE NOT EXISTS (
      SELECT 1 FROM shopping_categories sc WHERE sc.home_id = homes.id
    )
  LOOP
    FOR i IN 1..array_length(slugs, 1) LOOP
      INSERT INTO shopping_categories(home_id, name, icon, sort_order, default_slug)
        VALUES (h, names[i], icons[i], i, slugs[i])
        ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
