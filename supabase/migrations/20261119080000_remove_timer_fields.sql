-- Remoção de campos de estimativa de tempo
ALTER TABLE tasks DROP COLUMN estimated_minutes;
ALTER TABLE homes DROP COLUMN available_minutes_per_week;
