"use client"

import { useMemo } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts"

type Field = {
  id: string
  label: string
  type?: string
  options?: string[]
  required?: boolean
}

type Submission = {
  id?: string
  createdAt?: string | null
  data: Record<string, unknown>
}

type FieldKind = "numeric" | "categorical" | "date" | "text"

const BAR_COLOR = "#4f46e5"
const PIE_COLORS = ["#4f46e5", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"]

const IDENTIFIER_LABEL_PARTS = [
  "prn",
  "name",
  "email",
  "contact",
  "phone",
  "mobile",
  "roll",
  "erp",
  "id",
  "link",
  "url",
  "website",
  "upload",
  "file",
  "document",
  "proof",
  "evidence",
]

function normalizeText(value: unknown) {
  return String(value).trim().replace(/\s+/g, " ")
}

function parseNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const cleaned = value.replace(/,/g, "")
  const match = cleaned.match(/-?\d+(\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function parseDateLike(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value !== "string") return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function median(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function quantile(values: number[], q: number) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted[base + 1] === undefined) return sorted[base]
  return sorted[base] + rest * (sorted[base + 1] - sorted[base])
}

function formatBinLabel(start: number, end: number) {
  return `${start.toFixed(1)} - ${end.toFixed(1)}`
}

function buildHistogram(numbers: number[]): Record<string, number> {
  if (numbers.length === 0) return {}
  const minValue = Math.min(...numbers)
  const maxValue = Math.max(...numbers)

  if (minValue === maxValue) {
    return { [String(minValue)]: numbers.length }
  }

  const binCount = Math.max(4, Math.min(10, Math.round(Math.sqrt(numbers.length))))
  const range = maxValue - minValue
  const step = range / binCount
  const bins: { start: number; end: number; count: number }[] = []

  for (let i = 0; i < binCount; i++) {
    const start = minValue + i * step
    const end = i === binCount - 1 ? maxValue : minValue + (i + 1) * step
    bins.push({ start, end, count: 0 })
  }

  numbers.forEach((num) => {
    let idx = Math.floor((num - minValue) / step)
    if (idx >= bins.length) idx = bins.length - 1
    if (idx < 0) idx = 0
    bins[idx].count += 1
  })

  const result: Record<string, number> = {}
  bins.forEach((bin) => {
    result[formatBinLabel(bin.start, bin.end)] = bin.count
  })
  return result
}

function isIdentifierLikeField(field: Field) {
  const label = (field.label || "").toLowerCase()
  return IDENTIFIER_LABEL_PARTS.some((part) => label.includes(part))
}

function inferKind(field: Field, rawValues: unknown[]): FieldKind {
  const type = (field.type || "").toLowerCase()
  if (type === "number" || type === "rating") return "numeric"
  if (type === "date") return "date"
  if (type === "select" || type === "radio" || type === "checkbox") return "categorical"
  if (type === "text" || type === "textarea") {
    const normalized = rawValues.map((v) => normalizeText(v)).filter((v) => v !== "")
    if (normalized.length === 0) return "text"

    const parsedNumbers = normalized.map((v) => parseNumberLike(v)).filter((v): v is number => v !== null)
    const numericCoverage = parsedNumbers.length / normalized.length
    if (parsedNumbers.length >= 5 && numericCoverage >= 0.75) return "numeric"

    const parsedDates = normalized.map((v) => parseDateLike(v)).filter((v): v is Date => v !== null)
    const dateCoverage = parsedDates.length / normalized.length
    if (parsedDates.length >= 5 && dateCoverage >= 0.75) return "date"

    const uniqueCount = new Set(normalized).size
    const uniqueRatio = uniqueCount / normalized.length
    if (uniqueCount <= 12 && uniqueRatio <= 0.65) return "categorical"

    return "text"
  }

  if (field.options && field.options.length > 0) return "categorical"

  const normalized = rawValues.map((v) => normalizeText(v)).filter((v) => v !== "")
  if (normalized.length === 0) return "text"

  const parsedNumbers = normalized.map((v) => parseNumberLike(v)).filter((v): v is number => v !== null)
  if (parsedNumbers.length >= Math.max(5, Math.round(0.8 * normalized.length))) return "numeric"

  const parsedDates = normalized.map((v) => parseDateLike(v)).filter((v): v is Date => v !== null)
  if (parsedDates.length >= Math.max(5, Math.round(0.8 * normalized.length))) return "date"

  const uniqueCount = new Set(normalized).size
  const uniqueRatio = uniqueCount / normalized.length
  if (uniqueCount <= 12 && uniqueRatio <= 0.65) return "categorical"

  return "text"
}

function buildCountMap(values: string[]) {
  const counts: Record<string, number> = {}
  values.forEach((value) => {
    counts[value] = (counts[value] || 0) + 1
  })
  return counts
}

function sortCountMap(counts: Record<string, number>, preferredOrder?: string[]) {
  const entries = Object.entries(counts)
  const orderIndex = new Map((preferredOrder || []).map((value, index) => [value, index]))
  entries.sort((a, b) => {
    const ai = orderIndex.has(a[0]) ? (orderIndex.get(a[0]) as number) : Number.POSITIVE_INFINITY
    const bi = orderIndex.has(b[0]) ? (orderIndex.get(b[0]) as number) : Number.POSITIVE_INFINITY
    if (ai !== bi) return ai - bi
    return b[1] - a[1]
  })
  return Object.fromEntries(entries)
}

function formatPercent(part: number, total: number) {
  if (!total) return "0%"
  return `${Math.round((part / total) * 100)}%`
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function weekKey(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

function pearsonCorrelation(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 3) return null
  const n = x.length
  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n
  let num = 0
  let denX = 0
  let denY = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  const den = Math.sqrt(denX * denY)
  if (!den) return null
  return num / den
}

function InsightPill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
      {text}
    </span>
  )
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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

function BarOrPie({ title, insight, counts, total, preferPie }: { title: string; insight?: string; counts: Record<string, number>; total: number; preferPie: boolean }) {
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }))
  const usePie = preferPie && data.length <= 6
  return (
    <CardShell title={title} meta={`${total} responses`}>
      <div className="mb-3 flex flex-wrap gap-2">
        {insight ? <InsightPill text={insight} /> : null}
        <InsightPill text={usePie ? "Pie chart" : "Bar chart"} />
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {usePie ? (
            <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={95}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 64 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={72} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={BAR_COLOR} radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </CardShell>
  )
}

function NumericCard({
  title,
  numbers,
  totalSubmissions,
  points,
  xMode,
}: {
  title: string
  numbers: number[]
  totalSubmissions: number
  points: { x: number; y: number }[]
  xMode: "time" | "index"
}) {
  const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length
  const minValue = Math.min(...numbers)
  const maxValue = Math.max(...numbers)
  const med = median(numbers) ?? avg
  const q1 = quantile(numbers, 0.25) ?? med
  const q3 = quantile(numbers, 0.75) ?? med
  const iqr = q3 - q1
  const span = maxValue - minValue || 1
  const concentration = iqr / span
  const insight = concentration <= 0.35 ? "Values are concentrated in a narrower range." : "Values are spread across a wider range."
  const histogram = buildHistogram(numbers)

  const histData = Object.entries(histogram).map(([name, value]) => ({ name, value }))
  const scatterData = points.length > 450 ? points.slice(0, 450) : points
  const xLabel = xMode === "time" ? "Date" : "Response #"
  const xTickFormatter = (v: any) => (xMode === "time" ? new Date(Number(v)).toLocaleDateString() : String(v))

  return (
    <CardShell title={title} meta={`${numbers.length}/${totalSubmissions} responses`}>
      <div className="mb-4 flex flex-wrap gap-2">
        <InsightPill text={`Average: ${avg.toFixed(2)}`} />
        <InsightPill text={`Median: ${med.toFixed(2)}`} />
        <InsightPill text={`Min–Max: ${minValue.toFixed(2)}–${maxValue.toFixed(2)}`} />
        <InsightPill text={`Q1–Q3: ${q1.toFixed(2)}–${q3.toFixed(2)}`} />
        <InsightPill text={insight} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800">Distribution (Histogram)</p>
          <div className="mt-3 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histData} margin={{ top: 8, right: 16, left: 0, bottom: 72 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={72} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill={BAR_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800">Scatter Plot</p>
          <p className="mt-1 text-xs text-slate-500">{xMode === "time" ? "Value over time" : "Value across responses"}</p>
          <div className="mt-3 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 36 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={xLabel}
                  tickFormatter={xTickFormatter}
                  domain={["dataMin", "dataMax"]}
                />
                <YAxis type="number" dataKey="y" name={title} domain={["auto", "auto"]} />
                <ZAxis range={[48, 48]} />
                <Tooltip labelFormatter={(v) => `${xLabel}: ${xTickFormatter(v)}`} formatter={(v: any) => [Number(v).toFixed(2), title]} />
                <Scatter data={scatterData} fill={BAR_COLOR} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {points.length > 450 ? (
            <p className="mt-2 text-xs text-slate-500">Showing first 450 points for readability.</p>
          ) : null}
        </div>
      </div>
    </CardShell>
  )
}

function DateTrendCard({ title, dates, totalSubmissions }: { title: string; dates: Date[]; totalSubmissions: number }) {
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const earliest = sorted[0]
  const latest = sorted[sorted.length - 1]
  const spanDays = Math.max(1, Math.round((latest.getTime() - earliest.getTime()) / (24 * 60 * 60 * 1000)))
  const keyFn = spanDays > 60 ? weekKey : dayKey

  const counts: Record<string, number> = {}
  sorted.forEach((d) => {
    const k = keyFn(d)
    counts[k] = (counts[k] || 0) + 1
  })
  const series = Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }))

  const peak = series.reduce((acc, cur) => (cur.value > acc.value ? cur : acc), series[0])

  const y = series.map((p) => p.value)
  const x = series.map((_, idx) => idx)
  const slope = (() => {
    if (x.length < 3) return 0
    const n = x.length
    const meanX = x.reduce((a, b) => a + b, 0) / n
    const meanY = y.reduce((a, b) => a + b, 0) / n
    let num = 0
    let den = 0
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX
      num += dx * (y[i] - meanY)
      den += dx * dx
    }
    return den ? num / den : 0
  })()
  const trend = slope > 0.05 ? "Response activity increased over time." : slope < -0.05 ? "Response activity decreased over time." : "Response activity stayed fairly steady."

  return (
    <CardShell title={title} meta={`${dates.length}/${totalSubmissions} responses`}>
      <div className="mb-3 flex flex-wrap gap-2">
        <InsightPill text={`Earliest: ${earliest.toLocaleDateString()}`} />
        <InsightPill text={`Latest: ${latest.toLocaleDateString()}`} />
        <InsightPill text={`Peak: ${peak.date} (${peak.value})`} />
        <InsightPill text={trend} />
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 24, left: 8, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" interval="preserveStartEnd" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={BAR_COLOR} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  )
}

