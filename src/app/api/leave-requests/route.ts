import { NextResponse } from "next/server";
import { listLeaveRequests, submitLeaveRequest } from "@/lib/leaveService";

export async function GET() {
  const leaveRequests = await listLeaveRequests();
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
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
