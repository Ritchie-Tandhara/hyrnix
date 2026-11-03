import { NextResponse } from "next/server";
import { submitForApproval } from "@/lib/policyService";
import { requireAdminOrHr, ForbiddenError } from "@/lib/authz";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  try {
    await requireAdminOrHr(body.actorId);
    const policy = await submitForApproval(id, body.actorId);
    return NextResponse.json({ policy });
  } catch (err) {
    const status = err instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
