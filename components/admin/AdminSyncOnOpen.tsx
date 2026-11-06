"use client";

import { useEffect, useState } from "react";

type Progress = { source: string; enabled: boolean; coveredThrough: string | null; availableThrough: string; pendingDays: number; error: string | null };
type Result = { source: string; status: string };

export default function AdminSyncOnOpen({ canRefresh }: { canRefresh: boolean }) {
  const [message, setMessage] = useState("检查数据…");
  useEffect(() => {
    let active = true;
    async function catchUp() {
      for (let attempt = 0; attempt < (canRefresh ? 12 : 1) && active; attempt++) {
        try {
          const response = await fetch("/api/admin/sync/refresh", canRefresh ? { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" } : undefined);
          const body = await response.json() as { message?: string; results?: Result[]; progress?: Progress[] };
          if (!response.ok) throw new Error(body.message || "数据更新暂不可用");
          const failed = body.results?.find((item) => item.status === "failed");
          if (failed || body.progress?.some((item) => item.enabled && item.error)) { if (active) setMessage("外部数据更新异常"); return; }
          if (body.progress?.every((item) => !item.enabled)) { if (active) setMessage("外部数据同步已停用"); return; }
          const pending = (body.progress || []).filter((item) => item.enabled && item.pendingDays > 0);
          if (!pending.length) {
            if (active) { setMessage("数据已更新"); window.dispatchEvent(new Event("maige:data-synced")); }
            return;
          }
          if (!canRefresh) { if (active) setMessage("外部数据等待同步"); return; }
          if (active) setMessage(`正在补齐数据 · ${pending.reduce((total, item) => total + item.pendingDays, 0)} 天`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch { if (active) setMessage("外部数据更新暂不可用"); return; }
      }
      if (active) setMessage("数据正在分批补齐");
    }
    void catchUp();
    return () => { active = false; };
  }, [canRefresh]);
  return <span className="admin-sync-indicator" role="status">{message}</span>;
}
