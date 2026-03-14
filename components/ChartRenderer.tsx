"use client"

import { PieChart, Pie, Tooltip, Cell } from "recharts"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

export default function ChartRenderer({ chart }: any) {

  // PIE CHART
  if (chart.type === "pie") {

    const data = Object.entries(chart.data).map(([name, value]) => ({
      name,
      value
    }))

    return (
      <div style={{ marginBottom: "40px" }}>
        <h3>{chart.label}</h3>

        <PieChart width={400} height={300}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>

        <div className="mt-4">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Option</th>
                <th className="p-2 text-right">Responses</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(chart.data).map(([option, count]) => (
                <tr key={option} className="border-t">
                  <td className="p-2">{option}</td>
                  <td className="p-2 text-right">{count as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // AVERAGE METRIC
  if (chart.type === "average") {

    return (
      <div style={{ marginBottom: "40px" }}>
        <h3>{chart.label}</h3>
        <h2>
          {typeof chart.value === "number"
            ? chart.value.toFixed(2)
            : "N/A"}
        </h2>
      </div>
    )
  }

  // TEXT RESPONSES
  if (chart.type === "text") {

    return (
      <div style={{ marginBottom: "40px" }}>
        <h3>{chart.label}</h3>

        <div className="space-y-2">
          {chart.responses.map((r: string, i: number) => (
            <div
              key={i}
              className="p-3 border rounded-lg bg-gray-50 text-sm"
            >
              {r}
            </div>
          ))}
        </div>

      </div>
    )
  }

  return null
}
