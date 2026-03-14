type Field = {
  id: string
  label: string
  type: string
  options?: string[]
}

type Submission = {
  data: any
}

export function buildAnalytics(fields: Field[], submissions: Submission[]) {

  const results: any[] = []

  fields.forEach((field) => {

    // Extract valid values properly (preserving 0, false)
    const values = submissions.map((s) => {
      return s.data[field.id]
    }).filter((v) => v !== null && v !== undefined && v !== "")

    // RADIO / SELECT
    if (field.type === "radio" || field.type === "select") {

      const counts: Record<string, number> = {}

      values.forEach((v) => {
        counts[v] = (counts[v] || 0) + 1
      })

      results.push({
        fieldId: field.id,
        label: field.label,
        type: "pie",
        data: counts
      })
    }

    // CHECKBOX
    if (field.type === "checkbox") {

      const counts: Record<string, number> = {}

      // For checkboxes, values are arrays. We must flatten them.
      const flattened = values.flat()
      
      flattened.forEach((v: any) => {
        counts[v] = (counts[v] || 0) + 1
      })

      results.push({
        fieldId: field.id,
        label: field.label,
        type: "bar",
        data: counts
      })
    }

    // NUMBER
    if (field.type === "number") {
      const numbers = submissions
        .map((s) => s.data[field.id])
        .filter((v) => v !== null && v !== undefined && v !== "")
        .map((v) => Number(v))
        .filter((v) => !isNaN(v));

      const avg =
        numbers.length > 0
          ? numbers.reduce((a, b) => a + b, 0) / numbers.length
          : null;

      results.push({
        fieldId: field.id,
        label: field.label,
        type: "average",
        value: avg,
      });
    }
    
    // RATING (Keep existing rating logic but adapted)
    if (field.type === "rating") {
      const nums = values.map(Number).filter(n => !isNaN(n))
      
      if (nums.length > 0) {
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length
        
        results.push({
          fieldId: field.id,
          label: field.label,
          type: "average",
          value: avg.toFixed(2)
        })
      }
    }

    // TEXT / TEXTAREA
    if (field.type === "text" || field.type === "textarea") {

      results.push({
        fieldId: field.id,
        label: field.label,
        type: "text",
        responses: values.slice(0, 50)
      })
    }

  })

  return results
}
