import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function fix() {

  console.log("Checking NULL values...")

  const nullCount: any = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)
    FROM "Submission"
    WHERE "data" IS NULL
  `)

  console.log("NULL rows:", nullCount)

  console.log("Fixing NULL values...")

  await prisma.$executeRawUnsafe(`
    UPDATE "Submission"
    SET "data" = '{}'
    WHERE "data" IS NULL
  `)

  console.log("Converting column to JSONB...")

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Submission"
    ALTER COLUMN "data"
    TYPE jsonb
    USING "data"::jsonb
  `)

  console.log("Migration complete.")

}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
