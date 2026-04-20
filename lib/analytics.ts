type Field = {
  id: string
  label: string
  type: string
  options?: string[]
}

type Submission = {
  data: any
}

type AnalyticsItem =
  | {
      fieldId: string
      label: string
      type: "bar" | "pie"
      data: Record<string, number>
      total: number
      insight?: string
    }
  | {
      fieldId: string
      label: string
      type: "metric"
      value: number | null
      count: number
      min?: number
      max?: number
      median?: number
    }

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

function toLabel(field: Field) {
  return (field.label || "").toLowerCase()
}

function isIdentifierLikeField(field: Field) {
  const label = toLabel(field)
  return IDENTIFIER_LABEL_PARTS.some((part) => label.includes(part))
}

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

function median(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
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

  const binCount = Math.max(4, Math.min(8, Math.round(Math.sqrt(numbers.length))))
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

export function buildAnalytics(fields: Field[], submissions: Submission[]) {
  const results: AnalyticsItem[] = []

  fields.forEach((field) => {
    const rawValues = submissions
      .map((s) => s.data[field.id])
      .filter((v) => v !== null && v !== undefined && v !== "")

    if (rawValues.length === 0) return

    if (field.type === "radio" || field.type === "select") {
      const values = rawValues.map((v) => normalizeText(v))
      const counts = sortCountMap(buildCountMap(values), field.options)
      const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      const numOptions = Object.keys(counts).length
      results.push({
        fieldId: field.id,
        label: field.label,
        type: numOptions <= 5 ? "pie" : "bar",
        data: counts,
        total: values.length,
        insight: topEntry ? `${topEntry[0]} leads with ${topEntry[1]} responses.` : undefined,
      })
      return
    }

    if (field.type === "checkbox") {
      const flattened = rawValues
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .map((v) => normalizeText(v))
        .filter((v) => v !== "")
      if (flattened.length === 0) return

      const counts = sortCountMap(buildCountMap(flattened), field.options)
      const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      results.push({
        fieldId: field.id,
        label: field.label,
        type: "bar",
        data: counts,
        total: flattened.length,
        insight: topEntry ? `${topEntry[0]} is the most selected option (${topEntry[1]}).` : undefined,
      })
      return
    }

    if (field.type === "number" || field.type === "rating") {
      const numbers = rawValues.map((v) => Number(v)).filter((v) => !Number.isNaN(v))
      if (numbers.length === 0) return
      const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length
      results.push({
        fieldId: field.id,
        label: `${field.label} (Average)`,
        type: "metric",
        value: avg,
        count: numbers.length,
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        median: median(numbers) ?? undefined,
      })
      results.push({
        fieldId: `${field.id}-distribution`,
        label: `${field.label} (Distribution)`,
        type: "bar",
        data: buildHistogram(numbers),
        total: numbers.length,
        insight: "Distribution of numeric responses.",
      })
      return
    }

    if (field.type === "text" || field.type === "textarea") {
      if (isIdentifierLikeField(field)) return

      const textValues = rawValues.map((v) => normalizeText(v)).filter((v) => v !== "")
      if (textValues.length === 0) return

      const parsedNumbers = textValues
        .map((value) => parseNumberLike(value))
        .filter((value): value is number => value !== null)
      const numericCoverage = parsedNumbers.length / textValues.length

      if (parsedNumbers.length >= 5 && numericCoverage >= 0.7) {
        const avg = parsedNumbers.reduce((a, b) => a + b, 0) / parsedNumbers.length
        results.push({
          fieldId: field.id,
          label: `${field.label} (Average)`,
          type: "metric",
          value: avg,
          count: parsedNumbers.length,
          min: Math.min(...parsedNumbers),
          max: Math.max(...parsedNumbers),
          median: median(parsedNumbers) ?? undefined,
        })
        results.push({
          fieldId: `${field.id}-distribution`,
          label: `${field.label} (Distribution)`,
          type: "bar",
          data: buildHistogram(parsedNumbers),
          total: parsedNumbers.length,
          insight: "Distribution from numeric values extracted from text responses.",
        })
        return
      }

      const counts = buildCountMap(textValues)
      const uniqueCount = Object.keys(counts).length
      const uniqueRatio = uniqueCount / textValues.length
      const canCategorize = uniqueCount <= 12 && uniqueRatio <= 0.6
      if (!canCategorize) return

      const sortedCounts = sortCountMap(counts)
      const topEntry = Object.entries(sortedCounts).sort((a, b) => b[1] - a[1])[0]
      const numOptions = Object.keys(sortedCounts).length
      results.push({
        fieldId: field.id,
        label: field.label,
        type: numOptions <= 5 ? "pie" : "bar",
        data: sortedCounts,
        total: textValues.length,
        insight: topEntry ? `${topEntry[0]} appears most often (${topEntry[1]}).` : undefined,
      })
    }
  })

  return results
}
