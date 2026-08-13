import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApplyRunRow } from "@/lib/apply/types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

/**
 * GET /api/apply/runs/[runId]
 * Poll hosted apply run status for the signed-in user.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { runId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("apply_runs")
    .select(
      "id, user_id, job_id, application_id, mode, status, complexity, board, apply_url, submit, error, result, started_at, finished_at, created_at, updated_at"
    )
    .eq("id", runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Apply run not found" }, { status: 404 });
  }

  return NextResponse.json({ run: data as ApplyRunRow });
}
