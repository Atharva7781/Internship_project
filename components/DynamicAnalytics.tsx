"use client"

import { useMemo, useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { buildAnalytics, type Field, type Submission, type AnalyticsChart } from "@/lib/analytics"

const BAR_COLOR = "#4f46e5"
const PIE_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

type DrilldownFilter = {
  chartId: string
  chartType: AnalyticsChart["type"]
  label: string
  payload: Record<string, unknown>
  seriesKey?: string
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function parseNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const text = String(value ?? "").replace(/,/g, "")
  const match = text.match(/-?\d+(\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function parseBucketRange(bucket: string) {
  const match = bucket.match(/(-?\d+(\.\d+)?)\s*-\s*(-?\d+(\.\d+)?)/)
  if (!match) return null
  const min = Number(match[1])
  const max = Number(match[3])
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  return { min, max }
}

function toBooleanLike(value: unknown): boolean | null {
  const v = normalize(value)
  if (!v) return null
  if (["yes", "true", "placed", "recommended", "published", "active", "1"].some((x) => v === x || v.includes(x))) return true
  if (["no", "false", "not", "unplaced", "inactive", "0"].some((x) => v === x || v.includes(x))) return false
  return null
}

function matchesCategorySelection(source: unknown, selected: string) {
  const sourceNorm = normalize(source)
  const selectedNorm = normalize(selected)
  if (!selectedNorm) return false
  if (sourceNorm === selectedNorm) return true
  if (sourceNorm && (sourceNorm.includes(selectedNorm) || selectedNorm.includes(sourceNorm))) return true
  const sourceBool = toBooleanLike(source)
  const selectedBool = toBooleanLike(selectedNorm)
  if (sourceBool !== null && selectedBool !== null) return sourceBool === selectedBool
  if (selectedNorm.includes("published")) return sourceBool === !selectedNorm.includes("not")
  if (selectedNorm.includes("recommended")) return sourceBool === !selectedNorm.includes("not")
  if (selectedNorm.includes("placed")) return sourceBool === !selectedNorm.includes("not")
  return false
}

function inferFieldId(fields: Field[], chart: AnalyticsChart, preferred?: string[]) {
  const keys = [...(preferred || []), chart.xKey || "", chart.yKey || "", chart.title]
    .join(" ")
    .toLowerCase()
  const find = (tokens: string[]) => fields.find((f) => tokens.some((t) => f.label.toLowerCase().includes(t)))?.id
  if (keys.includes("package") || keys.includes("ctc") || keys.includes("salary")) return find(["package", "ctc", "salary"])
  if (keys.includes("stipend")) return find(["stipend"])
  if (keys.includes("cgpa")) return find(["cgpa", "gpa"])
  if (keys.includes("difficulty")) return find(["difficulty"])
  if (keys.includes("workload")) return find(["workload"])
  if (keys.includes("attendance")) return find(["attendance"])
  if (keys.includes("revenue")) return find(["revenue"])
  if (keys.includes("budget")) return find(["budget"])
  if (keys.includes("duration")) return find(["duration"])
  if (keys.includes("company")) return find(["company", "organization"])
  if (keys.includes("role")) return find(["role", "domain"])
  if (keys.includes("specialisation") || keys.includes("specialization")) return find(["specialisation", "specialization"])
  if (keys.includes("category")) return find(["category"])
  if (keys.includes("year")) return find(["year", "academic year"])
  if (keys.includes("batch")) return find(["batch"])
  if (keys.includes("semester")) return find(["semester"])
  if (keys.includes("type")) return find(["type", "placement type", "achievement type"])
  if (keys.includes("status")) return find(["status", "placement status"])
  if (keys.includes("published")) return find(["paper published", "published"])
  return undefined
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  )
}

function CardShell({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {meta ? <span className="text-xs text-slate-500">{meta}</span> : null}
        </div>
      </div>
      {children}
    </div>
  )
}

function BoxPlotCard({
  chart,
  activeFilter,
  onSelect,
}: {
  chart: Extract<AnalyticsChart, { type: "box" }>
  activeFilter: DrilldownFilter | null
  onSelect: (filter: DrilldownFilter) => void
}) {
  if (!chart.stats) return null
  const { min, q1, median, q3, max, count } = chart.stats
  const span = max - min || 1
  const left = ((q1 - min) / span) * 100
  const width = ((q3 - q1) / span) * 100
  const medianPos = ((median - min) / span) * 100
  const segmentDefs = [
    { id: "low", label: `Lower (Min-Q1)`, min, max: q1 },
    { id: "mid", label: `Middle (Q1-Q3)`, min: q1, max: q3 },
    { id: "high", label: `Upper (Q3-Max)`, min: q3, max },
  ]

  return (
    <CardShell title={chart.title} meta={`${count} responses`}>
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="relative h-10">
          <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-slate-300" />
          <div
            className="absolute top-1/2 h-6 -translate-y-1/2 rounded bg-indigo-200"
            style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
          />
          <div className="absolute top-1/2 h-7 w-[2px] -translate-y-1/2 bg-indigo-700" style={{ left: `${medianPos}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-700">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1">Min: {min.toFixed(2)}</span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1">Q1: {q1.toFixed(2)}</span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1">Median: {median.toFixed(2)}</span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1">Q3: {q3.toFixed(2)}</span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1">Max: {max.toFixed(2)}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {segmentDefs.map((segment) => {
            const selected =
              activeFilter?.chartId === chart.id &&
              String(activeFilter.payload.segmentId ?? "") === segment.id
            return (
              <button
                key={segment.id}
                type="button"
                onClick={() =>
                  onSelect({
                    chartId: chart.id,
                    chartType: chart.type,
                    label: `${chart.title}: ${segment.label} (${segment.min.toFixed(2)}-${segment.max.toFixed(2)})`,
                    payload: {
                      segmentId: segment.id,
                      min: segment.min,
                      max: segment.max,
                    },
                  })
                }
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  selected
                    ? "bg-indigo-700 text-white"
                    : "bg-white text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
                }`}
              >
                {segment.label}
              </button>
            )
          })}
        </div>
      </div>
    </CardShell>
  )
}

