import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const form = await prisma.form.findFirst({
    orderBy: { createdAt: 'desc' } // Get the latest form
  });
  
  if (!form) {
    console.log("No form found");
    return;
  }

  console.log("Form ID:", form.id);
  console.log("Fields:", form.fields);
}

main()
  .finally(() => prisma.$disconnect());