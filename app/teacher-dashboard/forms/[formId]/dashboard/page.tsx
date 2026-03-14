import prisma from "@/lib/prisma"
import { buildAnalytics } from "@/lib/analytics"
import ChartRenderer from "@/components/ChartRenderer"

export default async function FormDashboard({
  params,
}: {
  params: Promise<{ formId: string }>
}) {

  const { formId } = await params

  const form = await prisma.form.findUnique({
    where: { id: formId },
  })

  const submissions = await prisma.submission.findMany({
    where: { formId },
  })

  if (!form) {
    return <div>Form not found</div>
  }

  const analyticsRecord = await prisma.formAnalytics.findUnique({
    where: { formId },
  })

  const analytics = (analyticsRecord?.data as any[]) || []

  return (
    <div style={{ padding: "20px" }}>
      <h1>{form.title} Dashboard</h1>

      <p>Total Responses: {submissions.length}</p>

      <a
        href={`/api/export-form/${formId}`}
        style={{
          padding: "8px 14px",
          background: "#2563eb",
          color: "white",
          borderRadius: "6px",
          textDecoration: "none",
          marginBottom: "20px",
          display: "inline-block"
        }}
      >
        Download Excel
      </a>

      {analytics.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">
          No responses yet. Analytics will appear after the first submission.
        </div>
      ) : (
        <div style={{ marginTop: "30px" }}>
          {analytics.map((chart: any, index: number) => (
            <ChartRenderer key={index} chart={chart} />
          ))}
        </div>
      )}

    </div>
  )
}
