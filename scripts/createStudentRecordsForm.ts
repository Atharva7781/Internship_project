import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"
import { buildAnalytics } from "../lib/analytics"

type FieldType = "text" | "number" | "checkbox" | "radio" | "select" | "textarea"

interface FormField {
  id: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
}

const prisma = new PrismaClient()

const teacherEmail = "atharv@gmail.com"
const title = "Student Academic and Placement Records"
const description =
  "Structured student dataset covering academic details, attendance, skills, internship experience, and placement readiness."

const fields: FormField[] = [
  { id: "student-full-name", label: "Full Name", type: "text", required: true },
  { id: "student-roll-number", label: "Roll Number", type: "text", required: true },
  { id: "student-email", label: "Email", type: "text", required: true },
  { id: "student-phone", label: "Phone Number", type: "text", required: true },
  { id: "student-department", label: "Department", type: "select", required: true, options: ["Computer", "IT", "AIML", "ENTC", "Mechanical"] },
  { id: "student-year", label: "Year", type: "select", required: true, options: ["1", "2", "3", "4"] },
  { id: "student-division", label: "Division", type: "select", required: true, options: ["A", "B", "C"] },
  { id: "student-cgpa", label: "CGPA", type: "number", required: true },
  { id: "student-backlogs", label: "Backlogs", type: "number", required: true },
  { id: "student-attendance", label: "Attendance (%)", type: "number", required: true },
  { id: "student-skills", label: "Skills", type: "text", required: false },
  { id: "student-internship", label: "Internship Experience", type: "select", required: true, options: ["Yes", "No"] },
  { id: "student-placement-status", label: "Placement Status", type: "select", required: true, options: ["Not Eligible", "Eligible", "Placed"] },
]

const firstNames = [
  "Aarav", "Vivaan", "Aditya", "Ishaan", "Krish", "Atharv", "Arjun", "Sai", "Reyansh", "Vihaan",
  "Anaya", "Diya", "Myra", "Kiara", "Aadhya", "Ira", "Meera", "Saanvi", "Anika", "Riya",
]

const lastNames = [
  "Patil", "Sharma", "Kulkarni", "Deshmukh", "Joshi", "Pawar", "More", "Jadhav", "Kale", "Ghadge",
  "Shinde", "Chavan", "Naik", "Rao", "Mishra", "Yadav", "Gupta", "Patel", "Verma", "Singh",
]

const departments = ["Computer", "IT", "AIML", "ENTC", "Mechanical"]
const divisions = ["A", "B", "C"]
const skillSets = [
  "Java, SQL, DSA",
  "Python, Machine Learning, Pandas",
  "React, Node.js, MongoDB",
  "C++, OOP, Problem Solving",
  "JavaScript, TypeScript, Next.js",
  "Power BI, Excel, SQL",
  "Embedded C, Arduino, IoT",
  "Figma, UI Design, HTML/CSS",
  "Data Structures, DBMS, OS",
  "Cloud, Docker, Git",
]

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, precision = 2) {
  const value = Math.random() * (max - min) + min
  return Number(value.toFixed(precision))
}

function buildStudent(index: number) {
  const firstName = randomFrom(firstNames)
  const lastName = randomFrom(lastNames)
  const fullName = `${firstName} ${lastName}`
  const year = String(randomInt(1, 4))
  const department = randomFrom(departments)
  const division = randomFrom(divisions)
  const cgpa = randomFloat(5.8, 9.8)
  const backlogs = cgpa >= 8 ? randomInt(0, 1) : randomInt(0, 3)
  const attendance = randomFloat(62, 98)
  const internship = Number(year) >= 3 && Math.random() > 0.35 ? "Yes" : "No"

  let placementStatus = "Not Eligible"
  if (Number(year) >= 4 && cgpa >= 7.5 && backlogs === 0) {
    placementStatus = Math.random() > 0.45 ? "Placed" : "Eligible"
  } else if (Number(year) >= 3 && cgpa >= 6.8 && backlogs <= 1) {
    placementStatus = "Eligible"
  }

  const rollNumber = `STU${2026}${String(index + 1).padStart(3, "0")}`
  const emailHandle = `${firstName}.${lastName}.${index + 1}`.toLowerCase()
  const email = `${emailHandle}@college.edu`
  const phone = `9${randomInt(100000000, 999999999)}`

  return {
    studentName: fullName,
    studentEmail: email,
    studentRoll: rollNumber,
    data: {
      "student-full-name": fullName,
      "student-roll-number": rollNumber,
      "student-email": email,
      "student-phone": phone,
      "student-department": department,
      "student-year": year,
      "student-division": division,
      "student-cgpa": cgpa,
      "student-backlogs": backlogs,
      "student-attendance": attendance,
      "student-skills": randomFrom(skillSets),
      "student-internship": internship,
      "student-placement-status": placementStatus,
    },
  }
}

async function main() {
  const teacher = await prisma.teacher.findUnique({ where: { email: teacherEmail } })

  if (!teacher) {
    console.error(`Teacher user not found for email: ${teacherEmail}. Run prisma seed first.`)
    process.exit(1)
  }

  const existing = await prisma.form.findFirst({
    where: { teacherId: teacher.id, title },
  })

  const form = existing
    ? await prisma.form.update({
        where: { id: existing.id },
        data: {
          description,
          fields: JSON.stringify(fields),
          isActive: true,
        },
      })
    : await prisma.form.create({
        data: {
          title,
          description,
          fields: JSON.stringify(fields),
          teacherId: teacher.id,
          isActive: true,
        },
      })

  await prisma.formAnalytics.deleteMany({ where: { formId: form.id } })
  await prisma.submission.deleteMany({ where: { formId: form.id } })

  const submissions = Array.from({ length: 50 }, (_, index) => buildStudent(index))

  for (const submission of submissions) {
    await prisma.submission.create({
      data: {
        formId: form.id,
        studentName: submission.studentName,
        studentEmail: submission.studentEmail,
        studentRoll: submission.studentRoll,
        data: submission.data as any,
      },
    })
  }

  const latestSubmissions = await prisma.submission.findMany({ where: { formId: form.id } })
  const analytics = buildAnalytics(fields as any, latestSubmissions as any)

  await prisma.formAnalytics.upsert({
    where: { formId: form.id },
    update: { data: analytics as any },
    create: {
      id: randomUUID(),
      formId: form.id,
      data: analytics as any,
    },
  })

  console.log(`Form ready: ${form.title}`)
  console.log(`Form ID: ${form.id}`)
  console.log(`Inserted submissions: ${latestSubmissions.length}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
