import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return new Response(JSON.stringify({ error: 'No file' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })

  const safeBase = (file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_')
  const filename = `${Date.now()}_${safeBase}`
  const fullPath = path.join(uploadDir, filename)
  await writeFile(fullPath, buffer)

  const url = `/uploads/${filename}`
  return new Response(JSON.stringify({ url }), { headers: { 'Content-Type': 'application/json' } })
}

