import { NextResponse } from "next/server";
import { getProcessTracesForRequest } from "@/lib/leaveService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const traces = await getProcessTracesForRequest(id);
  return NextResponse.json({ traces });
}
