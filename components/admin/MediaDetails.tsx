"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Data = { asset: { url: string; kind: string; original_name: string; mime_type: string; size_bytes: number }; usages: { kind: string; id: string; name: string }[] };
export default function MediaDetails({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { fetch(`/api/admin/media/${id}/usage`).then((response) => response.json()).then((result) => { if (result.asset) setData(result); }).catch(() => {}); }, [id]);
  if (!data) return null;
  return <div className="admin-panel"><h2>文件预览与使用位置</h2><div className="admin-media-preview">{data.asset.kind === "image" ? <img src={data.asset.url} alt={data.asset.original_name} /> : <a className="admin-secondary" href={data.asset.url} target="_blank" rel="noopener noreferrer">打开文件 ↗</a>}<div><strong>{data.asset.original_name}</strong><p>{data.asset.mime_type} · {(Number(data.asset.size_bytes) / 1024).toFixed(1)} KB</p><p>使用位置：{data.usages.length} 处</p></div></div>{data.usages.length ? <div className="admin-relation-chips">{data.usages.map((item, index) => <Link key={`${item.kind}-${item.id}-${index}`} href={`/admin/${item.kind.startsWith("product") ? "products" : item.kind === "category" ? "categories" : "news"}/${item.id}`}>{item.kind}: {item.name}</Link>)}</div> : <p className="admin-empty">此文件暂未被内容引用。</p>}</div>;
}
