import prisma from "@/lib/prisma"
import { buildAnalytics } from "@/lib/analytics"
import ChartRenderer from "@/components/ChartRenderer"
import DeleteFormButton from "@/components/DeleteFormButton"

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
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{form.title} Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review response activity and exported analytics for this form.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/api/export-form/${formId}`}
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
            >
              Download Excel
            </a>
            <DeleteFormButton formId={formId} />
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
          <p className="mt-1 text-sm text-gray-500">
            A quick summary of this form&apos;s response and analytics status.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Responses</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{submissions.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Analytics Items</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{analytics.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Status</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {form.isActive ? "Active" : "Inactive"}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
            <p className="mt-1 text-sm text-gray-500">
              Visual breakdown of submission data collected for this form.
            </p>
          </div>
        </div>

        {analytics.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
            No responses yet. Analytics will appear after the first submission.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {analytics.map((chart: any, index: number) => (
              <div key={index} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <ChartRenderer chart={chart} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
