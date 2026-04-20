"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

const BAR_COLOR = "#4f46e5"
const PIE_COLORS = ["#4f46e5", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"]

export default function ChartRenderer({ chart }: any) {
  if (chart.type === "bar") {
    const data = Object.entries(chart.data || {}).map(([name, value]) => ({
      name,
      value: Number(value),
    }))

    if (data.length === 0) return null

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{chart.label}</h3>
          {chart.insight ? <p className="mt-1 text-sm text-slate-600">{chart.insight}</p> : null}
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 64 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={72} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={BAR_COLOR} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-2 text-left font-semibold text-slate-700">Category</th>
                <th className="p-2 text-right font-semibold text-slate-700">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.name} className="border-t border-slate-200">
                  <td className="p-2 text-slate-800">{row.name}</td>
                  <td className="p-2 text-right text-slate-800">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (chart.type === "pie") {
    const data = Object.entries(chart.data || {}).map(([name, value]) => ({
      name,
      value: Number(value),
    }))

    if (data.length === 0) return null

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{chart.label}</h3>
          {chart.insight ? <p className="mt-1 text-sm text-slate-600">{chart.insight}</p> : null}
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-2 text-left font-semibold text-slate-700">Category</th>
                <th className="p-2 text-right font-semibold text-slate-700">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.name} className="border-t border-slate-200">
                  <td className="p-2 text-slate-800">{row.name}</td>
                  <td className="p-2 text-right text-slate-800">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (chart.type === "metric") {
    return (
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900">{chart.label}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Average</p>
            <p className="text-xl font-bold text-slate-900">
              {typeof chart.value === "number" ? chart.value.toFixed(2) : "N/A"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Median</p>
            <p className="text-xl font-bold text-slate-900">
              {typeof chart.median === "number" ? chart.median.toFixed(2) : "N/A"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Min</p>
            <p className="text-xl font-bold text-slate-900">
              {typeof chart.min === "number" ? chart.min.toFixed(2) : "N/A"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Max</p>
            <p className="text-xl font-bold text-slate-900">
              {typeof chart.max === "number" ? chart.max.toFixed(2) : "N/A"}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500">Based on {chart.count ?? 0} responses.</p>
      </div>
    )
  }

  return null
}
