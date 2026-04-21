import { PrismaClient } from "@prisma/client"
import { FORM_TEMPLATES } from "../lib/templates"
import { buildAnalytics } from "../lib/analytics"
import { readdir } from "fs/promises"
import path from "path"

type FieldType = "text" | "number" | "checkbox" | "radio" | "select" | "textarea" | "file"

type FormField = {
  id: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
}

const prisma = new PrismaClient()

const firstNames = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Ishaan",
  "Krish",
  "Atharv",
  "Arjun",
  "Sai",
  "Reyansh",
  "Vihaan",
  "Anaya",
  "Diya",
  "Myra",
  "Kiara",
  "Aadhya",
  "Ira",
  "Meera",
  "Saanvi",
  "Anika",
  "Riya",
]

const lastNames = [
  "Patil",
  "Sharma",
  "Kulkarni",
  "Deshmukh",
  "Joshi",
  "Pawar",
  "More",
  "Jadhav",
  "Kale",
  "Ghadge",
  "Shinde",
  "Chavan",
  "Naik",
  "Rao",
  "Mishra",
  "Yadav",
  "Gupta",
  "Patel",
  "Verma",
  "Singh",
]

const specializationOptions = ["Computer", "IT", "AIML", "ENTC", "Mechanical"]
const panelOptions = ["A", "B", "C", "D"]
const batchOptions = ["2023-24", "2024-25", "2025-26", "2026-27"]
const companyOptions = ["TCS", "Infosys", "Wipro", "Accenture", "Capgemini", "Google", "Microsoft", "Amazon"]
const roleOptions = ["Intern", "SDE Intern", "Analyst", "Associate Engineer", "Research Intern", "QA Intern"]
const startupTypeOptions = ["Product", "Service", "Hybrid"]
const startupStatusOptions = ["Ideation", "Incubating", "Active", "Scaling"]
const achievementCategoryOptions = ["GATE", "NPTEL", "Hackathon", "Sports", "Cultural", "Research"]
const meetingTypeOptions = ["CR CT Meeting", "PC CC Meeting", "Committee Meeting", "Mentor Meeting"]
const keywordsOptions = [
  "AI, ML, NLP",
  "Web, Next.js, React",
  "Cloud, Docker, DevOps",
  "Security, Networks",
  "Data, Analytics, BI",
  "Embedded, IoT",
]

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDateWithinDays(days: number) {
  const now = Date.now()
  const offsetDays = randomInt(0, days)
  const date = new Date(now - offsetDays * 24 * 60 * 60 * 1000)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function randomLpa(min = 3.2, max = 22.5) {
  const value = Math.random() * (max - min) + min
  return `${value.toFixed(1)} LPA`
}

function randomSubset<T>(arr: T[]) {
  const chosen = arr.filter(() => Math.random() > 0.5)
  return chosen.length ? chosen : [randomFrom(arr)]
}

function buildPerson(seed: string) {
  const firstName = randomFrom(firstNames)
  const lastName = randomFrom(lastNames)
  const fullName = `${firstName} ${lastName}`
  const emailHandle = `${firstName}.${lastName}.${seed}`.toLowerCase()
  return {
    fullName,
    email: `${emailHandle}@college.edu`,
    contact: `9${randomInt(100000000, 999999999)}`,
  }
}

function normalizeLabel(label: string) {
  return label.toLowerCase().replace(/\s+/g, " ").trim()
}

function valueForField(field: FormField, person: ReturnType<typeof buildPerson>, fileUrl: string) {
  const label = normalizeLabel(field.label)

  if (field.type === "select" || field.type === "radio") {
    if (field.options?.length) return randomFrom(field.options)
    return "N/A"
  }

  if (field.type === "checkbox") {
    if (field.options?.length) return randomSubset(field.options)
    return []
  }

  if (field.type === "number") {
    if (label.includes("budget") || label.includes("revenue")) return randomInt(10000, 750000)
    if (label.includes("duration") && label.includes("week")) return randomInt(2, 24)
    if (label.includes("attendance")) return randomInt(60, 98)
    if (label.includes("cgpa")) return Number((Math.random() * 4 + 6).toFixed(2))
    if (label.includes("backlog")) return randomInt(0, 3)
    return randomInt(1, 10)
  }

  if (field.type === "file") {
    return fileUrl
  }

  if (field.type === "textarea") {
    if (label.includes("abstract")) return `This submission covers a concise abstract for ${randomFrom(keywordsOptions)}.`
    if (label.includes("keyword")) return randomFrom(keywordsOptions)
    if (label.includes("suggestion") || label.includes("feedback")) return "More practical examples and interactive sessions would be helpful."
    if (label.includes("mom") || label.includes("points")) return "Reviewed agenda, action items assigned, and next review timeline finalized."
    if (label.includes("details")) return `${field.label}: ${randomFrom(["Well executed", "Needs follow-up", "Completed successfully"])}`.trim()
    return `${field.label} entry for academic reporting.`
  }

  if (label === "name" || label.includes("student name") || label.includes("full name")) return person.fullName
  if (label.includes("email")) return person.email
  if (label.includes("contact") || label.includes("phone")) return person.contact

  if (label.includes("prn") || label.includes("erp")) {
    return `PRN${randomInt(100000, 999999)}`
  }

  if (label.includes("academic year")) {
    return randomFrom(batchOptions)
  }

  if (label.includes("year") && !label.includes("academic year")) {
    return String(randomInt(1, 4))
  }

  if (label.includes("batch")) {
    return randomFrom(batchOptions)
  }

  if (label.includes("semester")) {
    return String(randomInt(1, 8))
  }

  if (label.includes("specialisation") || label.includes("specialization")) {
    return randomFrom(specializationOptions)
  }

  if (label.includes("panel")) {
    return randomFrom(panelOptions)
  }

  if (label.includes("company") || label.includes("organization")) {
    return randomFrom(companyOptions)
  }

  if (label.includes("role") || label.includes("domain") || label.includes("job role")) {
    return randomFrom(roleOptions)
  }

  if (label.includes("meeting type")) {
    return randomFrom(meetingTypeOptions)
  }

  if (label.includes("startup type") || label === "type") {
    return randomFrom(startupTypeOptions)
  }

  if (label.includes("status")) {
    if (label.includes("placement")) return randomFrom(["Placed", "Eligible", "Not Eligible"])
    if (label.includes("internship")) return randomFrom(["Ongoing", "Completed"])
    if (label.includes("patent") || label.includes("copyright")) return randomFrom(["Filed", "Granted", "Under Review"])
    if (label.includes("startup")) return randomFrom(startupStatusOptions)
    return randomFrom(["Active", "In Progress", "Completed"])
  }

  if (label.includes("category")) {
    return randomFrom(achievementCategoryOptions)
  }

  if (label.includes("placement type")) {
    return randomFrom(["On-campus", "Off-campus"])
  }

  if (label.includes("internship mode")) {
    return randomFrom(["Onsite", "Remote", "Hybrid"])
  }

  if (label.includes("paper published")) {
    return randomFrom(["Yes", "No"])
  }

  if (label.includes("score")) {
    return String(randomInt(250, 780))
  }

  if (label.includes("package") || label.includes("ctc") || label.includes("salary")) {
    return randomLpa()
  }

  if (label.includes("stipend")) {
    return String(randomInt(5000, 50000))
  }

  if (label.includes("budget")) {
    return String(randomInt(10000, 300000))
  }

  if (label.includes("revenue")) {
    return String(randomInt(15000, 500000))
  }

  if (label.includes("duration")) {
    return String(randomInt(1, 12))
  }

  if (label.includes("attendance")) {
    return String(randomInt(60, 98))
  }

  if (label.includes("cgpa")) {
    return Number((Math.random() * 4 + 6).toFixed(2)).toString()
  }

  if (label.includes("backlog")) {
    return String(randomInt(0, 3))
  }

  if (label.includes("achievement type")) {
    return randomFrom(["Winner", "Finalist", "Participation", "Certification"])
  }

  if (label.includes("title")) {
    return `${field.label} ${randomInt(1, 200)}`
  }

  if (label.includes("start date") || label.includes("end date") || label.includes("offer date") || label.includes("date")) {
    return randomDateWithinDays(120)
  }

  if (label.includes("link") || label.includes("upload") || label.includes("document") || label.includes("report") || label.includes("evidence") || label.includes("poster") || label.includes("website")) {
    return "https://example.com"
  }

  return `${field.label} ${randomInt(1, 999)}`
}

async function getUploadUrls() {
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads")
    const files = await readdir(uploadDir)
    const urls = files.filter(Boolean).map((file) => `/uploads/${file}`)
    return urls.length ? urls : ["/uploads/mock.pdf"]
  } catch {
    return ["/uploads/mock.pdf"]
  }
}

