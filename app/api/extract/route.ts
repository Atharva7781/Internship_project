import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { extractAutofillForFormWithContext, extractStructuredData, FormField } from "@/lib/ai/extract"

type PdfExtract = { text: string }

async function parsePdfBuffer(buffer: Buffer): Promise<PdfExtract> {
  const worker = (await import("pdfjs-dist/legacy/build/pdf.worker.mjs")) as any
  ;(globalThis as any).pdfjsWorker = { WorkerMessageHandler: worker.WorkerMessageHandler }
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  await parser.destroy()
  return { text: result.text || "" }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const formId = (formData.get("formId") as string | null) || null

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfData = await parsePdfBuffer(buffer)
    const text = pdfData.text || ""

    const provider = (process.env.AI_PROVIDER || "openai").toLowerCase()
    const model =
      provider === "ollama"
        ? process.env.OLLAMA_MODEL || "llama3.1:8b-instruct"
        : process.env.OPENAI_MODEL || "gpt-5-mini"

    if (!formId) {
      const structuredData = await extractStructuredData(text)
      return NextResponse.json({ ...structuredData, meta: { provider, model } })
    }

    const form = await prisma.form.findUnique({ where: { id: formId } })
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    let fields: FormField[] = []
    try {
      const parsed = JSON.parse(form.fields)
      fields = Array.isArray(parsed) ? (parsed as FormField[]) : []
    } catch {
      fields = []
    }

    const result = await extractAutofillForFormWithContext({
      documentText: text,
      formTitle: form.title,
      formDescription: form.description,
      fields,
    })
    return NextResponse.json({ ...result, meta: { provider, model } })
  } catch (error) {
    console.error("Extraction error:", error)
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 })
  }
}
