-- Fix maintenance_items RLS: replace current_home_id pattern with home_members check,
-- consistent with shopping_items, tasks, and all other home-scoped tables.
DROP POLICY IF EXISTS "home members full access" ON maintenance_items;

CREATE POLICY "home members full access" ON maintenance_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM home_members hm
      WHERE hm.home_id = maintenance_items.home_id AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM home_members hm
      WHERE hm.home_id = maintenance_items.home_id AND hm.user_id = auth.uid()
    )
  );