async function resolveTargetTeacherId() {
  const envTeacherEmail = process.env.TEACHER_EMAIL?.trim()
  if (envTeacherEmail) {
    const byEmail = await prisma.teacher.findUnique({ where: { email: envTeacherEmail } })
    if (byEmail) return byEmail.id
  }

  const latestForm = await prisma.form.findFirst({ orderBy: { createdAt: "desc" }, select: { teacherId: true } })
  if (latestForm?.teacherId) return latestForm.teacherId

  const fallback = await prisma.teacher.findUnique({ where: { email: "teacher@test.com" } })
  if (fallback) return fallback.id

  const first = await prisma.teacher.findFirst({ select: { id: true } })
  if (!first) {
    console.error("No teacher accounts found. Run prisma seed first.")
    process.exit(1)
  }
  return first.id
}

async function main() {
  const teacherId = await resolveTargetTeacherId()
  const uploadUrls = await getUploadUrls()

  const results: { title: string; formId: string }[] = []

  for (const template of FORM_TEMPLATES) {
    const fields = template.fields as unknown as FormField[]

    const existing = await prisma.form.findFirst({
      where: { teacherId, title: template.title },
      select: { id: true },
    })

    const form = existing
      ? await prisma.form.update({
          where: { id: existing.id },
          data: {
            description: template.description,
            fields: JSON.stringify(fields),
            isActive: true,
          },
        })
      : await prisma.form.create({
          data: {
            title: template.title,
            description: template.description,
            fields: JSON.stringify(fields),
            teacherId,
            isActive: true,
          },
        })

    await prisma.formAnalytics.deleteMany({ where: { formId: form.id } })
    await prisma.submission.deleteMany({ where: { formId: form.id } })

    for (let i = 0; i < 50; i++) {
      const person = buildPerson(`${template.id}-${i + 1}`)
      const fileUrl = randomFrom(uploadUrls)
      const data: Record<string, unknown> = {}

      for (const field of fields) {
        data[field.id] = valueForField(field, person, fileUrl)
      }

      await prisma.submission.create({
        data: {
          formId: form.id,
          studentName: person.fullName,
          studentEmail: person.email,
          studentRoll: `TMP-${template.id}-${String(i + 1).padStart(3, "0")}`,
          data: data as any,
        },
      })
    }

    const submissions = await prisma.submission.findMany({ where: { formId: form.id } })
    const analytics = buildAnalytics(fields as any, submissions as any, form.title)

    await prisma.formAnalytics.upsert({
      where: { formId: form.id },
      update: { data: analytics as any },
      create: { formId: form.id, data: analytics as any },
    })

    results.push({ title: form.title, formId: form.id })
  }

  console.log(`✅ Published and seeded ${results.length} template forms (50 submissions each).`)
  for (const result of results) {
    console.log(`- ${result.title}: ${result.formId}`)
  }
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
