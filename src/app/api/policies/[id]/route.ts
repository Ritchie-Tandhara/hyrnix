import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPolicy } from "@/lib/policyService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const policy = await getPolicy(id);
  if (!policy) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const simulationRuns = await prisma.simulationRun.findMany({
    where: { policyId: id },
    orderBy: { runAt: "desc" },
    include: { runBy: true },
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: "LeavePolicy", entityId: id },
    orderBy: { timestamp: "desc" },
    include: { actor: true },
  });

  return NextResponse.json({ policy, simulationRuns, auditLogs });
}
