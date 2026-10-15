"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function DashboardTrend({ data }: { data: { day: string; inquiries: number; whatsapp: number }[] }) {
  if (!data.length) return <div className="admin-empty">趋势数据暂不可用</div>;
  return <div className="admin-trend-chart" role="img" aria-label="近 30 天询盘与 WhatsApp 点击趋势">
    <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
      <CartesianGrid stroke="#e9edf4" vertical={false} />
      <XAxis dataKey="day" tickFormatter={(value: string) => value.slice(5)} tick={{ fill: "#71809a", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
      <YAxis allowDecimals={false} tick={{ fill: "#71809a", fontSize: 12 }} tickLine={false} axisLine={false} />
      <Tooltip labelFormatter={(value) => String(value)} formatter={(value, name) => [value, name === "inquiries" ? "询盘" : "WhatsApp 点击"]} />
      <Line type="monotone" dataKey="inquiries" stroke="#1468d8" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
      <Line type="monotone" dataKey="whatsapp" stroke="#18a772" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
    </LineChart></ResponsiveContainer>
    <div className="admin-chart-legend"><span><i className="admin-legend-blue" />询盘</span><span><i className="admin-legend-green" />WhatsApp 点击</span></div>
  </div>;
}
