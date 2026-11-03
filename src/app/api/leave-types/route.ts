import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listAvailableLeaveTypesForEmployee } from "@/lib/policyService";
import { calculateBalance } from "@/lib/balance";
import { toEmployeeLite, toLeaveRequestLite } from "@/lib/mappers";

export async function GET(req: Request) {
  const employeeId = new URL(req.url).searchParams.get("employeeId");
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  }

  const employeeRow = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employeeRow) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const asOfDate = new Date();
  const [policies, requestRows] = await Promise.all([
    listAvailableLeaveTypesForEmployee(employeeId, asOfDate),
    prisma.leaveRequest.findMany({ where: { employeeId } }),
  ]);

  const employee = toEmployeeLite(employeeRow);
  const leaveRequests = requestRows.map(toLeaveRequestLite);

  const leaveTypes = policies.map((policy) => ({
    policyId: policy.id,
    policyKey: policy.policyKey,
    name: policy.name,
    version: policy.version,
    accrualRule: policy.accrualRule,
    balance: calculateBalance(employee, policy, leaveRequests, asOfDate),
  }));

  return NextResponse.json({ leaveTypes });
}
