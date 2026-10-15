const target = process.env.WORKER_API_URL || "http://localhost:3000/api/cron";
const secret = process.env.CRON_SECRET;
if (!secret || secret.length < 24) throw new Error("CRON_SECRET of at least 24 characters is required");
const interval = Math.max(5, Number(process.env.WORKER_INTERVAL_MINUTES) || 5) * 60_000;
let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    for (let cycle = 0; cycle < 250; cycle++) {
      const response = await fetch(target, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`cron HTTP ${response.status}`);
      const body = await response.json();
      if (cycle === 0 || cycle % 10 === 0 || (body.importJob?.status !== "pending" && body.exportJob?.status !== "pending")) console.log(JSON.stringify({ time: new Date().toISOString(), queued: body.queued, results: body.results, importJob: body.importJob, exportJob: body.exportJob }));
      if (body.importJob?.status !== "pending" && body.exportJob?.status !== "pending") break;
    }
  } catch (error) { console.error("Worker tick failed", error instanceof Error ? error.message : "unknown"); }
  finally { running = false; }
}
await tick();
setInterval(tick, interval);
