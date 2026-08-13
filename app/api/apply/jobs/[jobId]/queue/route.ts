import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ApplyQueueError,
  dispatchApplyWorker,
  queueServerApply,
} from "@/lib/apply/queue";
import { processApplyRun } from "@/lib/apply/process-run";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

/**
 * POST /api/apply/jobs/[jobId]/queue
 * Queue a Cloud Run hosted apply (dry-run fill by default).
 */
export async function POST(request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let submit = false;
  try {
    const body = (await request.json()) as { submit?: boolean };
    submit = body.submit === true;
  } catch {
    /* empty body OK */
  }

  try {
    const run = await queueServerApply({
      userId: user.id,
      jobId,
      submit,
    });

    let dispatch = await dispatchApplyWorker(run.id);

    // Local/dev only: never run Playwright on Vercel — Cloud Run (or npm run apply:worker).
    if (!dispatch.dispatched && process.env.APPLY_WORKER_INLINE === "1") {
      void processApplyRun(run.id).catch((err) => {
        console.error("[apply/queue] inline worker failed", err);
      });
      dispatch = {
        dispatched: true,
        reason: "inline processApplyRun started",
      };
    }

    return NextResponse.json(
      {
        run,
        dispatch,
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof ApplyQueueError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to queue apply";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
