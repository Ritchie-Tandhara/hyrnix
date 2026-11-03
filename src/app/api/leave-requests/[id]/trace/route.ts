import { NextResponse } from "next/server";
import { getProcessTracesForRequest, getLeaveRequest } from "@/lib/leaveService";
import { lookupCaller } from "@/lib/authz";
import { isAdminOrHr } from "@/lib/roles";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const callerId = new URL(req.url).searchParams.get("callerId");
  const caller = await lookupCaller(callerId);

  if (caller && !isAdminOrHr(caller.role)) {
    const leaveRequest = await getLeaveRequest(id);
    if (!leaveRequest || leaveRequest.employeeId !== caller.id) {
      return NextResponse.json({ error: "You can only view your own leave requests." }, { status: 403 });
    }
  }

  const traces = await getProcessTracesForRequest(id);
  return NextResponse.json({ traces });
}
