import { NextResponse } from "next/server";
import { publishPolicy } from "@/lib/policyService";
import { requireAdminOrHr, ForbiddenError } from "@/lib/authz";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  try {
    await requireAdminOrHr(body.approverId);
    const policy = await publishPolicy(id, body.approverId);
    return NextResponse.json({ policy });
  } catch (err) {
    const status = err instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
