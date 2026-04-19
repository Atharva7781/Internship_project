import OpenAI from "openai"

type FieldType = "text" | "number" | "checkbox" | "radio" | "select" | "textarea" | "file"
export type FormField = {
  id: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
}

type MatchedField = {
  fieldId: string
  label: string
  value: unknown
  reason: string
  confidence: number
}

type AutofillResult = {
  answers: Record<string, unknown>
  matchedFields: MatchedField[]
  summary: string
  relationship: string
}

export type SubmissionSearchFilterOperator = "contains" | "equals" | ">" | "<" | ">=" | "<=" | "between"
export type SubmissionSearchFilterKind = "text" | "select" | "number" | "date"
export type SearchableFilterDefinition = {
  id: string
  label: string
  kind: SubmissionSearchFilterKind
  operators: SubmissionSearchFilterOperator[]
  options?: string[]
  sortable?: boolean
}

export type SubmissionSearchFilter = {
  field: string
  operator: SubmissionSearchFilterOperator
  value: unknown
}

export type SubmissionSearchSort = {
  field: string
  direction: "asc" | "desc"
}

export type SubmissionSearchParseResult = {
  filters: SubmissionSearchFilter[]
  sort: SubmissionSearchSort | null
  summary: string
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
    return JSON.parse(cleaned) as T
  } catch {
    return fallback
  }
}

function extractJsonObjectSubstring(raw: string) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
  const first = cleaned.indexOf("{")
  const last = cleaned.lastIndexOf("}")
  if (first === -1 || last === -1 || last <= first) return null
  return cleaned.slice(first, last + 1)
}

async function callOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing")
  }
  const client = new OpenAI({ apiKey })
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  })

  return completion.choices[0].message.content || ""
}