function KeywordsCard({ title, texts, totalSubmissions }: { title: string; texts: string[]; totalSubmissions: number }) {
  const stopwords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "have",
    "has",
    "had",
    "are",
    "was",
    "were",
    "you",
    "your",
    "not",
    "but",
    "can",
    "could",
    "should",
    "would",
    "will",
    "into",
    "about",
    "there",
    "their",
    "they",
    "them",
    "its",
    "our",
    "what",
    "when",
    "where",
    "which",
    "why",
    "how",
  ])
  const counts: Record<string, number> = {}
  texts.forEach((t) => {
    const cleaned = t.toLowerCase().replace(/[^a-z0-9\s]/g, " ")
    cleaned
      .split(/\s+/g)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3 && !stopwords.has(w))
      .forEach((w) => {
        counts[w] = (counts[w] || 0) + 1
      })
  })

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const data = entries.map(([name, value]) => ({ name, value }))
  if (data.length === 0) return null

  const top = data[0]
  return (
    <CardShell title={title} meta={`${texts.length}/${totalSubmissions} responses`}>
      <div className="mb-3 flex flex-wrap gap-2">
        <InsightPill text={`Common keyword: "${top.name}" (${formatPercent(top.value, texts.length)})`} />
        <InsightPill text="Extracted keywords (no raw text shown)" />
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 64 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={72} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill={BAR_COLOR} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  )
}

