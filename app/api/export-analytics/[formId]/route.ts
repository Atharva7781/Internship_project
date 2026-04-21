import prisma from "@/lib/prisma"
import { buildAnalytics, type AnalyticsChart } from "@/lib/analytics"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export const runtime = "nodejs"

function sanitizeFileName(title: string) {
  return title.replace(/[^\x00-\x7F]/g, "").replace(/[^a-zA-Z0-9-_ ]/g, "_") || "analytics_export"
}

function truncate(value: string, max = 90) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params

  const form = await prisma.form.findUnique({
    where: { id: formId },
  })

  if (!form) {
    return new Response("Form not found", { status: 404 })
  }

  const submissions = await prisma.submission.findMany({
    where: { formId },
    orderBy: { createdAt: "asc" },
  })

  const fields = (() => {
    try {
      const parsed = JSON.parse(form.fields)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })()

  const analytics = buildAnalytics(
    fields as any,
    submissions.map((s) => ({
      data: s.data as Record<string, unknown>,
      createdAt: s.createdAt,
    })),
    form.title
  )

  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pageSize: [number, number] = [595.28, 841.89] // A4
  const margin = 48
  const lineHeight = 14
  const contentWidth = pageSize[0] - margin * 2

  let page = pdfDoc.addPage(pageSize)
  let y = pageSize[1] - margin

  const ensureSpace = (needed = lineHeight) => {
    if (y - needed < margin) {
      page = pdfDoc.addPage(pageSize)
      y = pageSize[1] - margin
    }
  }

  const drawWrappedText = (text: string, size = 10, bold = false) => {
    const font = bold ? fontBold : fontRegular
    const words = text.split(/\s+/).filter(Boolean)
    let currentLine = ""

    const drawLine = (line: string) => {
      ensureSpace(lineHeight)
      page.drawText(line, {
        x: margin,
        y,
        size,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })
      y -= lineHeight
    }

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word
      const width = font.widthOfTextAtSize(candidate, size)
      if (width <= contentWidth) {
        currentLine = candidate
      } else {
        if (currentLine) drawLine(currentLine)
        currentLine = word
      }
    }
    if (currentLine) drawLine(currentLine)
  }

  const drawSpacer = (size = 6) => {
    y -= size
    ensureSpace(0)
  }

  const drawSectionTitle = (title: string) => {
    drawSpacer(4)
    drawWrappedText(title, 13, true)
    drawSpacer(2)
  }

  const buildQuickChartConfig = (chart: AnalyticsChart) => {
    if ((chart.type === "bar" || chart.type === "line" || chart.type === "histogram") && chart.data && chart.xKey && chart.yKey) {
      const rows = chart.data.slice(0, 40)
      return {
        type: chart.type === "histogram" ? "bar" : chart.type,
        data: {
          labels: rows.map((row) => truncate(String(row[chart.xKey] ?? ""), 24)),
          datasets: [
            {
              label: chart.title,
              data: rows.map((row) => Number(row[chart.yKey] ?? 0)),
              borderColor: "#4f46e5",
              backgroundColor: chart.type === "bar" ? "rgba(79,70,229,0.8)" : "rgba(79,70,229,0.35)",
              fill: chart.type === "line",
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { maxRotation: 40, minRotation: 40 } },
            y: { beginAtZero: true },
          },
        },
      }
    }

    if (chart.type === "scatter" && chart.data && chart.xKey && chart.yKey) {
      const rows = chart.data.slice(0, 150)
      return {
        type: "scatter",
        data: {
          datasets: [
            {
              label: chart.title,
              data: rows.map((row) => ({
                x: Number(row[chart.xKey] ?? 0),
                y: Number(row[chart.yKey] ?? 0),
              })),
              borderColor: "#4f46e5",
              backgroundColor: "rgba(79,70,229,0.7)",
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
        },
      }
    }

    if (chart.type === "pie" && chart.data && chart.xKey && chart.yKey) {
      const rows = chart.data.slice(0, 20)
      return {
        type: "pie",
        data: {
          labels: rows.map((row) => String(row[chart.xKey] ?? "")),
          datasets: [
            {
              data: rows.map((row) => Number(row[chart.yKey] ?? 0)),
            },
          ],
        },
      }
    }

    if (chart.type === "stackedBar" && chart.data && chart.xKey && chart.seriesKeys) {
      const rows = chart.data.slice(0, 30)
      return {
        type: "bar",
        data: {
          labels: rows.map((row) => String(row[chart.xKey!] ?? "")),
          datasets: chart.seriesKeys.map((key, idx) => ({
            label: key,
            data: rows.map((row) => Number(row[key] ?? 0)),
            backgroundColor: ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][idx % 5],
          })),
        },
        options: {
          scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
        },
      }
    }

    if (chart.type === "funnel" && chart.data && chart.xKey && chart.yKey) {
      const rows = chart.data
      return {
        type: "bar",
        data: {
          labels: rows.map((r) => String(r[chart.xKey!] ?? "")),
          datasets: [{ data: rows.map((r) => Number(r[chart.yKey!] ?? 0)), label: chart.title }],
        },
        options: { indexAxis: "y" },
      }
    }

    return null
  }

  const drawBoxPlotInline = (chart: Extract<AnalyticsChart, { type: "box" }>) => {
    const { min, q1, median, q3, max } = chart.stats
    const minX = margin + 8
    const maxX = margin + contentWidth - 8
    const centerY = y - 28
    const h = 20
    const range = max - min || 1
    const scaleX = (v: number) => minX + ((v - min) / range) * (maxX - minX)

    ensureSpace(70)
    const xMin = scaleX(min)
    const xQ1 = scaleX(q1)
    const xMed = scaleX(median)
    const xQ3 = scaleX(q3)
    const xMax = scaleX(max)

    page.drawLine({
      start: { x: xMin, y: centerY },
      end: { x: xMax, y: centerY },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    })
    page.drawRectangle({
      x: xQ1,
      y: centerY - h / 2,
      width: Math.max(2, xQ3 - xQ1),
      height: h,
      borderWidth: 1,
      borderColor: rgb(0.3, 0.3, 0.9),
      color: rgb(0.86, 0.88, 1),
    })
    page.drawLine({
      start: { x: xMed, y: centerY - h / 2 },
      end: { x: xMed, y: centerY + h / 2 },
      thickness: 1.2,
      color: rgb(0.2, 0.2, 0.6),
    })
    page.drawLine({
      start: { x: xMin, y: centerY - 6 },
      end: { x: xMin, y: centerY + 6 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    })
    page.drawLine({
      start: { x: xMax, y: centerY - 6 },
      end: { x: xMax, y: centerY + 6 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    })
    y -= 58
  }

  const drawChartImage = async (chart: AnalyticsChart) => {
    const config = buildQuickChartConfig(chart)
    if (!config) return false

    try {
      const encoded = encodeURIComponent(JSON.stringify(config))
      const url = `https://quickchart.io/chart?width=900&height=420&format=png&backgroundColor=white&c=${encoded}`
      const response = await fetch(url, { cache: "no-store" })
      if (!response.ok) return false
      const bytes = await response.arrayBuffer()
      const png = await pdfDoc.embedPng(bytes)

      const targetWidth = contentWidth
      const ratio = png.height / png.width
      const targetHeight = Math.min(260, targetWidth * ratio)
      ensureSpace(targetHeight + 8)
      page.drawImage(png, {
        x: margin,
        y: y - targetHeight,
        width: targetWidth,
        height: targetHeight,
      })
      y -= targetHeight + 8
      return true
    } catch {
      return false
    }
  }

  const renderChartSummary = async (chart: AnalyticsChart) => {
    drawWrappedText(`- ${chart.title}`, 11, true)

    if (chart.type === "box") {
      if (!chart.stats) return
      drawBoxPlotInline(chart)
      const { min, q1, median, q3, max, count } = chart.stats
      drawWrappedText(`  Count: ${count}`, 10, false)
      drawWrappedText(
        `  Min: ${min.toFixed(2)}, Q1: ${q1.toFixed(2)}, Median: ${median.toFixed(2)}, Q3: ${q3.toFixed(2)}, Max: ${max.toFixed(2)}`,
        10,
        false
      )
      return
    }

    const imageDrawn = await drawChartImage(chart)
    if (!imageDrawn) {
      drawWrappedText("  [Chart image unavailable, showing data summary.]", 9, false)
    }

    const rows = (chart.data || []).slice(0, 6)
    rows.forEach((row) => {
      const x = truncate(String(row[(chart.xKey || "x")] ?? ""))
      const yVal = String(row[(chart.yKey || chart.seriesKeys?.[0] || "y")] ?? "")
      drawWrappedText(`  ${x}: ${yVal}`, 10, false)
    })
    if ((chart.data || []).length > rows.length) {
      drawWrappedText(`  ... and ${(chart.data || []).length - rows.length} more rows`, 10, false)
    }
  }

  drawWrappedText("Analytics Report", 20, true)
  drawSpacer(2)
  drawWrappedText(`Form: ${form.title}`, 12, false)
  drawWrappedText(`Generated: ${new Date().toLocaleString()}`, 10, false)
  drawWrappedText(`Submissions: ${submissions.length}`, 10, false)

  drawSectionTitle("Metrics")
  const metricEntries = Object.entries(analytics.metrics)
  if (metricEntries.length === 0) {
    drawWrappedText("No metrics available.")
  } else {
    metricEntries.forEach(([k, v]) => {
      drawWrappedText(`${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`, 10, false)
    })
  }

  drawSectionTitle("Section 1: Key Insights")
  if (analytics.insights.length === 0) {
    drawWrappedText("No key insights available.")
  } else {
    analytics.insights.forEach((insight, index) => {
      drawWrappedText(`${index + 1}. ${insight}`)
    })
  }

  drawSectionTitle("Section 2: Distributions")
  const distributionCharts = analytics.charts.filter((c) => ["bar", "histogram", "pie", "box", "funnel"].includes(c.type))
  if (distributionCharts.length === 0) {
    drawWrappedText("No distribution analytics available.")
  } else {
    for (const chart of distributionCharts) {
      await renderChartSummary(chart)
      drawSpacer(2)
    }
  }

  drawSectionTitle("Section 3: Relationships")
  const relationshipCharts = analytics.charts.filter((c) => ["scatter", "stackedBar"].includes(c.type))
  if (relationshipCharts.length === 0) {
    drawWrappedText("No relationship analytics available.")
  } else {
    for (const chart of relationshipCharts) {
      await renderChartSummary(chart)
      drawSpacer(2)
    }
  }

  drawSectionTitle("Section 4: Trends")
  const trendCharts = analytics.charts.filter((c) => c.type === "line")
  if (trendCharts.length === 0) {
    drawWrappedText("No trend analytics available.")
  } else {
    for (const chart of trendCharts) {
      await renderChartSummary(chart)
      drawSpacer(2)
    }
  }

  drawSectionTitle("Actions")
  if (analytics.actions.length === 0) {
    drawWrappedText("No actions available.")
  } else {
    analytics.actions.forEach((action, idx) => drawWrappedText(`${idx + 1}. ${action}`))
  }

  const buffer = Buffer.from(await pdfDoc.save())

  const fileName = `${sanitizeFileName(form.title)}_analytics.pdf`

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}
