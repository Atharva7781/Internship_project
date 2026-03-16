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

  // Sanitize the form title to remove non-ASCII characters that break the Content-Disposition header
  const sanitizedTitle = form.title.replace(/[^\x00-\x7F]/g, "").replace(/[^a-zA-Z0-9-_ ]/g, "_") || "form_export"

  return new Response(buffer, {
    headers: {
      "Content-Disposition":
        `attachment; filename="${sanitizedTitle}.xlsx"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  })
}
