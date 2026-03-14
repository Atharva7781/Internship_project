import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function fixAdminUser() {
  const email = "atharv@gmail.com"
  const plainPassword = "password123"

  console.log(`Checking user: ${email}...`)

  // 1. Generate a secure hash
  const hashedPassword = await bcrypt.hash(plainPassword, 10)

  // 2. Update or Create the user
  // This ensures the password in the DB is hashed, not plain text
  const user = await prisma.teacher.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "ADMIN", // Set role to ADMIN as requested
    },
    create: {
      email,
      password: hashedPassword,
      name: "Atharv",
      role: "ADMIN",
    },
  })

  console.log("✅ User fixed successfully:")
  console.log({
    id: user.id,
    email: user.email,
    role: user.role,
    passwordHash: user.password.substring(0, 15) + "...", // Show partial hash
  })
}

fixAdminUser()
  .catch((e) => {
    console.error("❌ Error fixing user:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
