ALTER TABLE "Student" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Teacher" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';

UPDATE "Student"
SET "email" = "User"."email"
FROM "User"
WHERE "Student"."userId" = "User"."id";

UPDATE "Teacher"
SET "email" = "User"."email"
FROM "User"
WHERE "Teacher"."userId" = "User"."id";