function RelationshipCard({
  title,
  xLabel,
  yLabel,
  points,
  correlation,
}: {
  title: string
  xLabel: string
  yLabel: string
  points: { x: number; y: number }[]
  correlation: number | null
}) {
  const insight =
    correlation === null
      ? "Not enough paired responses to infer a relationship."
      : Math.abs(correlation) < 0.2
        ? "No strong relationship detected."
        : correlation > 0
          ? `Positive relationship (r=${correlation.toFixed(2)}).`
          : `Negative relationship (r=${correlation.toFixed(2)}).`

  return (
    <CardShell title={title} meta={`${points.length} paired responses`}>
      <div className="mb-3 flex flex-wrap gap-2">
        <InsightPill text={insight} />
        <InsightPill text="Scatter plot" />
      </div>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 24, left: 8, bottom: 36 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" name={xLabel} />
            <YAxis dataKey="y" name={yLabel} />
            <ZAxis range={[60, 60]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={points} fill={BAR_COLOR} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  )
}

export default function DynamicAnalytics({ fields, submissions }: { fields: Field[]; submissions: Submission[] }) {
  const computed = useMemo(() => {
    const totalSubmissions = submissions.length

    const submissionDates = submissions
      .map((s) => (s.createdAt ? parseDateLike(s.createdAt) : null))
      .filter((d): d is Date => d !== null)

    const fieldCards: React.ReactNode[] = []
    const numericFields: { field: Field; values: number[] }[] = []

    fields.forEach((field) => {
      const rawValues = submissions
        .map((s) => s.data?.[field.id])
        .filter((v) => v !== null && v !== undefined && v !== "")

      if (rawValues.length === 0) return
      if (isIdentifierLikeField(field)) return

      const kind = inferKind(field, rawValues)

      if (kind === "categorical") {
        const isMulti = (field.type || "").toLowerCase() === "checkbox"
        const values = (isMulti ? rawValues.flatMap((v) => (Array.isArray(v) ? v : [v])) : rawValues)
          .map((v) => normalizeText(v))
          .filter((v) => v !== "")
        if (values.length === 0) return

        const countsRaw = buildCountMap(values)
        const counts = sortCountMap(countsRaw, field.options)
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
        const topInsight = top ? `Most responses fall into "${top[0]}" (${formatPercent(top[1], values.length)}).` : undefined
        const preferPie = !isMulti
        fieldCards.push(
          <BarOrPie
            key={field.id}
            title={field.label}
            counts={counts}
            total={values.length}
            insight={topInsight}
            preferPie={preferPie}
          />
        )
        return
      }

      if (kind === "numeric") {
        const indexPoints: { x: number; y: number }[] = []
        const timePoints: { x: number; y: number }[] = []

        submissions.forEach((s) => {
          const raw = s.data?.[field.id]
          if (raw === null || raw === undefined || raw === "") return
          const y = typeof raw === "number" ? raw : parseNumberLike(raw)
          if (y === null || !Number.isFinite(y)) return
          indexPoints.push({ x: indexPoints.length + 1, y })
          const createdAt = s.createdAt ? parseDateLike(s.createdAt) : null
          if (createdAt) timePoints.push({ x: createdAt.getTime(), y })
        })

        const useTime = timePoints.length >= Math.max(3, Math.round(indexPoints.length * 0.7))
        const points = useTime ? timePoints.sort((a, b) => a.x - b.x) : indexPoints
        const numbers = points.map((p) => p.y)

        if (numbers.length < 3) return
        numericFields.push({ field, values: numbers })
        fieldCards.push(
          <NumericCard
            key={field.id}
            title={field.label}
            numbers={numbers}
            totalSubmissions={totalSubmissions}
            points={points}
            xMode={useTime ? "time" : "index"}
          />
        )
        return
      }

      if (kind === "date") {
        const dates = rawValues.map((v) => parseDateLike(v)).filter((v): v is Date => v !== null)
        if (dates.length < 3) return
        fieldCards.push(
          <DateTrendCard key={field.id} title={field.label} dates={dates} totalSubmissions={totalSubmissions} />
        )
        return
      }

      const texts = rawValues.map((v) => normalizeText(v)).filter((v) => v !== "")
      if (texts.length === 0) return
      fieldCards.push(<KeywordsCard key={field.id} title={field.label} texts={texts} totalSubmissions={totalSubmissions} />)
    })

    const relationship = (() => {
      if (numericFields.length < 2) return null
      let best:
        | {
            xField: Field
            yField: Field
            points: { x: number; y: number }[]
            corr: number | null
          }
        | null = null

      for (let i = 0; i < numericFields.length; i++) {
        for (let j = i + 1; j < numericFields.length; j++) {
          const xF = numericFields[i].field
          const yF = numericFields[j].field
          const points: { x: number; y: number }[] = []
          const xs: number[] = []
          const ys: number[] = []

          submissions.forEach((s) => {
            const xRaw = s.data?.[xF.id]
            const yRaw = s.data?.[yF.id]
            const x = typeof xRaw === "number" ? xRaw : parseNumberLike(xRaw)
            const y = typeof yRaw === "number" ? yRaw : parseNumberLike(yRaw)
            if (x === null || y === null) return
            points.push({ x, y })
            xs.push(x)
            ys.push(y)
          })

          if (points.length < 10) continue
          const corr = pearsonCorrelation(xs, ys)
          const score = corr === null ? 0 : Math.abs(corr)
          if (!best || score > (best.corr === null ? 0 : Math.abs(best.corr))) {
            best = { xField: xF, yField: yF, points, corr }
          }
        }
      }

      return best
    })()

    const submissionTrend = (() => {
      if (submissionDates.length < 3) return null
      const sorted = [...submissionDates].sort((a, b) => a.getTime() - b.getTime())
      const earliest = sorted[0]
      const latest = sorted[sorted.length - 1]
      const spanDays = Math.max(1, Math.round((latest.getTime() - earliest.getTime()) / (24 * 60 * 60 * 1000)))
      const keyFn = spanDays > 60 ? weekKey : dayKey
      const counts: Record<string, number> = {}
      sorted.forEach((d) => {
        const k = keyFn(d)
        counts[k] = (counts[k] || 0) + 1
      })
      const series = Object.entries(counts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, value]) => ({ date, value }))
      const peak = series.reduce((acc, cur) => (cur.value > acc.value ? cur : acc), series[0])
      return { earliest, latest, series, peak }
    })()

    const overview = (() => {
      const totalFields = fields.length
      const totalResponses = totalSubmissions
      const responseRange = submissionTrend
        ? `${submissionTrend.earliest.toLocaleDateString()} → ${submissionTrend.latest.toLocaleDateString()}`
        : "N/A"

      const filledCounts = fields.map((f) => {
        const filled = submissions.filter((s) => s.data?.[f.id] !== null && s.data?.[f.id] !== undefined && s.data?.[f.id] !== "").length
        return { field: f, filled }
      })
      const best = filledCounts.reduce((acc, cur) => (cur.filled > acc.filled ? cur : acc), filledCounts[0] || null)
      const worst = filledCounts.reduce((acc, cur) => (cur.filled < acc.filled ? cur : acc), filledCounts[0] || null)

      return {
        totalFields,
        totalResponses,
        responseRange,
        mostAnswered: best ? `${best.field.label} (${formatPercent(best.filled, totalResponses)})` : "N/A",
        leastAnswered: worst ? `${worst.field.label} (${formatPercent(worst.filled, totalResponses)})` : "N/A",
      }
    })()

    return { overview, fieldCards, relationship, submissionTrend }
  }, [fields, submissions])

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle
          title="Overview"
          subtitle="Auto-generated summary based on your form schema and collected responses."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Responses</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{computed.overview.totalResponses}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Fields</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{computed.overview.totalFields}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Response Range</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{computed.overview.responseRange}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Most Answered Field</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{computed.overview.mostAnswered}</p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle
          title="Field-wise Analysis"
          subtitle="Each card adapts automatically based on detected field type and response patterns."
        />
        {computed.fieldCards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            Not enough data to generate field-wise analytics yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {computed.fieldCards}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Trends"
          subtitle="Time trends and simple relationships (generated only if the required data exists)."
        />

        <div className="grid grid-cols-1 gap-6">
          {computed.submissionTrend ? (
            <CardShell
              title="Submission Activity Over Time"
              meta={`Peak: ${computed.submissionTrend.peak.date} (${computed.submissionTrend.peak.value})`}
            >
              <div className="mb-3 flex flex-wrap gap-2">
                <InsightPill text={`Earliest: ${computed.submissionTrend.earliest.toLocaleDateString()}`} />
                <InsightPill text={`Latest: ${computed.submissionTrend.latest.toLocaleDateString()}`} />
                <InsightPill text="Line chart" />
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={computed.submissionTrend.series} margin={{ top: 8, right: 24, left: 8, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke={BAR_COLOR} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardShell>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              No submission timestamp trend available yet.
            </div>
          )}

          {computed.relationship ? (
            <RelationshipCard
              title="Numeric Relationship"
              xLabel={computed.relationship.xField.label}
              yLabel={computed.relationship.yField.label}
              points={computed.relationship.points}
              correlation={computed.relationship.corr}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              Not enough numeric data to generate a relationship chart.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