async function callOllama(prompt: string) {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
  const model = process.env.OLLAMA_MODEL || "llama3.1:8b-instruct"

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [{ role: "user", content: prompt }],
      options: { temperature: 0 },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Ollama error (${res.status}): ${text}`)
  }

  const data = (await res.json()) as { message?: { content?: string } }
  return data?.message?.content || ""
}

async function runAI(prompt: string) {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase()
  if (provider === "ollama") {
    try {
      return await callOllama(prompt)
    } catch (err) {
      if (process.env.OPENAI_API_KEY) return callOpenAI(prompt)
      throw err
    }
  }
  return callOpenAI(prompt)
}

export async function extractStructuredData(text: string) {
  try {
    const prompt = `
You are an AI that extracts structured information from documents like resumes.

Extract the following fields:
- name
- email
- phone
- skills (array)
- education
- year (if mentioned)

Return ONLY valid JSON.

Document:
${text}
`

    const output = await runAI(prompt)
    return safeJsonParse<Record<string, unknown>>(output, {})
  } catch (error) {
    console.error("AI Extraction Error:", error)
    return {}
  }
}

async function parseOrRepairAutofillResult(raw: string): Promise<AutofillResult | null> {
  const empty: AutofillResult = { answers: {}, matchedFields: [], summary: "", relationship: "" }
  const direct = safeJsonParse<AutofillResult>(raw, empty)
  if (direct && typeof direct === "object" && direct.answers && typeof direct.answers === "object") {
    if (
      typeof direct.summary === "string" &&
      typeof direct.relationship === "string" &&
      Array.isArray(direct.matchedFields)
    ) {
      return direct
    }
  }

  const substr = extractJsonObjectSubstring(raw)
  if (substr) {
    const sub = safeJsonParse<AutofillResult>(substr, empty)
    if (sub && typeof sub === "object" && sub.answers && typeof sub.answers === "object") {
      return sub
    }
  }

  const repairPrompt = `
Fix the following content into a SINGLE valid JSON object with this schema:
{
  "answers": { "fieldId": "value", "...": "..." },
  "matchedFields": [{ "fieldId": "...", "label": "...", "value": "...", "reason": "...", "confidence": 0.0 }],
  "summary": "...",
  "relationship": "..."
}
Return ONLY JSON. No markdown.

CONTENT:
${raw}
`
  const repaired = await runAI(repairPrompt)
  const repairedJson = extractJsonObjectSubstring(repaired) || repaired
  const repairedParsed = safeJsonParse<AutofillResult>(repairedJson, empty)
  if (repairedParsed && typeof repairedParsed === "object" && repairedParsed.answers && typeof repairedParsed.answers === "object") {
    return repairedParsed
  }

  return null
}

function normalizeAnswers(fields: FormField[], answers: Record<string, unknown>) {
  const byId = new Map(fields.map((f) => [f.id, f]))
  const normalized: Record<string, unknown> = {}

  for (const [fieldId, rawValue] of Object.entries(answers || {})) {
    const field = byId.get(fieldId)
    if (!field) continue

    if (rawValue === null || rawValue === undefined) continue
    if (typeof rawValue === "string" && rawValue.trim() === "") continue

    if (field.type === "number") {
      const num =
        typeof rawValue === "number"
          ? rawValue
          : typeof rawValue === "string"
            ? Number(rawValue)
            : NaN
      if (!Number.isFinite(num)) continue
      normalized[fieldId] = num
      continue
    }

    if (field.type === "checkbox") {
      const arr = Array.isArray(rawValue) ? rawValue : [rawValue]
      const values = arr.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean)
      if (!values.length) continue
      if (field.options?.length) {
        const mapped = values
          .map((v) => pickFromOptions(v, field.options || []))
          .filter(Boolean) as string[]
        if (!mapped.length) continue
        normalized[fieldId] = Array.from(new Set(mapped))
      } else {
        normalized[fieldId] = values
      }
      continue
    }

    if ((field.type === "select" || field.type === "radio") && field.options?.length) {
      const value = typeof rawValue === "string" ? rawValue.trim() : ""
      if (!value) continue
      const match =
        field.options.find((o) => o.toLowerCase() === value.toLowerCase()) ||
        pickFromOptions(value, field.options)
      if (!match) continue
      normalized[fieldId] = match
      continue
    }

    if (field.type === "file") continue

    normalized[fieldId] = typeof rawValue === "string" ? rawValue : String(rawValue)
  }

  return normalized
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((n) => haystack.includes(n))
}

function pickFromOptions(value: string, options: string[]) {
  const v = value.trim().toLowerCase()
  const exact = options.find((o) => o.toLowerCase() === v)
  if (exact) return exact
  const contains = options.find((o) => o.toLowerCase().includes(v) || v.includes(o.toLowerCase()))
  return contains || null
}

function normalizeSpecialOptionValue(value: string, options: string[]) {
  const raw = value.trim().toLowerCase()
  if (!raw) return null

  const direct = pickFromOptions(value, options)
  if (direct) return direct

  const aliases: Record<string, string[]> = {
    FY: ["fy", "first year", "1st year", "year 1"],
    SY: ["sy", "second year", "2nd year", "year 2"],
    TY: ["ty", "third year", "3rd year", "year 3"],
    "Final Year": ["final year", "fourth year", "4th year", "last year", "be"],
    Program: ["program", "programme"],
  }

  for (const option of options) {
    const optionAliases = aliases[option] || []
    if (optionAliases.some((alias) => alias === raw)) {
      return option
    }
  }

  return null
}

function normalizeDateString(value: unknown) {
  if (typeof value !== "string") return null
  const raw = value.trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function normalizeSubmissionSearchFilterValue(
  definition: SearchableFilterDefinition,
  operator: SubmissionSearchFilterOperator,
  rawValue: unknown
) {
  if (definition.kind === "text") {
    const value = typeof rawValue === "string" ? rawValue.trim() : String(rawValue ?? "").trim()
    return value || null
  }

  if (definition.kind === "select") {
    const value = typeof rawValue === "string" ? rawValue.trim() : String(rawValue ?? "").trim()
    if (!value) return null
    if (!definition.options?.length) return value
    return normalizeSpecialOptionValue(value, definition.options) || null
  }

  if (definition.kind === "number") {
    if (operator === "between" && rawValue && typeof rawValue === "object") {
      const source = rawValue as { min?: unknown; max?: unknown; start?: unknown; end?: unknown }
      const min = Number(source.min ?? source.start)
      const max = Number(source.max ?? source.end)
      if (!Number.isFinite(min) || !Number.isFinite(max)) return null
      return { min, max }
    }

    const num = typeof rawValue === "number" ? rawValue : Number(rawValue)
    return Number.isFinite(num) ? num : null
  }

  if (operator === "between" && rawValue && typeof rawValue === "object") {
    const source = rawValue as { start?: unknown; end?: unknown; min?: unknown; max?: unknown }
    const start = normalizeDateString(source.start ?? source.min)
    const end = normalizeDateString(source.end ?? source.max)
    if (!start || !end) return null
    return { start, end }
  }

  return normalizeDateString(rawValue)
}

function normalizeSubmissionSearchResult(
  raw: unknown,
  definitions: SearchableFilterDefinition[]
): SubmissionSearchParseResult {
  const empty: SubmissionSearchParseResult = { filters: [], sort: null, summary: "" }
  if (!raw || typeof raw !== "object") return empty

  const byId = new Map(definitions.map((definition) => [definition.id, definition]))
  byId.set("search", {
    id: "search",
    label: "Search",
    kind: "text",
    operators: ["contains"],
    sortable: false,
  })

  const input = raw as {
    filters?: Array<{ field?: unknown; operator?: unknown; value?: unknown }>
    sort?: { field?: unknown; direction?: unknown } | null
    summary?: unknown
  }

  const filters: SubmissionSearchFilter[] = []

  for (const filter of input.filters || []) {
    const field = typeof filter.field === "string" ? filter.field : ""
    const operator = typeof filter.operator === "string" ? (filter.operator as SubmissionSearchFilterOperator) : null
    const definition = byId.get(field)
    if (!definition || !operator || !definition.operators.includes(operator)) continue

    const value = normalizeSubmissionSearchFilterValue(definition, operator, filter.value)
    if (value === null || value === undefined || value === "") continue
    filters.push({ field, operator, value })
  }

  let sort: SubmissionSearchSort | null = null
  if (input.sort && typeof input.sort === "object") {
    const field = typeof input.sort.field === "string" ? input.sort.field : ""
    const direction = input.sort.direction === "asc" || input.sort.direction === "desc" ? input.sort.direction : null
    const definition = byId.get(field)
    if (field && direction && definition?.sortable) {
      sort = { field, direction }
    }
  }

  return {
    filters,
    sort,
    summary: typeof input.summary === "string" ? input.summary : "",
  }
}

export async function parseSubmissionSearchQuery(input: {
  query: string
  formTitle: string
  formDescription?: string | null
  filterDefinitions: SearchableFilterDefinition[]
}) {
  const defsCompact = input.filterDefinitions
    .map((def) => {
      const opts = def.options?.length ? ` options=${JSON.stringify(def.options)}` : ""
      return `- id=${def.id} label=${JSON.stringify(def.label)} kind=${def.kind} operators=${JSON.stringify(def.operators)} sortable=${String(Boolean(def.sortable))}${opts}`
    })
    .join("\n")

  const prompt = `
You convert a teacher's natural-language search request into structured filters for a submissions table.

Return ONLY a single valid JSON object with this exact shape:
{
  "filters": [
    { "field": "filter-id", "operator": "equals", "value": "..." }
  ],
  "sort": { "field": "filter-id", "direction": "asc" } | null,
  "summary": "short explanation"
}

Rules:
- Use ONLY the provided filter ids.
- A special filter id "search" means free-text search across student name/email and only supports operator "contains".
- Prefer multiple filters when the query implies multiple conditions.
- Use AND logic mentally when constructing filters.
- For select fields, choose one of the provided options exactly.
- For number fields, return numbers, not strings.
- For date fields, return YYYY-MM-DD, or {"start":"YYYY-MM-DD","end":"YYYY-MM-DD"} for "between".
- If no meaningful filter can be inferred, return {"filters":[],"sort":null,"summary":"..."}.
- Do not invent fields that are not listed.
- Return no markdown and no extra text.

Form title:
${input.formTitle}

Form description:
${input.formDescription || ""}

Available filter definitions:
- id=search label="Search" kind=text operators=["contains"] sortable=false
${defsCompact}

Teacher query:
${input.query}
`

  const raw = await runAI(prompt)
  const parsed =
    safeJsonParse<SubmissionSearchParseResult | null>(raw, null) ||
    safeJsonParse<SubmissionSearchParseResult | null>(extractJsonObjectSubstring(raw) || "", null)

  if (parsed) {
    return normalizeSubmissionSearchResult(parsed, input.filterDefinitions)
  }

  const repairPrompt = `
Fix the following content into a SINGLE valid JSON object with this schema:
{
  "filters": [{ "field": "filter-id", "operator": "equals", "value": "..." }],
  "sort": { "field": "filter-id", "direction": "asc" } | null,
  "summary": "short explanation"
}
Return ONLY JSON.

CONTENT:
${raw}
`

  const repaired = await runAI(repairPrompt)
  const repairedParsed =
    safeJsonParse<SubmissionSearchParseResult | null>(repaired, null) ||
    safeJsonParse<SubmissionSearchParseResult | null>(extractJsonObjectSubstring(repaired) || "", null)

  return normalizeSubmissionSearchResult(repairedParsed, input.filterDefinitions)
}

export function mapStructuredDataToForm(
  fields: FormField[],
  structured: Record<string, unknown>,
  text: string
): AutofillResult {
  const answers: Record<string, unknown> = {}
  const matchedFields: MatchedField[] = []

  const name = typeof structured.name === "string" ? structured.name : ""
  const email = typeof structured.email === "string" ? structured.email : ""
  const phone = typeof structured.phone === "string" ? structured.phone : ""
  const education = typeof structured.education === "string" ? structured.education : ""
  const year = typeof structured.year === "string" || typeof structured.year === "number" ? String(structured.year) : ""
  const skillsArr = Array.isArray(structured.skills) ? structured.skills.filter((s) => typeof s === "string") : []
  const skills = skillsArr.join(", ")

  for (const field of fields) {
    const label = (field.label || "").toLowerCase()
    let value: unknown = null
    let reason = ""
    let confidence = 0.72

    if (includesAny(label, ["email"])) {
      value = email
      reason = "Matched by label: email"
    } else if (includesAny(label, ["phone", "mobile", "contact"])) {
      value = phone
      reason = "Matched by label: phone/mobile"
    } else if (includesAny(label, ["full name", "name"]) && !includesAny(label, ["email", "username"])) {
      value = name
      reason = "Matched by label: name"
    } else if (includesAny(label, ["skill", "tech stack", "technology"])) {
      value = field.type === "checkbox" ? skillsArr : skills
      reason = "Matched by label: skills"
    } else if (includesAny(label, ["education", "degree", "college", "university"])) {
      value = education
      reason = "Matched by label: education"
      confidence = 0.68
    } else if (includesAny(label, ["year", "batch", "graduation"])) {
      value = year
      reason = "Matched by label: year"
      confidence = 0.66
    }

    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
      continue
    }

    if (field.type === "select" || field.type === "radio") {
      const raw = typeof value === "string" ? value : String(value)
      const picked = field.options?.length ? pickFromOptions(raw, field.options) : null
      if (!picked) continue
      answers[field.id] = picked
      matchedFields.push({ fieldId: field.id, label: field.label, value: picked, reason, confidence })
      continue
    }

    if (field.type === "checkbox") {
      const vals = Array.isArray(value) ? value : [value]
      const strings = vals.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean)
      const final =
        field.options?.length
          ? field.options.filter((o) => strings.some((s) => s.toLowerCase() === o.toLowerCase()))
          : strings
      if (final.length === 0) continue
      answers[field.id] = final
      matchedFields.push({ fieldId: field.id, label: field.label, value: final, reason, confidence })
      continue
    }

    if (field.type === "number") {
      const num = typeof value === "number" ? value : Number(String(value))
      if (!Number.isFinite(num)) continue
      answers[field.id] = num
      matchedFields.push({ fieldId: field.id, label: field.label, value: num, reason, confidence })
      continue
    }

    if (field.type === "file") continue

    const str = typeof value === "string" ? value : String(value)
    answers[field.id] = str
    matchedFields.push({ fieldId: field.id, label: field.label, value: str, reason, confidence })
  }

  const parts: string[] = []
  if (name) parts.push(`Name: ${name}`)
  if (email) parts.push(`Email: ${email}`)
  if (phone) parts.push(`Phone: ${phone}`)
  if (education) parts.push(`Education: ${education}`)
  if (year) parts.push(`Year: ${year}`)
  if (skillsArr.length) parts.push(`Skills: ${skillsArr.slice(0, 10).join(", ")}${skillsArr.length > 10 ? "…" : ""}`)

  const summary = parts.length ? parts.join("\n") : ""
  const relationship =
    text.toLowerCase().includes("resume") || text.toLowerCase().includes("curriculum")
      ? "This document appears to be a resume/profile and contains details that map to this form."
      : "This document contains profile details that can be mapped to this form."

  return {
    answers: normalizeAnswers(fields, answers),
    matchedFields,
    summary,
    relationship,
  }
}

export async function extractAutofillForFormWithContext(input: {
  documentText: string
  formTitle: string
  formDescription?: string | null
  fields: FormField[]
}) {
  const fieldsCompact = input.fields
    .map((f) => {
      const opts = f.options?.length ? ` options=${JSON.stringify(f.options)}` : ""
      return `- id=${f.id} label=${JSON.stringify(f.label)} type=${f.type} required=${String(f.required)}${opts}`
    })
    .join("\n")

  const prompt = `
You extract and map information from a document into a specific form.

Goal:
- Fill the form as accurately as possible using the document.
- Do semantic matching: use the meaning of the form title/description/field labels, not string matching.
- Capture small details (e.g., address, DOB, GPA/CGPA, links, certifications, IDs, dates, company names) if the form asks for them.
- Provide a clear summary + relationship to the form.

Output MUST be a single JSON object with exactly these keys:
{
  "answers": { "<fieldId>": <value>, ... },
  "matchedFields": [
    { "fieldId": "...", "label": "...", "value": <value>, "reason": "...", "confidence": 0.0 }
  ],
  "summary": "2-5 lines",
  "relationship": "1-3 lines"
}

Rules (critical):
- Only use fieldId values that appear in formFields.
- Only include answers you can support from the document (no guessing).
- For select/radio: value MUST be exactly one of the options.
- For checkbox: value MUST be an array of strings; if options exist, use only option strings.
- For number: return a number (not text).
- For textarea/text: return a string.
- Never fill file fields.
- Prefer the most specific value found in the document.
- Confidence must be 0..1 (higher when explicit in text).
- "reason" should mention the evidence in the document (short quote or where it appears).
- Return ONLY JSON (no markdown, no extra text).

formTitle:
${input.formTitle}

formDescription:
${input.formDescription || ""}

formFields (compact):
${fieldsCompact}

formFields (json):
${JSON.stringify(input.fields)}

documentText:
${input.documentText}
`

  const raw = await runAI(prompt)
  const parsed = await parseOrRepairAutofillResult(raw)
  if (!parsed) {
    const structured = await extractStructuredData(input.documentText)
    return mapStructuredDataToForm(input.fields, structured, input.documentText)
  }

  const normalizedAnswers = normalizeAnswers(input.fields, parsed.answers || {})
  const matchedFields = Array.isArray(parsed.matchedFields) ? parsed.matchedFields : []

  const filteredMatched: MatchedField[] = matchedFields
    .filter((m: any) => m && typeof m.fieldId === "string" && m.fieldId in normalizedAnswers)
    .map((m: any) => {
      const label =
        typeof m.label === "string" ? m.label : input.fields.find((f) => f.id === m.fieldId)?.label || ""
      const reason = typeof m.reason === "string" ? m.reason : ""
      const confidence =
        typeof m.confidence === "number" && Number.isFinite(m.confidence)
          ? Math.max(0, Math.min(1, m.confidence))
          : 0.6
      return { fieldId: m.fieldId, label, value: (normalizedAnswers as any)[m.fieldId] ?? m.value, reason, confidence }
    })

  return {
    answers: normalizedAnswers,
    matchedFields: filteredMatched,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    relationship: typeof parsed.relationship === "string" ? parsed.relationship : "",
  } satisfies AutofillResult
}
