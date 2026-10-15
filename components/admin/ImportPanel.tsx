"use client";
import { useRef, useState } from "react";

type Job = { jobId: string; status: string; total: number; processed: number; success: number; failed: number; errors: { row: number; message: string }[] };
type Preview = { total: number; rows: Record<string, unknown>[] };

export default function ImportPanel({ module }: { module: "products" | "categories" }) {
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState<Preview | null>(null);
  const [job, setJob] = useState<Job | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const staged = useRef(""); const active = useRef(true);
  async function json(response: Response) { const body = await response.json(); if (!response.ok) throw new Error(body.message || body.code || "请求失败"); return body; }
  async function stagedRequest(isPreview: boolean) {
    if (!file) throw new Error("请选择文件");
    if (!staged.current) {
      const signed = await json(await fetch("/api/admin/import/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module, filename: file.name, size: file.size }) }));
      const put = await fetch(signed.url, { method: "PUT", headers: { "Content-Type": signed.contentType }, body: file });
      if (!put.ok) throw new Error("对象存储直传失败，请检查存储 CORS 设置");
      staged.current = signed.key;
    }
    return json(await fetch("/api/admin/import/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module, filename: file.name, key: staged.current, preview: isPreview }) }));
  }
  async function send(isPreview: boolean) {
    if (!file) return; setBusy(true); setError("");
    try {
      let result;
      if (file.size > 4 * 1024 * 1024) result = await stagedRequest(isPreview);
      else { const form = new FormData(); form.append("module", module); form.append("file", file); form.append("preview", String(isPreview)); result = await json(await fetch("/api/admin/import", { method: "POST", body: form })); }
      if (isPreview) setPreview(result);
      else { setPreview(null); setJob({ jobId: result.jobId, status: "pending", total: result.total, processed: 0, success: 0, failed: 0, errors: [] }); void process(result.jobId); }
    } catch (err) { setError(err instanceof Error ? err.message : "导入失败"); setBusy(false); }
    if (isPreview) setBusy(false);
  }
  async function process(id: string) {
    active.current = true;
    while (active.current) {
      try {
        await json(await fetch("/api/admin/import/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }));
        const state = await json(await fetch(`/api/admin/import/jobs?id=${id}`)) as Job;
        setJob(state);
        if (["succeeded", "partial", "failed"].includes(state.status)) break;
        await new Promise((resolve) => setTimeout(resolve, state.status === "running" ? 800 : 100));
      } catch (err) { setError(err instanceof Error ? err.message : "处理失败"); break; }
    }
    setBusy(false);
  }
  function downloadErrors() {
    if (!job) return;
    const cells = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = `\uFEFFrow,message\r\n${job.errors.map((item) => `${cells(item.row)},${cells(item.message)}`).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `maige-${module}-import-errors.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="admin-panel"><h2>批量导入</h2><p>支持 CSV 和 XLSX，最多 20 MB / 20,000 行。先预览再导入；后台任务逐行记录结果，正确记录不会因其他行出错而丢失。超过 4 MB 的文件通过对象存储直传。</p><a href={`/api/admin/import?module=${module}`}>下载 CSV 模板</a><div className="admin-form-actions"><input type="file" accept=".csv,.xlsx" onChange={(event) => { setFile(event.target.files?.[0] || null); staged.current = ""; active.current = false; setPreview(null); setJob(null); }} /><button className="admin-secondary" disabled={!file || busy} onClick={() => send(true)}>预览</button>{preview && <button className="admin-primary" disabled={busy} onClick={() => send(false)}>确认导入 {preview.total} 行</button>}</div>
    {error && <p className="admin-error" role="alert">{error}</p>}{preview && <><p>共 {preview.total} 行，显示前 {preview.rows.length} 行：</p><pre className="admin-import-preview">{JSON.stringify(preview.rows, null, 2)}</pre></>}
    {job && <div className="admin-import-status"><h3>导入任务 {job.jobId}</h3><p>状态：{job.status} · 已处理 {job.processed} / {job.total} · 成功 {job.success} · 失败 {job.failed}</p><progress max={Math.max(1, job.total)} value={job.processed} />{job.errors.length > 0 && <><button className="admin-secondary" onClick={downloadErrors}>下载错误报告 CSV</button><pre className="admin-import-preview">{job.errors.slice(0, 30).map((item) => `第 ${item.row} 行：${item.message}`).join("\n")}</pre></>}</div>}
  </div>;
}
