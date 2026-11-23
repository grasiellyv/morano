-- Drop unused issue_id column from shopping_items
-- The column was a leftover reference to a "issues" feature that was never shipped.
ALTER TABLE shopping_items DROP COLUMN IF EXISTS issue_id;
