import { NextResponse } from "next/server";
import { publishPolicy } from "@/lib/policyService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  try {
    const policy = await publishPolicy(id, body.approverId);
    return NextResponse.json({ policy });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
