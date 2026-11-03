import { NextResponse } from "next/server";
import { simulatePolicy } from "@/lib/policyService";
import { requireAdminOrHr, ForbiddenError } from "@/lib/authz";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  try {
    await requireAdminOrHr(body.runById);
    const { simulationRun, result } = await simulatePolicy(id, body.runById);
    return NextResponse.json({ simulationRun, result });
  } catch (err) {
    const status = err instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
