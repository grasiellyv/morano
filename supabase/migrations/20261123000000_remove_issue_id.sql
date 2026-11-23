-- Drop unused issue_id column from shopping_items
-- The column was a leftover reference to a "issues" feature that was never shipped.
-- The check_same_home trigger and its function reference issue_id; drop them first.
DROP TRIGGER IF EXISTS check_same_home ON shopping_items;
DROP FUNCTION IF EXISTS shopping_items_check_same_home();
ALTER TABLE shopping_items DROP COLUMN IF EXISTS issue_id;
