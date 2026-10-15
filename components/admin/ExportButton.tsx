"use client";

import { useEffect, useRef, useState } from "react";

type Job = { status: string; total: number; processed: number; download: string | null; error: string | null };

export default function ExportButton({ module, q }: { module: string; q: string }) {
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);

  useEffect(() => {
    if (!jobId || job?.status === "succeeded" || job?.status === "failed") return;
    const timer = setInterval(async () => {
      if (running.current) return;
      running.current = true;
      try {
        await fetch("/api/admin/export/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: jobId }) });
        const response = await fetch(`/api/admin/export/jobs?id=${encodeURIComponent(jobId)}`, { cache: "no-store" });
        const value = await response.json();
        if (!response.ok) throw new Error(value.message || "导出状态读取失败");
        setJob(value);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "导出失败"); }
      finally { running.current = false; }
    }, 1500);
    return () => clearInterval(timer);
  }, [jobId, job?.status]);

  async function start() {
    setBusy(true); setError(""); setJob(null);
    try {
      const response = await fetch("/api/admin/export/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module, q }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.message || "导出排队失败");
      setJobId(value.jobId); setJob({ status: "pending", total: value.total, processed: 0, download: null, error: null });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "导出失败"); }
    finally { setBusy(false); }
  }

  return <span className="admin-export-control">
    <button type="button" className="admin-secondary" onClick={start} disabled={busy || Boolean(jobId && job?.status !== "succeeded" && job?.status !== "failed")}>{busy ? "正在创建…" : "导出 CSV"}</button>
    {job && job.status !== "succeeded" && job.status !== "failed" && <small role="status">导出中 {job.processed}/{job.total}</small>}
    {job?.download && <a className="admin-secondary" href={job.download}>下载文件</a>}
    {(error || job?.error) && <small role="alert" className="admin-error">{error || job?.error}</small>}
  </span>;
}
