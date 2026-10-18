"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Progress = { source: string; enabled: boolean; coveredThrough: string | null; availableThrough: string; pendingDays: number; error: string | null };
type Result = { source: string; status: string };

export default function AdminSyncOnOpen() {
  const router = useRouter();
  const [message, setMessage] = useState("检查数据…");
  useEffect(() => {
    let active = true;
    async function catchUp() {
      let changed = false;
      for (let attempt = 0; attempt < 30 && active; attempt++) {
        try {
          const response = await fetch("/api/admin/sync/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
          const body = await response.json() as { message?: string; results?: Result[]; progress?: Progress[] };
          if (!response.ok) throw new Error(body.message || "数据更新暂不可用");
          changed ||= Boolean(body.results?.some((item) => item.status === "succeeded"));
          const failed = body.results?.find((item) => item.status === "failed");
          if (failed) { if (active) setMessage("外部数据更新异常"); return; }
          const pending = (body.progress || []).filter((item) => item.enabled && item.pendingDays > 0);
          if (!pending.length) {
            if (active) { setMessage("数据已更新"); window.dispatchEvent(new Event("maige:data-synced")); if (changed) router.refresh(); }
            return;
          }
          if (active) setMessage(`正在补齐数据 · ${pending.reduce((total, item) => total + item.pendingDays, 0)} 天`);
          if (!body.results?.length) await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch { if (active) setMessage("外部数据更新暂不可用"); return; }
      }
      if (active) setMessage("数据正在分批补齐");
    }
    void catchUp();
    return () => { active = false; };
  }, [router]);
  return <span className="admin-sync-indicator" role="status">{message}</span>;
}
