import { NextResponse } from "next/server"
import {
  parseSubmissionSearchQuery,
  SearchableFilterDefinition,
} from "@/lib/ai/extract"

type RequestBody = {
  query?: string
  formTitle?: string
  formDescription?: string | null
  filterDefinitions?: SearchableFilterDefinition[]
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody
    const query = typeof body.query === "string" ? body.query.trim() : ""
    const formTitle = typeof body.formTitle === "string" ? body.formTitle.trim() : ""
    const formDescription =
      typeof body.formDescription === "string" ? body.formDescription : body.formDescription ?? ""
    const filterDefinitions = Array.isArray(body.filterDefinitions) ? body.filterDefinitions : []

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    if (!formTitle) {
      return NextResponse.json({ error: "Form title is required" }, { status: 400 })
    }

    if (filterDefinitions.length === 0) {
      return NextResponse.json({ error: "Filter definitions are required" }, { status: 400 })
    }

    const provider = (process.env.AI_PROVIDER || "openai").toLowerCase()
    const model =
      provider === "ollama"
        ? process.env.OLLAMA_MODEL || "llama3.1:8b-instruct"
        : process.env.OPENAI_MODEL || "gpt-5-mini"

    const result = await parseSubmissionSearchQuery({
      query,
      formTitle,
      formDescription,
      filterDefinitions,
    })

    return NextResponse.json({ ...result, meta: { provider, model } })
  } catch (error) {
    const provider = (process.env.AI_PROVIDER || "openai").toLowerCase()
    const model =
      provider === "ollama"
        ? process.env.OLLAMA_MODEL || "llama3.1:8b-instruct"
        : process.env.OPENAI_MODEL || "gpt-5-mini"

    const codes: string[] = []
    const collectCodes = (err: any) => {
      if (!err || typeof err !== "object") return
      if (typeof err.code === "string") codes.push(err.code)
      if (Array.isArray(err.errors)) err.errors.forEach(collectCodes)
      if (err.cause) collectCodes(err.cause)
    }
    collectCodes(error)
    const message = error instanceof Error ? error.message : String(error)

    if (provider === "ollama" && (codes.includes("ECONNREFUSED") || message.toLowerCase().includes("econnrefused"))) {
      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
      console.error("Submission search parse error:", error)
      return NextResponse.json(
        {
          error: "AI provider is unreachable",
          detail: `Ollama connection refused at ${ollamaBaseUrl}. Start Ollama (or set OLLAMA_BASE_URL), or switch AI_PROVIDER to openai.`,
          meta: { provider, model, ollamaBaseUrl },
        },
        { status: 503 }
      )
    }

    console.error("Submission search parse error:", error)
    return NextResponse.json({ error: "Failed to parse search query", meta: { provider, model } }, { status: 500 })
  }
}
