-- Give the demo user enough rows to page through: /items/snippets (3 pages),
-- /items/commands (2), /collections (2) and the Pagination Test collection (4).
-- Adds only; a no-op when the demo user does not exist; safe to run twice.
-- The dates are older than the real demo content, so that content stays on top.
-- No file or image rows: those need real objects in R2.
-- Ids are cuid-shaped ('c' + 24 lowercase hex chars), like the other data
-- migrations. prisma/seed-pagination-data.ts holds the same rows for a fresh database.

-- Collections
INSERT INTO "Collection" ("id", "name", "description", "userId", "createdAt", "updatedAt")
SELECT 'c' || substr(md5(gen_random_uuid()::text), 1, 24), c.name, 'Sample data for checking pagination', u."id", c.date, c.date
FROM (
  SELECT 'Pagination Test' AS name, TIMESTAMP '2023-12-31' AS date
  UNION ALL
  SELECT 'Pagination Sample Collection ' || lpad(n::text, 2, '0'), TIMESTAMP '2023-12-31' - n * INTERVAL '1 day'
  FROM generate_series(1, 18) AS n
) AS c
JOIN "User" u ON u."email" = 'demo@devstash.io'
WHERE NOT EXISTS (
  SELECT 1 FROM "Collection" e WHERE e."userId" = u."id" AND e."name" = c.name
);

-- Items
INSERT INTO "Item" ("id", "title", "contentType", "content", "description", "language", "userId", "typeId", "createdAt", "updatedAt")
SELECT 'c' || substr(md5(gen_random_uuid()::text), 1, 24), v.title, 'TEXT', v.content, 'Sample data for checking pagination', v.language, u."id", t."id", v.date, v.date
FROM (
  SELECT
    'Pagination sample ' || s.type_name || ' ' || lpad(n::text, 2, '0') AS title,
    format(s.template, lpad(n::text, 2, '0')) AS content,
    s.language,
    s.type_name,
    TIMESTAMP '2023-12-31' - n * INTERVAL '1 day' AS date
  FROM (VALUES
    ('snippet', 50, 'typescript', 'export const sample%s = true;'),
    ('command', 24, 'bash', 'echo "pagination sample %s"')
  ) AS s(type_name, amount, language, template)
  CROSS JOIN LATERAL generate_series(1, s.amount) AS n
) AS v
JOIN "User" u ON u."email" = 'demo@devstash.io'
JOIN "ItemType" t ON t."name" = v.type_name AND t."isSystem" = true AND t."userId" IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "Item" e WHERE e."userId" = u."id" AND e."title" = v.title
);

-- All the sample items go into the Pagination Test collection
INSERT INTO "ItemCollection" ("itemId", "collectionId")
SELECT i."id", c."id"
FROM "User" u
JOIN "Item" i ON i."userId" = u."id" AND i."title" LIKE 'Pagination sample %'
JOIN "Collection" c ON c."userId" = u."id" AND c."name" = 'Pagination Test'
WHERE u."email" = 'demo@devstash.io'
ON CONFLICT DO NOTHING;
