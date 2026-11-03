import { NextResponse } from "next/server";
import { createDraftPolicy, listPolicies } from "@/lib/policyService";
import { requireAdminOrHr, ForbiddenError } from "@/lib/authz";

export async function GET() {
  const policies = await listPolicies();
  return NextResponse.json({ policies });
}

export async function POST(req: Request) {
  const body = await req.json();

  try {
    await requireAdminOrHr(body.createdById);
    const policy = await createDraftPolicy({
      policyKey: body.policyKey || undefined,
      name: body.name,
      description: body.description,
      entitlementDays: Number(body.entitlementDays),
      eligibleGroup: body.eligibleGroup,
      accrualRule: body.accrualRule,
      carryForwardDays: Number(body.carryForwardDays ?? 0),
      effectiveDate: new Date(body.effectiveDate),
      createdById: body.createdById,
    });
    return NextResponse.json({ policy }, { status: 201 });
  } catch (err) {
    const status = err instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
