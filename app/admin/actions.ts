"use server"

import prisma from "@/lib/prisma"

export async function promoteTeacher(id: string) {
  await prisma.teacher.update({
    where: { id },
    data: { role: "ADMIN" }
  })
}
