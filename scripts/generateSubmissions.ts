import { PrismaClient } from "@prisma/client"
import { buildAnalytics } from "../lib/analytics"

const prisma = new PrismaClient()

const formId = "cmmizwyk80005v74cg5e63e7t"

const teachingOptions = ["Excellent ", "Good", "Average", "Poor"]
const paceOptions = ["Too Slow", "Appropriate", "Too Fast"]
const clarityOptions = ["Very Clear", "Clear ", "Somewhat Clear", "Not Clear"]
const recommendOptions = ["Yes", "Maybe", "No"]
const helpfulOptions = [
  "Lectures",
  "assignments",
  "Coding Labs",
  "Class Discussions",
  "Study Materials",
]

const suggestions = [
  "More practical examples would help.",
  "Great teaching style.",
  "Assignments were very useful.",
  "Course pace was perfect.",
  "Labs were extremely helpful.",
  "More coding exercises please.",
  "Slides could be improved.",
  "Very engaging lectures.",
  "Would like more industry examples.",
  "Overall a very good course.",
]

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomSubset(arr: string[]) {
  return arr.filter(() => Math.random() > 0.5)
}

async function main() {
  for (let i = 0; i < 50; i++) {
    const data = {
      "56ebe4d0-52af-4626-ba79-e446bbd4b98d": randomFrom(teachingOptions),
      "f6e01baf-f834-449c-aaad-73cdc270a9be": Math.ceil(Math.random() * 5),
      "70a01e0a-6e93-4d4e-8512-cd99fc6a89de": randomSubset(helpfulOptions),
      "874dbcd1-c64c-4a70-aa40-300a2987fd72": randomFrom(paceOptions),
      "05f0e65a-5031-482a-bbd2-d46b50117f15": randomFrom(clarityOptions),
      "c90f871e-171c-4423-bbcc-b15a5cc7fefc": Math.ceil(Math.random() * 5),
      "9930cc5e-3db6-48a4-923e-2cb711c00621": randomFrom(recommendOptions),
      "71a9362a-86ca-44f2-aeac-628b564a31c6": randomFrom(suggestions),
    }

    await prisma.submission.create({
      data: {
        formId,
        studentName: `Student ${i}`,
        studentEmail: `student${i}@college.edu`,
        studentRoll: `ROLL${1000 + i}`,
        data,
      },
    })
  }

  console.log("✅ 50 synthetic submissions created")

  // Update Analytics Cache
  console.log("Updating analytics cache...")
  const form = await prisma.form.findUnique({ where: { id: formId } })
  const submissions = await prisma.submission.findMany({ where: { formId } })
  
  if (form) {
    const fields = JSON.parse(form.fields)
    const analytics = buildAnalytics(fields, submissions)
    
    await prisma.formAnalytics.upsert({
      where: { formId },
      update: { data: analytics },
      create: {
        formId,
        data: analytics,
      },
    })
    console.log("✅ Analytics cache updated")
  }
}

main().finally(() => prisma.$disconnect())