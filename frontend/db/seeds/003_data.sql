-- Data migration SQL
-- Generated from API migration data
-- UUIDs are regenerated to maintain referential integrity
BEGIN;

-- Create temporary table to track UUID mappings (old_id -> new_uuid)
CREATE TEMP TABLE IF NOT EXISTS _uuid_mapping (
  old_id TEXT PRIMARY KEY,
  new_uuid UUID NOT NULL,
  table_name TEXT
);

-- Clean up temporary mapping table
DROP TABLE IF EXISTS _uuid_mapping;

COMMIT;
