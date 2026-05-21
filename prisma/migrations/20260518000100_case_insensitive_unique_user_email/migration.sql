CREATE EXTENSION IF NOT EXISTS citext;

WITH ranked AS (
  SELECT
    id,
    email,
    lower(email) AS normalized_email,
    row_number() OVER (PARTITION BY lower(email) ORDER BY id) AS rn
  FROM "User"
)
UPDATE "User" AS u
SET email = CASE
  WHEN ranked.rn = 1 THEN ranked.normalized_email
  ELSE concat(
    'archived+',
    u.id,
    '+',
    regexp_replace(ranked.normalized_email, '[^a-z0-9]+', '-', 'g'),
    '@teachermarket.local'
  )
END
FROM ranked
WHERE u.id = ranked.id
  AND (ranked.rn > 1 OR u.email <> ranked.normalized_email);

ALTER TABLE "User"
  ALTER COLUMN "email" TYPE CITEXT
  USING "email"::citext;
