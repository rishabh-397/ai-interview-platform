-- Run this ONLY if your database already existed before these features were added.
-- (If you do a fresh `docker compose down -v && docker compose up --build`,
--  schema.sql already includes these columns and you don't need this file.)

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);