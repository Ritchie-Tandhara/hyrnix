import { prisma } from "./prisma";

export async function recordAuditLog(params: {
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  details: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actorId: params.actorId,
      details: JSON.stringify(params.details),
    },
  });
}
