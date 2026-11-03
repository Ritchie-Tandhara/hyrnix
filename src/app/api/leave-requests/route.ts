import { NextResponse } from "next/server";
import { listLeaveRequests, submitLeaveRequest } from "@/lib/leaveService";
import { lookupCaller, ForbiddenError } from "@/lib/authz";
import { isAdminOrHr } from "@/lib/roles";

export async function GET(req: Request) {
  const callerId = new URL(req.url).searchParams.get("callerId");
  const caller = await lookupCaller(callerId);

  // Non-admin/HR callers only ever see their own leave requests.
  const employeeIdFilter = caller && !isAdminOrHr(caller.role) ? caller.id : undefined;
  const leaveRequests = await listLeaveRequests({ employeeId: employeeIdFilter });
  return NextResponse.json({ leaveRequests });
}

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const leaveRequest = await submitLeaveRequest({
      employeeId: body.employeeId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      daysRequested: body.daysRequested ? Number(body.daysRequested) : undefined,
      actorId: body.actorId || undefined,
    });
    return NextResponse.json({ leaveRequest }, { status: 201 });
  } catch (err) {
    const status = err instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
