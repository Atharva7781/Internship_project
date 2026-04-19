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
    console.error("Submission search parse error:", error)
    return NextResponse.json({ error: "Failed to parse search query" }, { status: 500 })
  }
}
