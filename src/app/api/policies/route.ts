import { NextResponse } from "next/server";
import { createDraftPolicy, listPolicies } from "@/lib/policyService";

export async function GET() {
  const policies = await listPolicies();
  return NextResponse.json({ policies });
}

export async function POST(req: Request) {
  const body = await req.json();

  try {
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
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
