export type Field = { id: string; label: string; type: string; options?: string[] }
export type Submission = { data: Record<string, unknown>; createdAt?: string | Date }

export type AnalyticsChart = {
  id: string
  type: "bar" | "line" | "scatter" | "stackedBar" | "histogram" | "pie" | "box" | "funnel"
  title: string
  xKey?: string
  yKey?: string
  seriesKeys?: string[]
  data?: Record<string, unknown>[]
  stats?: { min: number; q1: number; median: number; q3: number; max: number; count: number }
}

export type AnalyticsPayload = {
  metrics: Record<string, unknown>
  charts: AnalyticsChart[]
  insights: string[]
  actions: string[]
}

function toLabel(field: Field) {
  return (field.label || "").toLowerCase()
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ")
}

function normalizeTitle(title?: string) {
  return normalizeText(title).replace(/[–—]/g, "-").toLowerCase()
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
  const text = normalizeText(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function toYesNo(value: unknown): boolean | null {
  const v = normalizeText(value).toLowerCase()
  if (!v) return null
  if (["yes", "y", "true", "placed", "recommended", "recommend", "published", "active"].includes(v)) return true
  if (["no", "n", "false", "not placed", "not recommended", "do not recommend", "not published", "inactive"].includes(v)) return false
  return null
}

function mean(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
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
  const next = sorted[base + 1]
  if (next === undefined) return sorted[base]
  return sorted[base] + rest * (next - sorted[base])
}

function fiveNumberSummary(numbers: number[]) {
  if (numbers.length < 3) return null
  const q1 = quantile(numbers, 0.25)
  const med = median(numbers)
  const q3 = quantile(numbers, 0.75)
  if (q1 === null || med === null || q3 === null) return null
  return {
    min: Math.min(...numbers),
    q1,
    median: med,
    q3,
    max: Math.max(...numbers),
    count: numbers.length,
  }
}

function pearson(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 3) return null
  const mx = mean(x) as number
  const my = mean(y) as number
  let num = 0
  let denX = 0
  let denY = 0
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  const den = Math.sqrt(denX * denY)
  return den ? num / den : null
}

function countBy(values: string[]) {
  const result: Record<string, number> = {}
  values.forEach((v) => {
    if (!v) return
    result[v] = (result[v] || 0) + 1
  })
  return result
}

function topCategoryRows(grouped: Record<string, number>, limit = 8) {
  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1])
  const top = entries.slice(0, limit).map(([label, value]) => ({ label, value }))
  const others = entries.slice(limit).reduce((acc, [, value]) => acc + value, 0)
  if (others > 0) top.push({ label: "Others", value: others })
  return top
}

function findField(fields: Field[], patterns: string[]) {
  const p = patterns.map((s) => s.toLowerCase())
  return fields.find((f) => p.some((x) => toLabel(f).includes(x)))
}

function numberValues(submissions: Submission[], field?: Field) {
  if (!field) return []
  return submissions.map((s) => parseNumberLike(s.data[field.id])).filter((v): v is number => v !== null)
}

function textValues(submissions: Submission[], field?: Field) {
  if (!field) return []
  return submissions.map((s) => normalizeText(s.data[field.id])).filter(Boolean)
}

function boolValues(submissions: Submission[], field?: Field) {
  if (!field) return []
  return submissions.map((s) => toYesNo(s.data[field.id])).filter((v): v is boolean => v !== null)
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function keywordFrequency(texts: string[]) {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "from",
    "are",
    "was",
    "were",
    "have",
    "has",
    "into",
    "your",
    "you",
    "their",
    "they",
  ])
  const counts: Record<string, number> = {}
  texts.forEach((t) => {
    t.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 3 && !stop.has(x))
      .forEach((x) => {
        counts[x] = (counts[x] || 0) + 1
      })
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
}

function inferDomains(fields: Field[], title: string) {
  const labels = fields.map((f) => toLabel(f))
  const has = (tokens: string[]) => labels.some((label) => tokens.some((token) => label.includes(token)))
  const inTitle = (tokens: string[]) => tokens.some((t) => title.includes(t))
  return {
    feedback:
      inTitle(["feedback", "survey"]) ||
      has(["teaching quality", "difficulty", "workload", "clarity", "recommend", "suggestion"]),
    academic:
      inTitle(["academic"]) ||
      has(["cgpa", "backlog", "attendance", "placement status", "internship experience", "skills"]),
    placement:
      inTitle(["placement"]) ||
      has(["package", "ctc", "offer date", "placement type", "job role"]) ||
      (has(["company"]) && has(["role"])),
    internship:
      inTitle(["internship"]) || has(["stipend", "internship mode", "duration (weeks)", "internship completion"]),
    event:
      inTitle(["event", "club"]) || has(["budget", "revenue", "event details", "duration", "category"]),
    achievement:
      inTitle(["achievement"]) || has(["achievement type", "event title"]),
    patent:
      inTitle(["patent", "copyright"]) || (has(["status"]) && has(["category"]) && has(["year"])),
    research:
      inTitle(["seminar", "capstone", "project"]) || has(["keywords", "abstract", "paper published", "project title"]),
    startup: inTitle(["startup"]) || has(["startup", "establishment date", "startup website link"]),
    administrative:
      inTitle(["meeting", "election"]) || has(["meeting type", "elected cr", "panel", "mom", "academic year"]),
  }
}

