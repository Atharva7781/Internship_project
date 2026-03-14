import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { promoteTeacher } from "./actions"

export default async function AdminDashboard() {

  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/")
  }

  const teachers = await prisma.teacher.findMany({
    orderBy: {
      createdAt: "desc"
    }
  })

  return (
    <div style={{ padding: "20px" }}>
      <h1>Admin Dashboard</h1>

      <h2>All Teachers</h2>

      <ul>
        {teachers.map((teacher) => (
          <li key={teacher.id}>
            {teacher.email} — {teacher.role}
            {teacher.role !== "ADMIN" && (
              <form action={promoteTeacher.bind(null, teacher.id)}>
                <button type="submit">
                  Promote to ADMIN
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

    </div>
  )
}
