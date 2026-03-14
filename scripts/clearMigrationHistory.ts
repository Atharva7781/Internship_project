import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function clearMigrationHistory() {
  console.log("Clearing migration history...")
  
  await prisma.$executeRawUnsafe(`DELETE FROM "_prisma_migrations"`)
  
  console.log("Migration history cleared.")
}

clearMigrationHistory()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