function BarOrLineCard({
  chart,
  activeFilter,
  onSelect,
}: {
  chart: Extract<AnalyticsChart, { type: "bar" | "line" | "histogram" }>
  activeFilter: DrilldownFilter | null
  onSelect: (filter: DrilldownFilter) => void
}) {
  const data = chart.data || []
  const xKey = chart.xKey
  const yKey = chart.yKey

  return (
    <CardShell title={chart.title}>
      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          {chart.type === "bar" || chart.type === "histogram" ? (
            <BarChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 64 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} angle={-20} textAnchor="end" interval={0} height={72} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={yKey} radius={[6, 6, 0, 0]}>
                {data.map((entry, idx) => {
                  const selected =
                    activeFilter?.chartId === chart.id &&
                    String(activeFilter.payload[xKey || ""] ?? "") === String(entry[xKey || ""] ?? "")
                  return (
                    <Cell
                      key={`${chart.id}-bar-${idx}`}
                      fill={selected ? "#1d4ed8" : BAR_COLOR}
                      cursor="pointer"
                      onClick={() =>
                        onSelect({
                          chartId: chart.id,
                          chartType: chart.type,
                          label: `${chart.title}: ${String(entry[xKey || ""] ?? "")}`,
                          payload: entry as Record<string, unknown>,
                        })
                      }
                    />
                  )
                })}
              </Bar>
            </BarChart>
          ) : (
            <LineChart
              data={data}
              margin={{ top: 8, right: 24, left: 8, bottom: 32 }}
              onClick={(state: unknown) => {
                const s = state as { activePayload?: Array<{ payload?: Record<string, unknown> }> } | undefined
                const payload = s?.activePayload?.[0]?.payload
                if (!payload) return
                onSelect({
                  chartId: chart.id,
                  chartType: chart.type,
                  label: `${chart.title}: ${String(payload[xKey || ""] ?? "")}`,
                  payload,
                })
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey={yKey} stroke={BAR_COLOR} strokeWidth={2} activeDot={{ r: 6, style: { cursor: "pointer" } }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </CardShell>
  )
}

function ScatterCard({
  chart,
  onSelect,
}: {
  chart: Extract<AnalyticsChart, { type: "scatter" }>
  onSelect: (filter: DrilldownFilter) => void
}) {
  return (
    <CardShell title={chart.title}>
      <div className="h-[320px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <ScatterChart margin={{ top: 8, right: 24, left: 8, bottom: 36 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey={chart.xKey} name={chart.xKey} />
            <YAxis type="number" dataKey={chart.yKey} name={chart.yKey} />
            <ZAxis range={[48, 48]} />
            <Tooltip />
            <Scatter
              data={chart.data || []}
              fill={BAR_COLOR}
              onClick={(point: Record<string, unknown>) =>
                onSelect({
                  chartId: chart.id,
                  chartType: chart.type,
                  label: `${chart.title}: (${String(point[chart.xKey || "x"])}, ${String(point[chart.yKey || "y"])})`,
                  payload: point,
                })
              }
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  )
}

function PieCard({
  chart,
  activeFilter,
  onSelect,
}: {
  chart: Extract<AnalyticsChart, { type: "pie" }>
  activeFilter: DrilldownFilter | null
  onSelect: (filter: DrilldownFilter) => void
}) {
  const data = chart.data || []
  return (
    <CardShell title={chart.title}>
      <div className="h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart>
            <Pie data={data} dataKey={chart.yKey || "value"} nameKey={chart.xKey || "label"} outerRadius={95} label>
              {data.map((entry, idx) => {
                const key = chart.xKey || "label"
                const selected =
                  activeFilter?.chartId === chart.id &&
                  String(activeFilter.payload[key] ?? "") === String(entry[key] ?? "")
                return (
                  <Cell
                    key={idx}
                    fill={selected ? "#1d4ed8" : PIE_COLORS[idx % PIE_COLORS.length]}
                    cursor="pointer"
                    onClick={() =>
                      onSelect({
                        chartId: chart.id,
                        chartType: chart.type,
                        label: `${chart.title}: ${String(entry[key] ?? "")}`,
                        payload: entry as Record<string, unknown>,
                      })
                    }
                  />
                )
              })}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  )
}

function StackedBarCard({
  chart,
  activeFilter,
  onSelect,
}: {
  chart: Extract<AnalyticsChart, { type: "stackedBar" }>
  activeFilter: DrilldownFilter | null
  onSelect: (filter: DrilldownFilter) => void
}) {
  const data = chart.data || []
  const xKey = chart.xKey || "x"
  const keys = chart.seriesKeys || []
  return (
    <CardShell title={chart.title}>
      <div className="h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 64 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} angle={-20} textAnchor="end" interval={0} height={72} />
            <YAxis />
            <Tooltip />
            <Legend />
            {keys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="s"
                fill={
                  activeFilter?.chartId === chart.id && activeFilter.seriesKey === key
                    ? "#1d4ed8"
                    : PIE_COLORS[idx % PIE_COLORS.length]
                }
                onClick={(entry: { payload?: Record<string, unknown> }) => {
                  const payload = entry?.payload
                  if (!payload) return
                  onSelect({
                    chartId: chart.id,
                    chartType: chart.type,
                    label: `${chart.title}: ${String(payload[xKey] ?? "")} / ${key}`,
                    payload,
                    seriesKey: key,
                  })
                }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  )
}

function FunnelCard({
  chart,
  activeFilter,
  onSelect,
}: {
  chart: Extract<AnalyticsChart, { type: "funnel" }>
  activeFilter: DrilldownFilter | null
  onSelect: (filter: DrilldownFilter) => void
}) {
  const data = chart.data || []
  const stageKey = chart.xKey || "stage"
  return (
    <CardShell title={chart.title}>
      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey={stageKey} />
            <Tooltip />
            <Bar dataKey={chart.yKey || "value"} radius={[6, 6, 6, 6]}>
              {data.map((entry, idx) => {
                const selected =
                  activeFilter?.chartId === chart.id &&
                  String(activeFilter.payload[stageKey] ?? "") === String(entry[stageKey] ?? "")
                return (
                  <Cell
                    key={`${chart.id}-funnel-${idx}`}
                    fill={selected ? "#1d4ed8" : BAR_COLOR}
                    cursor="pointer"
                    onClick={() =>
                      onSelect({
                        chartId: chart.id,
                        chartType: chart.type,
                        label: `${chart.title}: ${String(entry[stageKey] ?? "")}`,
                        payload: entry as Record<string, unknown>,
                      })
                    }
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  )
}

function MetricsCard({ metrics }: { metrics: Record<string, unknown> }) {
  const entries = Object.entries(metrics)
  const formatValue = (value: unknown) => {
    if (value === null || value === undefined) return "-"
    if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2)
    if (typeof value === "string" || typeof value === "boolean") return String(value)
    if (Array.isArray(value)) return `${value.length} items`
    if (typeof value === "object") return `${Object.keys(value as Record<string, unknown>).length} entries`
    return String(value)
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">{key}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {formatValue(value)}
          </p>
        </div>
      ))}
    </div>
  )
}

function renderChart(chart: AnalyticsChart, activeFilter: DrilldownFilter | null, onSelect: (filter: DrilldownFilter) => void) {
  if (chart.type === "box") return <BoxPlotCard chart={chart} activeFilter={activeFilter} onSelect={onSelect} />
  if (chart.type === "scatter") return <ScatterCard chart={chart} onSelect={onSelect} />
  if (chart.type === "bar" || chart.type === "line" || chart.type === "histogram") {
    return <BarOrLineCard chart={chart} activeFilter={activeFilter} onSelect={onSelect} />
  }
  if (chart.type === "pie") return <PieCard chart={chart} activeFilter={activeFilter} onSelect={onSelect} />
  if (chart.type === "stackedBar") return <StackedBarCard chart={chart} activeFilter={activeFilter} onSelect={onSelect} />
  if (chart.type === "funnel") return <FunnelCard chart={chart} activeFilter={activeFilter} onSelect={onSelect} />
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
      Unsupported chart type.
    </div>
  )
}

export default function DynamicAnalytics({
  fields,
  submissions,
  formTitle,
}: {
  fields: Field[]
  submissions: Submission[]
  formTitle: string
}) {
  const [activeFilter, setActiveFilter] = useState<DrilldownFilter | null>(null)
  const [showModal, setShowModal] = useState(false)

  const baseAnalytics = useMemo(
    () => buildAnalytics(fields, submissions, formTitle),
    [fields, submissions, formTitle]
  )

  const filteredSubmissions = useMemo(() => {
    if (!activeFilter) return submissions
    const chart = baseAnalytics.charts.find((c) => c.id === activeFilter.chartId)
    if (!chart) return submissions

    if (chart.type === "histogram") {
      const bucket = String(activeFilter.payload[chart.xKey || "bucket"] ?? "")
      const range = parseBucketRange(bucket)
      const fieldId = inferFieldId(fields, chart)
      if (!range || !fieldId) return submissions
      return submissions.filter((s) => {
        const n = parseNumberLike(s.data[fieldId])
        return n !== null && n >= range.min && n <= range.max
      })
    }

    if (chart.type === "box") {
      const min = parseNumberLike(activeFilter.payload.min)
      const max = parseNumberLike(activeFilter.payload.max)
      const fieldId = inferFieldId(fields, chart)
      if (min === null || max === null || !fieldId) return submissions
      return submissions.filter((s) => {
        const n = parseNumberLike(s.data[fieldId])
        return n !== null && n >= min && n <= max
      })
    }

    if (chart.type === "funnel") {
      const key = chart.xKey || "stage"
      const selected = normalize(activeFilter.payload[key])
      if (!selected) return submissions
      const statusFieldId = inferFieldId(fields, chart, [key, "status"])
      if (statusFieldId) {
        return submissions.filter((s) => matchesCategorySelection(s.data[statusFieldId], selected))
      }
      return submissions.filter((s) => Object.values(s.data).some((v) => matchesCategorySelection(v, selected)))
    }

    if (chart.type === "bar" || chart.type === "pie") {
      const key = chart.xKey || "label"
      const selected = normalize(activeFilter.payload[key])
      const fieldId = inferFieldId(fields, chart, [key])
      if (!selected) return submissions
      if (fieldId) {
        return submissions.filter((s) => matchesCategorySelection(s.data[fieldId], selected))
      }
      return submissions.filter((s) =>
        Object.values(s.data).some((value) => matchesCategorySelection(value, selected))
      )
    }

    if (chart.type === "line") {
      const key = chart.xKey || "period"
      const selected = String(activeFilter.payload[key] ?? "")
      const dateFieldId = inferFieldId(fields, chart, ["offer date", "date", "establishment"])
      if (!selected) return submissions
      if (dateFieldId) {
        return submissions.filter((s) => {
          const d = new Date(String(s.data[dateFieldId] ?? ""))
          if (Number.isNaN(d.getTime())) return false
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          return ym === selected
        })
      }
      return submissions
    }

    if (chart.type === "stackedBar") {
      const xVal = normalize(activeFilter.payload[chart.xKey || "x"])
      const series = normalize(activeFilter.seriesKey)
      const internshipField = fields.find((f) => f.label.toLowerCase().includes("internship"))?.id
      const placementField =
        fields.find((f) => f.label.toLowerCase().includes("placement status"))?.id ||
        fields.find((f) => f.label.toLowerCase().includes("placement"))?.id
      if (internshipField && placementField) {
        return submissions.filter((s) => {
          const i = toBooleanLike(s.data[internshipField])
          const p = toBooleanLike(s.data[placementField])
          if (i === null || p === null) return false
          const internshipMatch =
            (xVal.includes("no internship") && i === false) ||
            ((xVal.includes("internship") && !xVal.includes("no")) && i === true)
          const placementMatch =
            ((series.includes("placed") && !series.includes("not")) && p === true) ||
            ((series.includes("not") || series.includes("no")) && p === false)
          return internshipMatch && placementMatch
        })
      }
      return submissions.filter((s) =>
        Object.values(s.data).some((v) => normalize(v) === xVal || normalize(v) === series)
      )
    }

    if (chart.type === "scatter") {
      const xFieldId = inferFieldId(fields, chart, [chart.xKey || ""])
      const yFieldId = inferFieldId(fields, chart, [chart.yKey || ""])
      const xVal = parseNumberLike(activeFilter.payload[chart.xKey || "x"])
      const yVal = parseNumberLike(activeFilter.payload[chart.yKey || "y"])
      if (!xFieldId || !yFieldId || xVal === null || yVal === null) return submissions
      const withDistance = submissions
        .map((s) => {
          const x = parseNumberLike(s.data[xFieldId])
          const y = parseNumberLike(s.data[yFieldId])
          if (x === null || y === null) return null
          return { s, dist: Math.sqrt((x - xVal) ** 2 + (y - yVal) ** 2) }
        })
        .filter((r): r is { s: Submission; dist: number } => r !== null)
        .sort((a, b) => a.dist - b.dist)
      return withDistance.slice(0, Math.min(15, withDistance.length)).map((r) => r.s)
    }

    return submissions
  }, [activeFilter, baseAnalytics.charts, fields, submissions])

  const filteredAnalytics = useMemo(
    () => buildAnalytics(fields, filteredSubmissions, formTitle),
    [fields, filteredSubmissions, formTitle]
  )

  const chartBuckets = useMemo(() => {
    const distribution = baseAnalytics.charts.filter((c) => ["bar", "histogram", "pie", "box", "funnel"].includes(c.type))
    const relationship = baseAnalytics.charts.filter((c) => ["scatter", "stackedBar"].includes(c.type))
    const trends = baseAnalytics.charts.filter((c) => c.type === "line")
    return { distribution, relationship, trends }
  }, [baseAnalytics.charts])

  const handleSelect = (filter: DrilldownFilter) => {
    if (
      activeFilter &&
      activeFilter.chartId === filter.chartId &&
      activeFilter.label === filter.label &&
      activeFilter.seriesKey === filter.seriesKey
    ) {
      setActiveFilter(null)
      setShowModal(false)
      return
    }
    setActiveFilter(filter)
    setShowModal(true)
  }

  const clearFilter = () => {
    setActiveFilter(null)
    setShowModal(false)
  }

  return (
    <div className="space-y-8">
      {activeFilter ? (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-indigo-900">Filter: {activeFilter.label}</p>
            <button
              type="button"
              onClick={clearFilter}
              className="inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-100"
            >
              Clear Filter
            </button>
          </div>
          <p className="mt-1 text-xs text-indigo-700">Showing {filteredSubmissions.length} matching records.</p>
        </section>
      ) : null}

      <section>
        <SectionTitle title="Overview" subtitle="Schema-aware analytics generated from actual field values and response patterns." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Responses</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{filteredSubmissions.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Fields</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{fields.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Charts</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{baseAnalytics.charts.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Insights Generated</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{filteredAnalytics.insights.length}</p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle title="Metrics" subtitle="Core KPIs extracted from relevant numeric, categorical, and boolean fields." />
        {Object.keys(filteredAnalytics.metrics).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No metrics available for this form.
          </div>
        ) : (
          <MetricsCard metrics={filteredAnalytics.metrics} />
        )}
      </section>

      <section>
        <SectionTitle title="Section 1: Key Insights" subtitle="Non-generic findings inferred from this form's specific submission patterns." />
        {filteredAnalytics.insights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            No insights available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredAnalytics.insights.map((insight, idx) => (
              <div key={`${idx}-${insight}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-800">{insight}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Section 2: Distributions"
          subtitle="Spread and frequency views for relevant measures and categories."
        />
        {chartBuckets.distribution.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No distribution charts available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {chartBuckets.distribution.map((chart) => (
              <div key={chart.id}>{renderChart(chart, activeFilter, handleSelect)}</div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Section 3: Relationships"
          subtitle="Cross-field relationships where interactions materially affect outcomes."
        />
        {chartBuckets.relationship.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No relationship charts available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {chartBuckets.relationship.map((chart) => (
              <div key={chart.id}>{renderChart(chart, activeFilter, handleSelect)}</div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="Section 4: Trends" subtitle="Line charts for change over time and domain growth patterns." />
        {chartBuckets.trends.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No trend lines available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {chartBuckets.trends.map((chart) => (
              <div key={chart.id}>{renderChart(chart, activeFilter, handleSelect)}</div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="Actions" subtitle="Recommended next actions from this form's strict analytics logic." />
        {filteredAnalytics.actions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No actions available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredAnalytics.actions.map((action, idx) => (
              <div key={`${idx}-${action}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-800">{action}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && activeFilter ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={clearFilter}>
          <div
            className="max-h-[85vh] w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Filtered Records</h3>
                <p className="text-xs text-slate-500">{activeFilter.label}</p>
              </div>
              <button
                type="button"
                onClick={clearFilter}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4">
              {filteredSubmissions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No matching records for this selection.
                </div>
              ) : (
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100">
                    <tr>
                      <th className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">#</th>
                      {fields.map((field) => (
                        <th key={field.id} className="border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.slice(0, 200).map((submission, rowIndex) => (
                      <tr key={rowIndex} className="odd:bg-white even:bg-slate-50">
                        <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500">{rowIndex + 1}</td>
                        {fields.map((field) => {
                          const value = submission.data[field.id]
                          return (
                            <td key={`${rowIndex}-${field.id}`} className="border border-slate-200 px-3 py-2 text-slate-800">
                              {Array.isArray(value) ? value.join(", ") : String(value ?? "-")}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
