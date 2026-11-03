import { NextResponse } from "next/server";
import { getLeaveRequest } from "@/lib/leaveService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leaveRequest = await getLeaveRequest(id);
  if (!leaveRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ leaveRequest });
}
