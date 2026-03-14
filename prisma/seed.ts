import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'teacher@test.com'
  const password = await bcrypt.hash('password123', 10)

  const teacher = await prisma.teacher.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,
      name: 'Test Teacher',
    },
  })
  console.log({ teacher })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
