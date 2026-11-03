import { NextResponse } from "next/server";
import { simulatePolicy } from "@/lib/policyService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  try {
    const { simulationRun, result } = await simulatePolicy(id, body.runById);
    return NextResponse.json({ simulationRun, result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
