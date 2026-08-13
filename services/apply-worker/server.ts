/**
 * Standalone HTTP worker for Cloud Run / local Playwright apply.
 *
 * Env:
 *   PORT (default 8080)
 *   APPLY_WORKER_SECRET
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (via createAdminClient)
 *
 * Cloud Run: deploy services/apply-worker Dockerfile; set APPLY_WORKER_URL to
 * https://…/run on the Next app queue side (or this service's /run).
 */
import http from "node:http";
import { processApplyRun } from "../../lib/apply/process-run";

const PORT = Number(process.env.PORT || 8080);
const SECRET = process.env.APPLY_WORKER_SECRET?.trim() || "";

function json(
  res: http.ServerResponse,
  status: number,
  body: Record<string, unknown>
) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw) as unknown;
}

const server = http.createServer(async (req, res) => {
  const url = req.url?.split("?")[0] || "/";

  if (req.method === "GET" && (url === "/" || url === "/health")) {
    json(res, 200, { ok: true, service: "hireiq-apply-worker" });
    return;
  }

  if (req.method === "POST" && url === "/run") {
    if (!SECRET) {
      json(res, 503, { error: "APPLY_WORKER_SECRET is not configured" });
      return;
    }
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (token !== SECRET) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }

    try {
      const body = (await readJson(req)) as { runId?: string };
      if (!body.runId || typeof body.runId !== "string") {
        json(res, 400, { error: "runId is required" });
        return;
      }
      const result = await processApplyRun(body.runId);
      json(res, 200, result);
    } catch (err) {
      json(res, 500, {
        error: err instanceof Error ? err.message : "Worker failed",
      });
    }
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`[apply-worker] listening on :${PORT}`);
});
