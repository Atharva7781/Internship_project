import prisma from "@/lib/prisma"
import ExcelJS from "exceljs"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {

  const { formId } = await params

  const form = await prisma.form.findUnique({
    where: { id: formId }
  })

  const submissions = await prisma.submission.findMany({
    where: { formId }
  })

  if (!form) {
    return new Response("Form not found")
  }

  const fields = JSON.parse(form.fields)

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Responses")

  const headers = [
    "Name",
    "Email",
    "Roll",
    ...fields.map((f: any) => f.label)
  ]

  sheet.addRow(headers)

  submissions.forEach((s) => {

    const answers = s.data as any

    const row = [
      s.studentName,
      s.studentEmail,
      s.studentRoll,
      ...fields.map((f: any) => answers[f.id] || "")
    ]

    sheet.addRow(row)
  })

  const buffer = await workbook.xlsx.writeBuffer()

  return new Response(buffer, {
    headers: {
      "Content-Disposition":
        `attachment; filename=${form.title}.xlsx`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  })
}
