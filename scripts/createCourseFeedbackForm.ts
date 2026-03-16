import { PrismaClient } from "@prisma/client"

// Keep field shape consistent with app/actions.ts
type FieldType = "text" | "number" | "checkbox" | "radio" | "select" | "textarea"
interface FormField {
  id: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
}

const prisma = new PrismaClient()

async function main() {
  // Find the seeded teacher user; adjust if you use a different account
  const teacherEmail = "teacher@test.com"
  const teacher = await prisma.teacher.findUnique({ where: { email: teacherEmail } })

  if (!teacher) {
    console.error(`Teacher user not found for email: ${teacherEmail}. Run prisma seed or create the account first.`)
    process.exit(1)
  }

  const title = "Course Feedback Survey"
  const description =
    "Standardized course feedback form covering teaching quality, pace, clarity, helpful resources, and recommendations."

  // Fixed IDs match scripts/generateSubmissions.ts so synthetic data aligns
  const fields: FormField[] = [
    {
      id: "56ebe4d0-52af-4626-ba79-e446bbd4b98d",
      label: "Overall teaching quality",
      type: "radio",
      required: true,
      options: ["Excellent", "Good", "Average", "Poor"],
    },
    {
      id: "f6e01baf-f834-449c-aaad-73cdc270a9be",
      label: "Rate course content (1–5)",
      type: "number",
      required: true,
    },
    {
      id: "70a01e0a-6e93-4d4e-8512-cd99fc6a89de",
      label: "Most helpful components",
      type: "checkbox",
      required: false,
      options: ["Lectures", "Assignments", "Coding Labs", "Class Discussions", "Study Materials"],
    },
    {
      id: "874dbcd1-c64c-4a70-aa40-300a2987fd72",
      label: "Pace of course delivery",
      type: "radio",
      required: true,
      options: ["Too Slow", "Appropriate", "Too Fast"],
    },
    {
      id: "05f0e65a-5031-482a-bbd2-d46b50117f15",
      label: "Clarity of explanations",
      type: "radio",
      required: true,
      options: ["Very Clear", "Clear", "Somewhat Clear", "Not Clear"],
    },
    {
      id: "c90f871e-171c-4423-bbcc-b15a5cc7fefc",
      label: "Rate assignments difficulty (1–5)",
      type: "number",
      required: false,
    },
    {
      id: "9930cc5e-3db6-48a4-923e-2cb711c00621",
      label: "Would you recommend this course?",
      type: "radio",
      required: true,
      options: ["Yes", "Maybe", "No"],
    },
    {
      id: "71a9362a-86ca-44f2-aeac-628b564a31c6",
      label: "Any suggestions",
      type: "textarea",
      required: false,
    },
  ]

  // If a form with same title exists for this teacher, update it; else create
  const existing = await prisma.form.findFirst({
    where: { teacherId: teacher.id, title },
  })

  if (existing) {
    const updated = await prisma.form.update({
      where: { id: existing.id },
      data: {
        description,
        fields: JSON.stringify(fields),
        isActive: true,
      },
    })
    console.log("Updated existing form:", updated.id)
  } else {
    const created = await prisma.form.create({
      data: {
        title,
        description,
        fields: JSON.stringify(fields),
        teacherId: teacher.id,
        isActive: true,
      },
    })
    console.log("Created form:", created.id)
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

