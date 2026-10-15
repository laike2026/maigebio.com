"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { IconCloudUpload } from "@tabler/icons-react";

type Item = { file: File; progress: number; status: "waiting" | "uploading" | "done" | "error"; error?: string; id?: string; url?: string };

export default function MediaUploader() {
  const [items, setItems] = useState<Item[]>([]);
  const active = useRef<XMLHttpRequest | null>(null);
  function add(files: FileList | File[]) {
    setItems((previous) => [...previous, ...Array.from(files).map((file) => ({ file, progress: 0, status: "waiting" as const }))]);
  }
  function patch(index: number, values: Partial<Item>) { setItems((previous) => previous.map((item, i) => i === index ? { ...item, ...values } : item)); }
  async function upload(index: number) {
    const item = items[index]; if (!item) return;
    if (item.file.size > 20 * 1024 * 1024) { patch(index, { status: "error", error: "文件超过 20 MB" }); return; }
    patch(index, { status: "uploading", error: "" });
    let signed: { key: string; url: string; contentType: string } | null = null;
    try {
      const response = await fetch("/api/admin/media/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: item.file.name, size: item.file.size, type: item.file.type }) });
      if (response.ok) signed = await response.json();
      else if (response.status !== 409) throw new Error((await response.json()).message || "无法创建上传链接");
    } catch (error) { patch(index, { status: "error", error: error instanceof Error ? error.message : "签名失败" }); return; }
    const xhr = new XMLHttpRequest(); active.current = xhr;
    xhr.open(signed ? "PUT" : "POST", signed?.url || "/api/admin/media/upload");
    if (signed) xhr.setRequestHeader("Content-Type", signed.contentType);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) patch(index, { progress: Math.round(event.loaded / event.total * 100) }); };
    xhr.onerror = () => { patch(index, { status: "error", error: "网络错误" }); active.current = null; };
    xhr.onabort = () => { patch(index, { status: "waiting", progress: 0 }); active.current = null; };
    xhr.onload = async () => {
      let result: Record<string, string> = {};
      if (signed && xhr.status >= 200 && xhr.status < 300) {
        try { const response = await fetch("/api/admin/media/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: signed.key, name: item.file.name, size: item.file.size }) }); result = await response.json(); if (!response.ok) throw new Error(result.message || "文件处理失败"); }
        catch (error) { patch(index, { status: "error", error: error instanceof Error ? error.message : "文件处理失败" }); active.current = null; return; }
      } else { try { result = JSON.parse(xhr.responseText); } catch { /* handled below */ } }
      if (xhr.status >= 200 && xhr.status < 300) patch(index, { status: "done", progress: 100, id: result.id, url: result.url });
      else patch(index, { status: "error", error: result.message || "上传失败" });
      active.current = null;
    };
    const data = new FormData(); data.append("file", item.file);
    xhr.send(signed ? item.file : data);
  }
  return <><div className="admin-page-head"><div><h1>上传文件</h1><p>支持图片、PDF、Word 和 Excel 文件</p></div><Link className="admin-secondary" href="/admin/media">返回媒体库</Link></div>
    <div className="admin-panel"><label className="admin-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); add(event.dataTransfer.files); }}><IconCloudUpload size={32} stroke={1.6} aria-hidden="true" /><span>拖拽文件到此处，或点击选择</span><input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.svg,.pdf,.docx,.xlsx" onChange={(event) => { if (event.target.files) add(event.target.files); }} /></label>
      {items.map((item, index) => <div className="admin-upload-row" key={`${item.file.name}-${index}`}><div><strong>{item.file.name}</strong><small>{(item.file.size / 1024).toFixed(1)} KB · {item.status === "done" ? "完成" : item.status === "error" ? item.error : item.status === "uploading" ? `${item.progress}%` : "等待上传"}</small></div><progress max="100" value={item.progress} /><div>{item.status === "waiting" || item.status === "error" ? <button className="admin-primary" onClick={() => upload(index)}>上传</button> : item.status === "uploading" ? <button className="admin-secondary" onClick={() => active.current?.abort()}>取消</button> : <Link className="admin-secondary" href={`/admin/media/${item.id}`}>查看</Link>}</div></div>)}
    </div>
  </>;
}