export function buildAnalytics(fields: Field[], submissions: Submission[], formTitle?: string): AnalyticsPayload {
  const title = normalizeTitle(formTitle)
  const result: AnalyticsPayload = { metrics: {}, charts: [], insights: [], actions: [] }
  if (!title || submissions.length === 0 || fields.length === 0) return result

  const domains = inferDomains(fields, title)
  const addChart = (chart: AnalyticsChart) => {
    const exists = result.charts.some((c) => c.id === chart.id)
    if (!exists) result.charts.push(chart)
  }
  const addInsight = (text: string) => {
    if (!text) return
    if (!result.insights.includes(text)) result.insights.push(text)
  }
  const addAction = (text: string) => {
    if (!text) return
    if (!result.actions.includes(text)) result.actions.push(text)
  }

  result.metrics.totalResponses = submissions.length
  result.metrics.totalFields = fields.length

  if (title === "gate & competitive exam data collection") {
    const examField = findField(fields, ["exam name", "exam"])
    const scoreField = findField(fields, ["score"])
    const batchField = findField(fields, ["batch"])
    const specialisationField = findField(fields, ["specialisation", "specialization"])
    const semesterField = findField(fields, ["semester"])

    if (!examField || !scoreField) {
      return result
    }

    const rows = submissions
      .map((submission) => {
        const exam = normalizeText(submission.data[examField.id])
        const score = parseNumberLike(submission.data[scoreField.id])
        const batch = batchField ? normalizeText(submission.data[batchField.id]) : ""
        const specialisation = specialisationField ? normalizeText(submission.data[specialisationField.id]) : ""
        const semester = semesterField ? normalizeText(submission.data[semesterField.id]) : ""
        if (!exam || score === null) return null
        return { exam, score, batch, specialisation, semester }
      })
      .filter(
        (row): row is { exam: string; score: number; batch: string; specialisation: string; semester: string } =>
          row !== null
      )

    if (rows.length === 0) return result

    const scores = rows.map((row) => row.score)
    const avg = mean(scores)
    const med = median(scores)
    if (avg !== null) result.metrics.avgScore = Number(avg.toFixed(2))
    if (med !== null) result.metrics.medianScore = Number(med.toFixed(2))
    result.metrics.minScore = Number(Math.min(...scores).toFixed(2))
    result.metrics.maxScore = Number(Math.max(...scores).toFixed(2))
    result.metrics.participantCount = rows.length
    result.metrics.highScoreRate = Number(((rows.filter((row) => row.score >= 500).length / rows.length) * 100).toFixed(1))

    const min = Math.min(...scores)
    const max = Math.max(...scores)
    const bins = 6
    const width = (max - min) / bins || 1
    const histogram = Array.from({ length: bins }, (_, i) => ({
      bucket: `${(min + i * width).toFixed(0)}-${(i === bins - 1 ? max : min + (i + 1) * width).toFixed(0)}`,
      count: 0,
    }))
    scores.forEach((value) => {
      let idx = Math.floor((value - min) / width)
      if (idx < 0) idx = 0
      if (idx >= bins) idx = bins - 1
      histogram[idx].count += 1
    })
    result.charts.push({
      id: "gate-score-distribution",
      type: "histogram",
      title: "Score Distribution",
      data: histogram,
      xKey: "bucket",
      yKey: "count",
    })

    const examGrouped: Record<string, { count: number; sum: number }> = {}
    rows.forEach((row) => {
      examGrouped[row.exam] = examGrouped[row.exam] || { count: 0, sum: 0 }
      examGrouped[row.exam].count += 1
      examGrouped[row.exam].sum += row.score
    })

    const examAvgRows = Object.entries(examGrouped)
      .map(([exam, value]) => ({
        exam,
        avgScore: Number((value.sum / value.count).toFixed(2)),
        participants: value.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
    const examAvgChartRows =
      examAvgRows.length > 12
        ? examAvgRows.filter((row) => row.participants >= 2).slice(0, 10)
        : examAvgRows.slice(0, 12)
    const safeExamAvgRows = examAvgChartRows.length > 0 ? examAvgChartRows : examAvgRows.slice(0, 10)
    result.charts.push({
      id: "gate-exam-vs-score",
      type: "bar",
      title: "Exam vs Average Score",
      data: safeExamAvgRows.map((row) => ({ exam: row.exam, avgScore: row.avgScore })),
      xKey: "exam",
      yKey: "avgScore",
    })

    const examShareRows = topCategoryRows(
      Object.entries(examGrouped).reduce<Record<string, number>>((acc, [label, value]) => {
        acc[label] = value.count
        return acc
      }, {}),
      8
    )
    result.charts.push({
      id: "gate-exam-share",
      type: "pie",
      title: "Exam Participation Share (Top 8 + Others)",
      data: examShareRows,
      xKey: "label",
      yKey: "value",
    })

    if (specialisationField) {
      const specGrouped: Record<string, { count: number; sum: number }> = {}
      rows.forEach((row) => {
        if (!row.specialisation) return
        specGrouped[row.specialisation] = specGrouped[row.specialisation] || { count: 0, sum: 0 }
        specGrouped[row.specialisation].count += 1
        specGrouped[row.specialisation].sum += row.score
      })
      const specRows = Object.entries(specGrouped)
        .map(([specialisation, value]) => ({
          specialisation,
          avgScore: Number((value.sum / value.count).toFixed(2)),
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
      if (specRows.length > 0) {
        result.charts.push({
          id: "gate-spec-vs-score",
          type: "bar",
          title: "Specialisation vs Average Score",
          data: specRows,
          xKey: "specialisation",
          yKey: "avgScore",
        })
      }
    }

    if (batchField || semesterField) {
      const trendGrouped: Record<string, { count: number; sum: number }> = {}
      rows.forEach((row) => {
        const key = row.batch || `Semester ${row.semester || "NA"}`
        if (!key) return
        trendGrouped[key] = trendGrouped[key] || { count: 0, sum: 0 }
        trendGrouped[key].count += 1
        trendGrouped[key].sum += row.score
      })
      const trendRows = Object.entries(trendGrouped)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([period, value]) => ({
          period,
          avgScore: Number((value.sum / value.count).toFixed(2)),
        }))
      if (trendRows.length > 1) {
        result.charts.push({
          id: "gate-score-trend",
          type: "line",
          title: "Average Score Trend",
          data: trendRows,
          xKey: "period",
          yKey: "avgScore",
        })
      }
    }

    const topExam = [...examAvgRows].sort((a, b) => b.avgScore - a.avgScore)[0]
    if (topExam) result.insights.push(`Highest scoring exam category is "${topExam.exam}" with average score ${topExam.avgScore}.`)
    if (avg !== null && med !== null && avg < med) {
      result.insights.push("Score distribution is slightly left-skewed, indicating low-score outliers.")
    }
    if ((result.metrics.highScoreRate as number) < 35) {
      result.insights.push("High-score conversion (>= 500) is limited across current participants.")
    }

    result.actions.push("Run targeted mock-test programs for low-score clusters identified in the distribution.")
    result.actions.push("Use exam-wise average scores to prioritize preparation tracks for weaker exam categories.")
    result.actions.push("Track specialisation cohorts monthly and assign mentoring where average score is below benchmark.")

    return result
  }

  if (domains.feedback) {
    const recommendation = findField(fields, ["recommend"])
    const difficulty = findField(fields, ["difficulty"])
    const workload = findField(fields, ["workload"])
    const clarity = findField(fields, ["clarity"])
    const teaching = findField(fields, ["teaching quality", "overall teaching quality"])
    const suggestion = findField(fields, ["suggestion", "feedback", "comment", "improve"])

    const ratingFields = fields.filter((field) => {
      const numeric = numberValues(submissions, field)
      if (numeric.length < Math.max(5, Math.floor(submissions.length * 0.4))) return false
      const avg = mean(numeric)
      return avg !== null && avg >= 0 && avg <= 10
    })

    const ratingRows = ratingFields
      .map((field) => ({ question: field.label, value: mean(numberValues(submissions, field)) }))
      .filter((r): r is { question: string; value: number } => r.value !== null)

    if (ratingRows.length > 0) {
      addChart({
        id: "feedback-rating-bar",
        type: "bar",
        title: "Average Rating by Question",
        data: ratingRows,
        xKey: "question",
        yKey: "value",
      })
    }

    const rec = boolValues(submissions, recommendation)
    if (rec.length > 0) {
      result.metrics.recommendationRate = Number(((rec.filter(Boolean).length / rec.length) * 100).toFixed(1))
      addChart({
        id: "feedback-recommendation-pie",
        type: "pie",
        title: "Recommendation Split",
        data: [
          { label: "Recommended", value: rec.filter(Boolean).length },
          { label: "Not Recommended", value: rec.filter((x) => !x).length },
        ],
        xKey: "label",
        yKey: "value",
      })
    }

    if (difficulty && recommendation) {
      const points = submissions
        .map((s) => ({
          difficulty: parseNumberLike(s.data[difficulty.id]),
          recommendation: toYesNo(s.data[recommendation.id]),
        }))
        .filter((p): p is { difficulty: number; recommendation: boolean } => p.difficulty !== null && p.recommendation !== null)
        .map((p) => ({ difficulty: p.difficulty, recommendation: p.recommendation ? 1 : 0 }))

      if (points.length >= 6) {
        addChart({
          id: "feedback-difficulty-recommend",
          type: "scatter",
          title: "Difficulty vs Recommendation",
          data: points,
          xKey: "difficulty",
          yKey: "recommendation",
        })

        const high = points.filter((p) => p.difficulty >= 4)
        const low = points.filter((p) => p.difficulty <= 2.5)
        if (high.length > 0 && low.length > 0) {
          const highRate = high.filter((x) => x.recommendation === 1).length / high.length
          const lowRate = low.filter((x) => x.recommendation === 1).length / low.length
          if (highRate + 0.08 < lowRate) {
            addInsight(
              `Higher perceived difficulty lowers recommendation rate (${(highRate * 100).toFixed(0)}% vs ${(lowRate * 100).toFixed(0)}%).`
            )
            addAction("Reduce workload pressure and rebalance course pacing in high-difficulty modules.")
          }
        }
      }
    }

    if (workload && recommendation) {
      const points = submissions
        .map((s) => ({
          workload: parseNumberLike(s.data[workload.id]),
          recommendation: toYesNo(s.data[recommendation.id]),
        }))
        .filter((p): p is { workload: number; recommendation: boolean } => p.workload !== null && p.recommendation !== null)

      if (points.length >= 6) {
        const heavy = points.filter((p) => p.workload >= 4)
        const heavyRec = heavy.length ? heavy.filter((p) => p.recommendation).length / heavy.length : null
        if (heavyRec !== null && heavyRec < 0.5) {
          addInsight("High workload responses are associated with weak recommendation intent.")
          addAction("Trim non-essential assignments or split workload across milestones.")
        }
      }
    }

    if (clarity && teaching) {
      const points = submissions
        .map((s) => ({
          clarity: parseNumberLike(s.data[clarity.id]),
          teaching: parseNumberLike(s.data[teaching.id]),
        }))
        .filter((p): p is { clarity: number; teaching: number } => p.clarity !== null && p.teaching !== null)
      if (points.length >= 6) {
        const corr = pearson(points.map((p) => p.clarity), points.map((p) => p.teaching))
        if (corr !== null && corr > 0.35) {
          addInsight("Clarity is a strong driver of teaching quality ratings.")
          addAction("Prioritize explanation quality and concept framing in sessions with weaker ratings.")
        }
      }
    }

    if (suggestion) {
      const tokens = keywordFrequency(textValues(submissions, suggestion))
      if (tokens.length > 0) {
        addChart({
          id: "feedback-keywords",
          type: "bar",
          title: "Top Suggestion Keywords",
          data: tokens.slice(0, 12).map(([keyword, count]) => ({ keyword, count })),
          xKey: "keyword",
          yKey: "count",
        })
      }
    }
  }

  if (domains.academic) {
    const cgpa = findField(fields, ["cgpa", "gpa"])
    const attendance = findField(fields, ["attendance"])
    const backlog = findField(fields, ["backlog"])
    const placementStatus = findField(fields, ["placement status", "placed", "placement"])
    const internship = findField(fields, ["internship"])

    if (cgpa) {
      const cgpas = numberValues(submissions, cgpa)
      const stats = fiveNumberSummary(cgpas)
      if (stats) {
        addChart({ id: "academic-cgpa-box", type: "box", title: "CGPA Distribution", stats })
        result.metrics.avgCGPA = Number(((mean(cgpas) as number) || 0).toFixed(2))
      }
    }

    if (placementStatus) {
      const placed = boolValues(submissions, placementStatus)
      if (placed.length > 0) {
        result.metrics.placementRate = Number(((placed.filter(Boolean).length / placed.length) * 100).toFixed(1))
        addChart({
          id: "academic-placement-split",
          type: "pie",
          title: "Placement Status Split",
          data: [
            { label: "Placed", value: placed.filter(Boolean).length },
            { label: "Not Placed", value: placed.filter((x) => !x).length },
          ],
          xKey: "label",
          yKey: "value",
        })
      }
    }

    if (cgpa && placementStatus) {
      const rows = submissions
        .map((s) => ({
          cgpa: parseNumberLike(s.data[cgpa.id]),
          placed: toYesNo(s.data[placementStatus.id]),
        }))
        .filter((r): r is { cgpa: number; placed: boolean } => r.cgpa !== null && r.placed !== null)

      const scatter = rows.map((r) => ({ cgpa: r.cgpa, placement: r.placed ? 1 : 0 }))
      if (scatter.length >= 8) {
        addChart({
          id: "academic-cgpa-placement",
          type: "scatter",
          title: "CGPA vs Placement",
          data: scatter,
          xKey: "cgpa",
          yKey: "placement",
        })
      }

      const thresholds = [6.5, 7, 7.5, 8]
      const best = thresholds
        .map((t) => {
          const hi = rows.filter((r) => r.cgpa >= t)
          const lo = rows.filter((r) => r.cgpa < t)
          if (hi.length === 0 || lo.length === 0) return null
          const hiRate = hi.filter((r) => r.placed).length / hi.length
          const loRate = lo.filter((r) => r.placed).length / lo.length
          return { t, diff: hiRate - loRate }
        })
        .filter((x): x is { t: number; diff: number } => x !== null)
        .sort((a, b) => b.diff - a.diff)[0]

      if (best) {
        addInsight(
          `Placement probability improves above CGPA ${best.t.toFixed(1)} in this dataset.`
        )
        addAction("Provide additional mentoring for students below the identified CGPA threshold.")
      }
    }

    if (attendance && cgpa) {
      const points = submissions
        .map((s) => ({
          attendance: parseNumberLike(s.data[attendance.id]),
          cgpa: parseNumberLike(s.data[cgpa.id]),
        }))
        .filter((p): p is { attendance: number; cgpa: number } => p.attendance !== null && p.cgpa !== null)
      if (points.length >= 8) {
        addChart({
          id: "academic-attendance-cgpa",
          type: "scatter",
          title: "Attendance vs CGPA",
          data: points,
          xKey: "attendance",
          yKey: "cgpa",
        })
      }
    }

    if (backlog && placementStatus) {
      const rows = submissions
        .map((s) => ({
          backlogs: parseNumberLike(s.data[backlog.id]),
          placed: toYesNo(s.data[placementStatus.id]),
        }))
        .filter((r): r is { backlogs: number; placed: boolean } => r.backlogs !== null && r.placed !== null)
      const zero = rows.filter((r) => r.backlogs === 0)
      const nonZero = rows.filter((r) => r.backlogs > 0)
      if (zero.length > 0 && nonZero.length > 0) {
        const zeroRate = zero.filter((r) => r.placed).length / zero.length
        const nonZeroRate = nonZero.filter((r) => r.placed).length / nonZero.length
        if (zeroRate > nonZeroRate) {
          addInsight("Students with backlogs show weaker placement outcomes than zero-backlog peers.")
          addAction("Introduce a backlog-clearing support track before placement season.")
        }
      }
    }

    if (internship && placementStatus) {
      const rows = submissions
        .map((s) => ({
          internship: toYesNo(s.data[internship.id]),
          placed: toYesNo(s.data[placementStatus.id]),
        }))
        .filter((r): r is { internship: boolean; placed: boolean } => r.internship !== null && r.placed !== null)

      if (rows.length > 0) {
        const withI = rows.filter((r) => r.internship)
        const withoutI = rows.filter((r) => !r.internship)
        if (withI.length > 0) {
          result.metrics.internshipConversionRate = Number(((withI.filter((r) => r.placed).length / withI.length) * 100).toFixed(1))
        }
        addChart({
          id: "academic-internship-placement",
          type: "stackedBar",
          title: "Internship vs Placement",
          xKey: "group",
          seriesKeys: ["placed", "notPlaced"],
          data: [
            {
              group: "Internship",
              placed: withI.filter((r) => r.placed).length,
              notPlaced: withI.filter((r) => !r.placed).length,
            },
            {
              group: "No Internship",
              placed: withoutI.filter((r) => r.placed).length,
              notPlaced: withoutI.filter((r) => !r.placed).length,
            },
          ],
        })

        if (withI.length > 0 && withoutI.length > 0) {
          const withRate = withI.filter((r) => r.placed).length / withI.length
          const withoutRate = withoutI.filter((r) => r.placed).length / withoutI.length
          if (withRate > withoutRate) {
            addInsight("Internship experience is linked with better placement conversion.")
            addAction("Expand internship pathways for students before final placement rounds.")
          }
        }
      }
    }
  }

  if (domains.event) {
    const budget = findField(fields, ["budget"])
    const revenue = findField(fields, ["revenue"])
    const duration = findField(fields, ["duration"])
    const category = findField(fields, ["category"])
    const date = findField(fields, ["date"])
    const eventName = findField(fields, ["event details", "club name", "title", "event"])

    if (budget && revenue) {
      const rows = submissions
        .map((s, i) => {
          const b = parseNumberLike(s.data[budget.id])
          const r = parseNumberLike(s.data[revenue.id])
          if (b === null || r === null) return null
          return {
            name: eventName ? normalizeText(s.data[eventName.id]) || `Event ${i + 1}` : `Event ${i + 1}`,
            category: category ? normalizeText(s.data[category.id]) : "",
            duration: duration ? parseNumberLike(s.data[duration.id]) : null,
            date: date ? parseDateLike(s.data[date.id]) : null,
            budget: b,
            revenue: r,
            profit: r - b,
            roi: b > 0 ? r / b : null,
          }
        })
        .filter(
          (
            r
          ): r is {
            name: string
            category: string
            duration: number | null
            date: Date | null
            budget: number
            revenue: number
            profit: number
            roi: number | null
          } => r !== null
        )

      if (rows.length > 0) {
        const profits = rows.map((r) => r.profit)
        const rois = rows.map((r) => r.roi).filter((x): x is number => x !== null && Number.isFinite(x))
        result.metrics.totalProfit = Number(profits.reduce((a, b) => a + b, 0).toFixed(2))
        result.metrics.avgROI = rois.length ? Number((mean(rois) as number).toFixed(3)) : null

        addChart({
          id: "event-profit",
          type: "bar",
          title: "Event vs Profit",
          data: rows.map((r) => ({ event: r.name, profit: Number(r.profit.toFixed(2)) })),
          xKey: "event",
          yKey: "profit",
        })

        if (duration) {
          const points = rows
            .filter((r) => r.duration !== null)
            .map((r) => ({ duration: r.duration as number, revenue: r.revenue }))
          if (points.length >= 5) {
            addChart({
              id: "event-duration-revenue",
              type: "scatter",
              title: "Duration vs Revenue",
              data: points,
              xKey: "duration",
              yKey: "revenue",
            })
          }
        }

        if (category) {
          const grouped: Record<string, { roiSum: number; count: number }> = {}
          rows.forEach((r) => {
            if (!r.category || r.roi === null) return
            grouped[r.category] = grouped[r.category] || { roiSum: 0, count: 0 }
            grouped[r.category].roiSum += r.roi
            grouped[r.category].count += 1
          })
          const categoryCounts = countBy(rows.map((r) => r.category).filter(Boolean))
          const categoryPie = topCategoryRows(categoryCounts, 6)
          if (categoryPie.length > 1) {
            addChart({
              id: "event-category-pie",
              type: "pie",
              title: "Event Category Share",
              data: categoryPie,
              xKey: "label",
              yKey: "value",
            })
          }
          const catRows = Object.entries(grouped).map(([cat, v]) => ({
            category: cat,
            avgROI: Number((v.roiSum / v.count).toFixed(3)),
          }))
          if (catRows.length > 0) {
            addChart({
              id: "event-category-roi",
              type: "bar",
              title: "Category vs Avg ROI",
              data: catRows.sort((a, b) => b.avgROI - a.avgROI),
              xKey: "category",
              yKey: "avgROI",
            })
            const best = [...catRows].sort((a, b) => b.avgROI - a.avgROI)[0]
            addInsight(`Top event ROI category is "${best.category}".`)
            addAction("Allocate more events to high-ROI categories and review low-ROI categories.")
          }
        }

        if (date) {
          const trendMap: Record<string, { sum: number; count: number }> = {}
          rows.forEach((r) => {
            if (!r.date) return
            const key = monthKey(r.date)
            trendMap[key] = trendMap[key] || { sum: 0, count: 0 }
            trendMap[key].sum += r.revenue
            trendMap[key].count += 1
          })
          const trend = Object.entries(trendMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([period, v]) => ({ period, avgRevenue: Number((v.sum / v.count).toFixed(2)) }))
          if (trend.length > 1) {
            addChart({
              id: "event-revenue-trend",
              type: "line",
              title: "Revenue Trend",
              data: trend,
              xKey: "period",
              yKey: "avgRevenue",
            })
          }
        }

        const inefficient = rows.filter((r) => r.profit < 0)
        if (inefficient.length > 0) {
          addInsight(`${inefficient.length} events ran at a loss and need budget correction.`)
          addAction("Set pre-approval thresholds for event spend when projected ROI is weak.")
        }
      }
    }
  }

  if (domains.achievement || domains.patent) {
    const year = findField(fields, ["year", "academic year"])
    const category = findField(fields, ["category"])
    const status = findField(fields, ["status"])

    if (domains.patent && status) {
      const statuses = textValues(submissions, status).map((s) => s.toLowerCase())
      const filed = statuses.filter((s) => s.includes("file")).length
      const granted = statuses.filter((s) => s.includes("grant")).length
      result.metrics.filedCount = filed
      result.metrics.grantedCount = granted
      result.metrics.conversionRate = filed > 0 ? Number(((granted / filed) * 100).toFixed(1)) : 0
      addChart({
        id: "patent-funnel",
        type: "funnel",
        title: "Filed to Granted",
        data: [
          { stage: "Filed", value: filed },
          { stage: "Granted", value: granted },
        ],
        xKey: "stage",
        yKey: "value",
      })
      if ((result.metrics.conversionRate as number) < 45) {
        addInsight("Patent conversion from filed to granted is low.")
        addAction("Improve filing quality through mentoring and pre-review checkpoints.")
      }
    }

    if (category) {
      const byCategory = countBy(textValues(submissions, category))
      const rows = Object.entries(byCategory).map(([name, count]) => ({ category: name, count }))
      if (rows.length > 0) {
        addChart({
          id: "achievement-category",
          type: "bar",
          title: "Category Distribution",
          data: rows.sort((a, b) => b.count - a.count),
          xKey: "category",
          yKey: "count",
        })
        const top = [...rows].sort((a, b) => b.count - a.count)[0]
        addInsight(`Most frequent category is "${top.category}".`)
        const pieRows = topCategoryRows(byCategory, 8)
        if (pieRows.length > 1) {
          addChart({
            id: "achievement-category-pie",
            type: "pie",
            title: "Category Share",
            data: pieRows,
            xKey: "label",
            yKey: "value",
          })
        }
      }
    }

    if (year) {
      const byYear = countBy(textValues(submissions, year))
      const trend = Object.entries(byYear)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([yearValue, count]) => ({ year: yearValue, count }))
      if (trend.length > 1) {
        addChart({
          id: "achievement-trend",
          type: "line",
          title: "Yearly Trend",
          data: trend,
          xKey: "year",
          yKey: "count",
        })
        const first = trend[0].count
        const last = trend[trend.length - 1].count
        if (last > first) addInsight("This area shows a positive year-over-year trajectory.")
      }
    }

    addAction("Support underrepresented categories with targeted coaching and visibility.")
  }

  if (domains.internship) {
    const stipend = findField(fields, ["stipend"])
    const duration = findField(fields, ["duration"])
    const company = findField(fields, ["company", "organization"])
    const role = findField(fields, ["role", "domain"])

    if (stipend) {
      const stipends = numberValues(submissions, stipend)
      if (stipends.length > 0) {
        result.metrics.avgStipend = Number(((mean(stipends) as number) || 0).toFixed(2))
        const stats = fiveNumberSummary(stipends)
        if (stats) addChart({ id: "internship-stipend", type: "box", title: "Stipend Distribution", stats })
      }
    }

    if (duration && stipend) {
      const points = submissions
        .map((s) => ({
          duration: parseNumberLike(s.data[duration.id]),
          stipend: parseNumberLike(s.data[stipend.id]),
        }))
        .filter((p): p is { duration: number; stipend: number } => p.duration !== null && p.stipend !== null)
      if (points.length >= 6) {
        addChart({
          id: "internship-duration-stipend",
          type: "scatter",
          title: "Duration vs Stipend",
          data: points,
          xKey: "duration",
          yKey: "stipend",
        })
        const corr = pearson(points.map((p) => p.duration), points.map((p) => p.stipend))
        if (corr !== null && corr > 0.2) {
          addInsight("Longer internships are associated with higher stipends.")
          addAction("Encourage longer-duration opportunities in company partnerships.")
        }
      }
    }

    if (company) {
      const byCompany = countBy(textValues(submissions, company))
      const rows = Object.entries(byCompany)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([companyName, count]) => ({ company: companyName, count }))
      if (rows.length > 0) {
        addChart({
          id: "internship-companies",
          type: "bar",
          title: "Top Internship Companies",
          data: rows,
          xKey: "company",
          yKey: "count",
        })
        const pieRows = topCategoryRows(byCompany, 7)
        if (pieRows.length > 1) {
          addChart({
            id: "internship-company-pie",
            type: "pie",
            title: "Internship Company Share",
            data: pieRows,
            xKey: "label",
            yKey: "value",
          })
        }
      }
    }

    if (role) {
      const byRole = countBy(textValues(submissions, role))
      const rows = Object.entries(byRole)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([roleName, count]) => ({ role: roleName, count }))
      if (rows.length > 0) {
        addChart({
          id: "internship-roles",
          type: "bar",
          title: "Role Distribution",
          data: rows,
          xKey: "role",
          yKey: "count",
        })
      }
    }
    addAction("Expand recruiter network for better stipend and role diversity.")
  }

  if (domains.placement) {
    const pkg = findField(fields, ["package", "ctc", "salary"])
    const company = findField(fields, ["company", "organization", "recruiter"])
    const role = findField(fields, ["job role", "role"])
    const specialisation = findField(fields, ["specialisation", "specialization"])
    const date = findField(fields, ["offer date", "date"])

    if (pkg) {
      const packages = numberValues(submissions, pkg)
      if (packages.length > 0) {
        const avg = mean(packages) as number
        const med = median(packages) as number
        result.metrics.avgPackage = Number(avg.toFixed(2))
        result.metrics.medianPackage = Number(med.toFixed(2))
        result.metrics.minPackage = Number(Math.min(...packages).toFixed(2))
        result.metrics.maxPackage = Number(Math.max(...packages).toFixed(2))
        result.metrics.skewPercent = Number((((avg - med) / Math.max(1, med)) * 100).toFixed(2))

        const bins = 6
        const min = Math.min(...packages)
        const max = Math.max(...packages)
        const width = (max - min) / bins || 1
        const hist = Array.from({ length: bins }, (_, i) => ({
          bucket: `${(min + i * width).toFixed(1)}-${(i === bins - 1 ? max : min + (i + 1) * width).toFixed(1)}`,
          count: 0,
        }))
        packages.forEach((value) => {
          let idx = Math.floor((value - min) / width)
          if (idx < 0) idx = 0
          if (idx >= bins) idx = bins - 1
          hist[idx].count += 1
        })
        addChart({
          id: "placement-hist",
          type: "histogram",
          title: "Package Distribution",
          data: hist,
          xKey: "bucket",
          yKey: "count",
        })

        const sorted = [...packages].sort((a, b) => a - b)
        const q3 = quantile(sorted, 0.75) as number
        const q1 = quantile(sorted, 0.25) as number
        result.metrics.topQuartileThreshold = Number(q3.toFixed(2))
        result.metrics.bottomQuartileThreshold = Number(q1.toFixed(2))
      }
    }

    if (company && pkg) {
      const rows = submissions
        .map((s) => ({
          company: normalizeText(s.data[company.id]),
          pkg: parseNumberLike(s.data[pkg.id]),
        }))
        .filter((r): r is { company: string; pkg: number } => r.company !== "" && r.pkg !== null)
      const grouped: Record<string, { hires: number; sum: number }> = {}
      rows.forEach((r) => {
        grouped[r.company] = grouped[r.company] || { hires: 0, sum: 0 }
        grouped[r.company].hires += 1
        grouped[r.company].sum += r.pkg
      })

      const companyRows = Object.entries(grouped).map(([companyName, v]) => ({
        company: companyName,
        hires: v.hires,
        avgPackage: Number((v.sum / v.hires).toFixed(2)),
      }))

      addChart({
        id: "placement-company-hires",
        type: "bar",
        title: "Company vs Hires",
        data: [...companyRows].sort((a, b) => b.hires - a.hires),
        xKey: "company",
        yKey: "hires",
      })
      const companyPie = topCategoryRows(
        companyRows.reduce<Record<string, number>>((acc, row) => {
          acc[row.company] = row.hires
          return acc
        }, {}),
        7
      )
      if (companyPie.length > 1) {
        addChart({
          id: "placement-company-pie",
          type: "pie",
          title: "Recruiter Share",
          data: companyPie,
          xKey: "label",
          yKey: "value",
        })
      }
      addChart({
        id: "placement-company-package",
        type: "bar",
        title: "Company vs Avg Package",
        data: [...companyRows].sort((a, b) => b.avgPackage - a.avgPackage),
        xKey: "company",
        yKey: "avgPackage",
      })

      if (companyRows.length > 1) {
        const topHires = [...companyRows].sort((a, b) => b.hires - a.hires)[0]
        const share = (topHires.hires / rows.length) * 100
        if (share >= 28) {
          addInsight(`Recruiter concentration is high: ${topHires.company} contributes ${share.toFixed(1)}% of offers.`)
          addAction("Diversify recruiter mix to reduce dependency on a single high-volume company.")
        }
      }
    }

    if (role && pkg) {
      const rows = submissions
        .map((s) => ({
          role: normalizeText(s.data[role.id]),
          pkg: parseNumberLike(s.data[pkg.id]),
        }))
        .filter((r): r is { role: string; pkg: number } => r.role !== "" && r.pkg !== null)
      const grouped: Record<string, { count: number; sum: number }> = {}
      rows.forEach((r) => {
        grouped[r.role] = grouped[r.role] || { count: 0, sum: 0 }
        grouped[r.role].count += 1
        grouped[r.role].sum += r.pkg
      })
      const roleRows = Object.entries(grouped).map(([roleName, v]) => ({
        role: roleName,
        avgPackage: Number((v.sum / v.count).toFixed(2)),
        count: v.count,
      }))
      if (roleRows.length > 0) {
        addChart({
          id: "placement-role-package",
          type: "bar",
          title: "Role vs Avg Package",
          data: roleRows.sort((a, b) => b.avgPackage - a.avgPackage),
          xKey: "role",
          yKey: "avgPackage",
        })
        const topRole = [...roleRows].sort((a, b) => b.avgPackage - a.avgPackage)[0]
        addInsight(`Highest paying role is "${topRole.role}" with avg package ${topRole.avgPackage}.`)
        addAction(`Focus advanced training and mock rounds for "${topRole.role}" tracks.`)
      }
    }

    if (specialisation && pkg) {
      const rows = submissions
        .map((s) => ({
          specialisation: normalizeText(s.data[specialisation.id]),
          pkg: parseNumberLike(s.data[pkg.id]),
        }))
        .filter((r): r is { specialisation: string; pkg: number } => r.specialisation !== "" && r.pkg !== null)
      const grouped: Record<string, { count: number; sum: number }> = {}
      rows.forEach((r) => {
        grouped[r.specialisation] = grouped[r.specialisation] || { count: 0, sum: 0 }
        grouped[r.specialisation].count += 1
        grouped[r.specialisation].sum += r.pkg
      })
      const specRows = Object.entries(grouped).map(([name, v]) => ({
        specialisation: name,
        placements: v.count,
        avgPackage: Number((v.sum / v.count).toFixed(2)),
      }))
      if (specRows.length > 0) {
        addChart({
          id: "placement-specialisation-package",
          type: "bar",
          title: "Specialisation vs Avg Package",
          data: specRows.sort((a, b) => b.avgPackage - a.avgPackage),
          xKey: "specialisation",
          yKey: "avgPackage",
        })
        addChart({
          id: "placement-specialisation-share",
          type: "pie",
          title: "Placement Share by Specialisation",
          data: specRows.map((r) => ({ label: r.specialisation, value: r.placements })),
          xKey: "label",
          yKey: "value",
        })
      }
    }

    if (date && pkg) {
      const rows = submissions
        .map((s) => ({
          date: parseDateLike(s.data[date.id]),
          pkg: parseNumberLike(s.data[pkg.id]),
        }))
        .filter((r): r is { date: Date; pkg: number } => r.date !== null && r.pkg !== null)
      const grouped: Record<string, { count: number; sum: number; max: number }> = {}
      rows.forEach((r) => {
        const key = monthKey(r.date)
        grouped[key] = grouped[key] || { count: 0, sum: 0, max: Number.MIN_SAFE_INTEGER }
        grouped[key].count += 1
        grouped[key].sum += r.pkg
        grouped[key].max = Math.max(grouped[key].max, r.pkg)
      })
      const trend = Object.entries(grouped)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([period, v]) => ({
          period,
          placements: v.count,
          avgPackage: Number((v.sum / v.count).toFixed(2)),
          maxPackage: v.max,
        }))
      if (trend.length > 1) {
        addChart({
          id: "placement-timeline",
          type: "line",
          title: "Placement Timeline (Avg Package)",
          data: trend,
          xKey: "period",
          yKey: "avgPackage",
        })
        const peak = [...trend].sort((a, b) => b.maxPackage - a.maxPackage)[0]
        addInsight(`Highest single offer appears in ${peak.period} (max package ${peak.maxPackage}).`)
        addAction("Schedule advanced placement prep 6-8 weeks before peak offer windows.")
      }
    }
  }

  if (domains.research) {
    const keywords = findField(fields, ["keyword"])
    const abstract = findField(fields, ["abstract"])
    const paper = findField(fields, ["paper published", "published"])
    const year = findField(fields, ["year", "semester", "date"])

    const tokens = keywordFrequency([...textValues(submissions, keywords), ...textValues(submissions, abstract)])
    if (tokens.length > 0) {
      addChart({
        id: "research-keywords",
        type: "bar",
        title: "Top Research Keywords",
        data: tokens.slice(0, 14).map(([keyword, count]) => ({ keyword, count })),
        xKey: "keyword",
        yKey: "count",
      })
      addInsight(`Dominant research area appears around "${tokens[0][0]}".`)
    }

    if (paper) {
      const published = boolValues(submissions, paper)
      if (published.length > 0) {
        const pubCount = published.filter(Boolean).length
        result.metrics.publicationRate = Number(((pubCount / published.length) * 100).toFixed(1))
        addChart({
          id: "research-publication",
          type: "pie",
          title: "Published vs Not Published",
          data: [
            { label: "Published", value: pubCount },
            { label: "Not Published", value: published.length - pubCount },
          ],
          xKey: "label",
          yKey: "value",
        })
        if ((result.metrics.publicationRate as number) < 50) {
          addInsight("Publication rate is below 50%, indicating conversion challenges.")
          addAction("Introduce paper-writing and publication mentoring checkpoints.")
        }
      }
    }

    if (year) {
      const grouped = countBy(textValues(submissions, year))
      const trend = Object.entries(grouped)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([period, count]) => ({ period, count }))
      if (trend.length > 1) {
        addChart({
          id: "research-trend",
          type: "line",
          title: "Research Activity Trend",
          data: trend,
          xKey: "period",
          yKey: "count",
        })
      }
    }
  }

  if (domains.startup) {
    const type = findField(fields, ["type"])
    const status = findField(fields, ["status"])
    const date = findField(fields, ["date", "establishment"])

    result.metrics.startupCount = submissions.length

    if (type) {
      const byType = countBy(textValues(submissions, type))
      addChart({
        id: "startup-type",
        type: "pie",
        title: "Startup Type Mix",
        data: Object.entries(byType).map(([label, value]) => ({ label, value })),
        xKey: "label",
        yKey: "value",
      })
      const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]
      if (topType) addInsight(`Most common startup type is "${topType[0]}".`)
    }

    if (status) {
      const active = textValues(submissions, status).map((s) => s.toLowerCase())
      const activeCount = active.filter((x) => x.includes("active")).length
      result.metrics.activeStartupRate = Number(((activeCount / Math.max(1, active.length)) * 100).toFixed(1))
    }

    if (date) {
      const monthCounts: Record<string, number> = {}
      submissions.forEach((s) => {
        const parsed = parseDateLike(s.data[date.id])
        if (!parsed) return
        const key = monthKey(parsed)
        monthCounts[key] = (monthCounts[key] || 0) + 1
      })
      const trend = Object.entries(monthCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([period, count]) => ({ period, count }))
      if (trend.length > 1) {
        addChart({
          id: "startup-trend",
          type: "line",
          title: "Startup Trend",
          data: trend,
          xKey: "period",
          yKey: "count",
        })
      }
    }
    addAction("Support underrepresented startup categories through targeted incubation programs.")
  }

  if (domains.administrative) {
    const meetingType = findField(fields, ["meeting type"])
    const category = findField(fields, ["category"])
    const year = findField(fields, ["academic year", "year"])
    const specialization = findField(fields, ["specialization", "specialisation"])
    const panel = findField(fields, ["panel"])
    const date = findField(fields, ["date"])

    const simpleBars: Array<{ field?: Field; id: string; title: string; xKey: string }> = [
      { field: meetingType, id: "admin-meeting-type", title: "Meeting Type Distribution", xKey: "type" },
      { field: category, id: "admin-category", title: "Category Distribution", xKey: "category" },
      { field: specialization, id: "admin-specialization", title: "Specialization Distribution", xKey: "specialization" },
      { field: panel, id: "admin-panel", title: "Panel Distribution", xKey: "panel" },
      { field: year, id: "admin-year", title: "Academic Year Distribution", xKey: "year" },
    ]

    simpleBars.forEach((item) => {
      if (!item.field) return
      const grouped = countBy(textValues(submissions, item.field))
      const rows = Object.entries(grouped).map(([key, count]) => ({ [item.xKey]: key, count }))
      if (rows.length > 0) {
        addChart({
          id: item.id,
          type: "bar",
          title: item.title,
          data: rows.sort((a, b) => Number(b.count) - Number(a.count)),
          xKey: item.xKey,
          yKey: "count",
        })
        const pieRows = topCategoryRows(grouped, 8)
        if (pieRows.length > 1) {
          addChart({
            id: `${item.id}-pie`,
            type: "pie",
            title: `${item.title.replace("Distribution", "Share")}`,
            data: pieRows,
            xKey: "label",
            yKey: "value",
          })
        }
      }
    })

    if (date) {
      const trendMap: Record<string, number> = {}
      submissions.forEach((s) => {
        const parsed = parseDateLike(s.data[date.id])
        if (!parsed) return
        const key = monthKey(parsed)
        trendMap[key] = (trendMap[key] || 0) + 1
      })
      const trend = Object.entries(trendMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([period, count]) => ({ period, count }))
      if (trend.length > 1) {
        addChart({
          id: "admin-trend",
          type: "line",
          title: "Record Volume Trend",
          data: trend,
          xKey: "period",
          yKey: "count",
        })
      }
    }
  }

  if (result.charts.length === 0) {
    const numericCandidates = fields
      .map((f) => ({ field: f, values: numberValues(submissions, f) }))
      .filter((x) => x.values.length >= Math.max(6, Math.floor(submissions.length * 0.4)))
      .slice(0, 3)

    numericCandidates.forEach(({ field, values }) => {
      const stats = fiveNumberSummary(values)
      if (stats) {
        addChart({
          id: `generic-box-${field.id}`,
          type: "box",
          title: `${field.label} Distribution`,
          stats,
        })
      }
    })

    const categoricalCandidates = fields
      .map((f) => ({ field: f, values: textValues(submissions, f) }))
      .filter((x) => x.values.length >= Math.max(6, Math.floor(submissions.length * 0.4)))
      .slice(0, 2)

    categoricalCandidates.forEach(({ field, values }) => {
      const grouped = countBy(values)
      const rows = Object.entries(grouped).map(([category, count]) => ({ category, count }))
      if (rows.length > 1 && rows.length <= 15) {
        addChart({
          id: `generic-bar-${field.id}`,
          type: "bar",
          title: `${field.label} Breakdown`,
          data: rows.sort((a, b) => b.count - a.count),
          xKey: "category",
          yKey: "count",
        })
        const pieRows = topCategoryRows(grouped, 8)
        if (pieRows.length > 1) {
          addChart({
            id: `generic-pie-${field.id}`,
            type: "pie",
            title: `${field.label} Share`,
            data: pieRows,
            xKey: "label",
            yKey: "value",
          })
        }
      }
    })
  }

  const hasDistribution = result.charts.some((c) => ["bar", "histogram", "pie", "box", "funnel"].includes(c.type))
  const hasRelationship = result.charts.some((c) => ["scatter", "stackedBar"].includes(c.type))
  const hasTrend = result.charts.some((c) => c.type === "line")

  if (!hasDistribution) {
    addChart({
      id: "fallback-distribution",
      type: "bar",
      title: "Response Volume",
      data: [{ category: "Responses", count: submissions.length }],
      xKey: "category",
      yKey: "count",
    })
  }

  if (!hasRelationship) {
    const boolCandidate = fields.find((field) => {
      const vals = boolValues(submissions, field)
      return vals.length >= Math.max(4, Math.floor(submissions.length * 0.35))
    })
    const categoricalCandidate = fields.find((field) => {
      if (boolCandidate && field.id === boolCandidate.id) return false
      const vals = textValues(submissions, field)
      const unique = new Set(vals)
      return vals.length >= Math.max(4, Math.floor(submissions.length * 0.35)) && unique.size >= 2 && unique.size <= 10
    })

    if (boolCandidate && categoricalCandidate) {
      const grouped: Record<string, { yes: number; no: number }> = {}
      submissions.forEach((submission) => {
        const category = normalizeText(submission.data[categoricalCandidate.id])
        const bool = toYesNo(submission.data[boolCandidate.id])
        if (!category || bool === null) return
        grouped[category] = grouped[category] || { yes: 0, no: 0 }
        if (bool) grouped[category].yes += 1
        else grouped[category].no += 1
      })
      const rows = Object.entries(grouped).map(([category, value]) => ({
        category,
        yes: value.yes,
        no: value.no,
      }))
      if (rows.length > 0) {
        addChart({
          id: "fallback-relationship-stacked",
          type: "stackedBar",
          title: `${categoricalCandidate.label} vs ${boolCandidate.label}`,
          data: rows,
          xKey: "category",
          seriesKeys: ["yes", "no"],
        })
      }
    } else {
      const numericCandidates = fields
        .map((field) => ({ field, values: numberValues(submissions, field) }))
        .filter((item) => item.values.length >= Math.max(4, Math.floor(submissions.length * 0.35)))
        .slice(0, 2)
      if (numericCandidates.length === 2) {
        const [xField, yField] = numericCandidates.map((item) => item.field)
        const points = submissions
          .map((submission) => ({
            x: parseNumberLike(submission.data[xField.id]),
            y: parseNumberLike(submission.data[yField.id]),
          }))
          .filter((point): point is { x: number; y: number } => point.x !== null && point.y !== null)
        if (points.length >= 4) {
          addChart({
            id: "fallback-relationship-scatter",
            type: "scatter",
            title: `${xField.label} vs ${yField.label}`,
            data: points,
            xKey: "x",
            yKey: "y",
          })
        }
      }
    }
  }

  if (!hasTrend) {
    const dated = submissions
      .map((submission) => parseDateLike(submission.createdAt))
      .filter((date): date is Date => date !== null)
    if (dated.length > 1) {
      const grouped: Record<string, number> = {}
      dated.forEach((date) => {
        const key = monthKey(date)
        grouped[key] = (grouped[key] || 0) + 1
      })
      const rows = Object.entries(grouped)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([period, count]) => ({ period, count }))
      if (rows.length > 0) {
        addChart({
          id: "fallback-trend-submissions",
          type: "line",
          title: "Submission Trend",
          data: rows,
          xKey: "period",
          yKey: "count",
        })
      }
    } else if (submissions.length > 1) {
      const rows = submissions.map((_, index) => ({ index: index + 1, count: index + 1 }))
      addChart({
        id: "fallback-trend-cumulative",
        type: "line",
        title: "Cumulative Responses",
        data: rows,
        xKey: "index",
        yKey: "count",
      })
    }
  }

  if (result.insights.length === 0) {
    if (result.charts.length > 0) {
      addInsight("Field-level patterns are detected; use section charts to compare top-performing and weak segments.")
    } else {
      addInsight("Insufficient structured signal in current responses for advanced analytics.")
    }
  }

  if (result.actions.length === 0) {
    addAction("Collect more complete and consistent responses to improve precision of analytics recommendations.")
  }

  return result
}
