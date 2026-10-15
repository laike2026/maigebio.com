"use client";
import { useEffect, useState } from "react";
type Item = { id: string; name_zh: string };
export default function LeadStatusSelect({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => { fetch("/api/admin/lead_statuses?size=100&sort=sort_order&order=asc").then((response) => response.json()).then((data) => setItems(data.items || [])).catch(() => {}); }, []);
  return <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">请选择</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name_zh}</option>)}</select>;
}
