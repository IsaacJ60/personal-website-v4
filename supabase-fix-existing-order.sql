-- One-time script to fix existing portfolio_order gaps
-- This will renumber all photos sequentially starting from 1

WITH ranked_photos AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY portfolio_order ASC) AS new_order
  FROM photos
  WHERE portfolio_order IS NOT NULL
)
UPDATE photos
SET portfolio_order = ranked_photos.new_order
FROM ranked_photos
WHERE photos.id = ranked_photos.id;

-- Verify the fix
SELECT id, title, portfolio_order
FROM photos
ORDER BY portfolio_order ASC;
