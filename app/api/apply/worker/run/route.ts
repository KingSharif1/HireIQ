import { NextResponse } from "next/server";
import { processApplyRun } from "@/lib/apply/process-run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/apply/worker/run
 * Internal worker entry (Cloud Run can hit this OR use services/apply-worker).
 * Requires Bearer APPLY_WORKER_SECRET.
 *
 * Body: { runId: string }
 */
export async function POST(request: Request) {
  const secret = process.env.APPLY_WORKER_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "APPLY_WORKER_SECRET is not configured" },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { runId?: string };
  try {
    body = (await request.json()) as { runId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.runId || typeof body.runId !== "string") {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  try {
    const result = await processApplyRun(body.runId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
