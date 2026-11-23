-- Fix: grant insert/update on new columns added by compras_v2 migration
GRANT INSERT (category_id, notes, room_id) ON public.shopping_items TO authenticated;
GRANT UPDATE (category_id, notes, room_id) ON public.shopping_items TO authenticated;

-- Also seed shopping_categories for any new homes created after migrations ran
-- (trigger-based approach: use a function called on home creation is future work)
CREATE OR REPLACE FUNCTION public.seed_shopping_categories_for_home(p_home_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  slugs  text[] := ARRAY['alimentacao','higiene','limpeza','lavanderia','bebe','pet','saude','cozinha','outros'];
  names  text[] := ARRAY['Alimentação','Higiene','Limpeza','Lavanderia','Bebê','Pet','Saúde','Cozinha','Outros'];
  icons  text[] := ARRAY['🍎','🧴','🧹','🧺','🍼','🐾','🩹','🍳','📦'];
  i int;
BEGIN
  FOR i IN 1..array_length(slugs, 1) LOOP
    INSERT INTO public.shopping_categories(home_id, name, icon, sort_order, default_slug)
    VALUES (p_home_id, names[i], icons[i], i, slugs[i])
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Auto-seed categories when a new home is created
CREATE OR REPLACE FUNCTION public.handle_new_home()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.seed_shopping_categories_for_home(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_home_created ON public.homes;
CREATE TRIGGER on_home_created
  AFTER INSERT ON public.homes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_home();

-- Retroactively seed for any homes that still have no categories
DO $$
DECLARE
  h uuid;
BEGIN
  FOR h IN
    SELECT id FROM public.homes
    WHERE NOT EXISTS (
      SELECT 1 FROM public.shopping_categories sc WHERE sc.home_id = homes.id
    )
  LOOP
    PERFORM public.seed_shopping_categories_for_home(h);
  END LOOP;
END $$;
