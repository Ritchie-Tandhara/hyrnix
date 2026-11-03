import { PrismaClient } from "@prisma/client";
import { evaluateLeaveRequest } from "../src/lib/decision";
import { daysBetweenInclusive } from "../src/lib/balance";

const prisma = new PrismaClient();

const DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Finance", "Support", "People"];

const FIRST_NAMES = [
  "Ava", "Ben", "Cho", "Dana", "Eli", "Fay", "Gus", "Hana", "Ivan", "Jade",
  "Kai", "Lia", "Milo", "Nia", "Omar", "Pia", "Quinn", "Rhea", "Sam", "Tara",
  "Uma", "Vik", "Wren", "Xia", "Yosef", "Zara", "Alden", "Bree", "Cyrus", "Dina",
  "Eden", "Finn", "Gia", "Hugo", "Isla", "Jude", "Kira", "Leo", "Mira", "Nolan",
];
const LAST_NAMES = [
  "Nguyen", "Okafor", "Smith", "Garcia", "Kim", "Patel", "Dubois", "Rossi",
  "Muller", "Haddad", "Larsson", "Tanaka", "Silva", "Novak", "Petrov", "Ali",
  "Costa", "Weber", "Chen", "Ivanov",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function main() {
  console.log("Seeding HYRNIX demo data...");

  // Clear existing data (dev convenience; order matters for FKs).
  await prisma.hyrnixQuery.deleteMany();
  await prisma.processTrace.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.simulationRun.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leavePolicy.deleteMany();
  await prisma.employee.deleteMany();

  // --- CEO / root of the org, no manager ---
  const ceo = await prisma.employee.create({
    data: {
      name: "Rhea Kapoor",
      email: "rhea.kapoor@hyrnix.demo",
      department: "People",
      role: "ADMIN",
      hireDate: new Date("2018-01-10"),
    },
  });

  // --- HR lead reporting to CEO (approver role in the demo) ---
  const hrLead = await prisma.employee.create({
    data: {
      name: "Marcus Oyelaran",
      email: "marcus.oyelaran@hyrnix.demo",
      department: "People",
      role: "HR",
      hireDate: new Date("2019-03-01"),
      managerId: ceo.id,
    },
  });

  // --- Department heads (managers), reporting to CEO ---
  const deptHeads: Record<string, { id: string }> = {};
  for (let i = 0; i < DEPARTMENTS.length; i++) {
    const dept = DEPARTMENTS[i];
    if (dept === "People") continue; // HR lead already covers People leadership
    const head = await prisma.employee.create({
      data: {
        name: `${pick(FIRST_NAMES, i + 7)} ${pick(LAST_NAMES, i + 2)}`,
        email: `head.${dept.toLowerCase()}@hyrnix.demo`,
        department: dept,
        role: "MANAGER",
        hireDate: new Date(`2019-0${(i % 9) + 1}-15`),
        managerId: ceo.id,
      },
    });
    deptHeads[dept] = head;
  }

  // --- Rank and file employees ---
  const employees = [ceo, hrLead, ...Object.values(deptHeads)];
  const TOTAL_EMPLOYEES = 42;
  let nameIdx = 0;

  for (let i = 0; i < TOTAL_EMPLOYEES; i++) {
    const dept = pick(DEPARTMENTS, i);
    const first = pick(FIRST_NAMES, nameIdx);
    const last = pick(LAST_NAMES, nameIdx + 5);
    nameIdx++;

    // A few employees (every 11th) have no manager on file, to support
    // future PeopleOps Radar "orphaned report" detection — not acted on in this pass.
    const noManager = i % 11 === 0;
    const manager = dept === "People" ? hrLead : deptHeads[dept];

    const hireYear = 2020 + (i % 5);
    const hireMonth = String((i % 12) + 1).padStart(2, "0");
    const hireDay = String((i % 27) + 1).padStart(2, "0");

    const emp = await prisma.employee.create({
      data: {
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@hyrnix.demo`,
        department: dept,
        role: "EMPLOYEE",
        hireDate: new Date(`${hireYear}-${hireMonth}-${hireDay}`),
        managerId: noManager ? null : manager?.id ?? null,
      },
    });
    employees.push(emp);
  }

  console.log(`Created ${employees.length} employees.`);

  // --- Initial published leave policy: 18 days/year for everyone ---
  const policyV1 = await prisma.leavePolicy.create({
    data: {
      policyKey: "standard-annual-leave",
      name: "Standard Annual Leave",
      version: 1,
      description: "Baseline company-wide annual leave entitlement.",
      entitlementDays: 18,
      eligibleGroup: "all",
      accrualRule: "ANNUAL_UPFRONT",
      carryForwardDays: 5,
      effectiveDate: new Date("2023-01-01"),
      status: "PUBLISHED",
      createdById: hrLead.id,
      approvedById: ceo.id,
    },
  });

  console.log(`Created published policy: ${policyV1.name} v${policyV1.version} (${policyV1.entitlementDays} days).`);

  // --- Two more independent leave types, each its own entitlement pool ---
  const sickLeave = await prisma.leavePolicy.create({
    data: {
      policyKey: "sick-leave",
      name: "Sick Leave",
      version: 1,
      description: "Company-wide sick leave entitlement, separate from annual leave.",
      entitlementDays: 10,
      eligibleGroup: "all",
      accrualRule: "ANNUAL_UPFRONT",
      carryForwardDays: 0,
      effectiveDate: new Date("2023-01-01"),
      status: "PUBLISHED",
      createdById: hrLead.id,
      approvedById: ceo.id,
    },
  });

  const casualLeave = await prisma.leavePolicy.create({
    data: {
      policyKey: "casual-leave",
      name: "Casual Leave",
      version: 1,
      description: "Short-notice casual leave entitlement, separate from annual leave.",
      entitlementDays: 6,
      eligibleGroup: "all",
      accrualRule: "ANNUAL_UPFRONT",
      carryForwardDays: 0,
      effectiveDate: new Date("2023-01-01"),
      status: "PUBLISHED",
      createdById: hrLead.id,
      approvedById: ceo.id,
    },
  });

  console.log(`Created published policy: ${sickLeave.name} v${sickLeave.version} (${sickLeave.entitlementDays} days).`);
  console.log(`Created published policy: ${casualLeave.name} v${casualLeave.version} (${casualLeave.entitlementDays} days).`);

  // --- Seed a few leave requests across different types, with full traces ---
  const sampleEmployees = employees.filter((e) => e.id !== ceo.id && e.id !== hrLead.id).slice(0, 3);

  function toPolicyLite(row: typeof policyV1) {
    return {
      id: row.id,
      policyKey: row.policyKey,
      name: row.name,
      version: row.version,
      entitlementDays: row.entitlementDays,
      eligibleGroup: row.eligibleGroup,
      accrualRule: row.accrualRule as "ANNUAL_UPFRONT" | "MONTHLY_ACCRUAL",
      carryForwardDays: row.carryForwardDays,
      effectiveDate: row.effectiveDate,
      status: row.status as "PUBLISHED",
    };
  }

  async function seedLeaveRequest(
    employeeId: string,
    policy: typeof policyV1,
    start: Date,
    end: Date,
    days: number,
    halfDay = false
  ) {
    const employeeRow = await prisma.employee.findUniqueOrThrow({ where: { id: employeeId } });
    const existing = await prisma.leaveRequest.findMany({ where: { employeeId } });
    const policyLite = toPolicyLite(policy);

    const trace = evaluateLeaveRequest({
      employee: { id: employeeRow.id, name: employeeRow.name, department: employeeRow.department, hireDate: employeeRow.hireDate },
      policy: policyLite,
      requestStartDate: start,
      requestEndDate: end,
      daysRequested: days,
      existingLeaveRequests: existing.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        startDate: r.startDate,
        endDate: r.endDate,
        daysRequested: r.daysRequested,
        status: r.status as "PENDING" | "APPROVED" | "REJECTED",
        policyVersionId: r.policyVersionId,
      })),
    });

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId,
        startDate: start,
        endDate: end,
        daysRequested: days,
        halfDay,
        status: trace.outcome,
        policyVersionId: policy.id,
        decisionReasoning: trace.reasoning,
        decidedById: hrLead.id,
        decidedAt: new Date(),
      },
    });

    await prisma.processTrace.create({
      data: {
        leaveRequestId: leaveRequest.id,
        triggerEvent: trace.triggerEvent,
        policyVersionId: trace.policyVersionId,
        rulesEvaluated: JSON.stringify(trace.rulesEvaluated),
        inputs: JSON.stringify(trace.inputs),
        outcome: trace.outcome,
        actorId: hrLead.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "LeaveRequest",
        entityId: leaveRequest.id,
        action: "EVALUATED",
        actorId: hrLead.id,
        details: JSON.stringify({ outcome: trace.outcome, policyVersionId: policy.id }),
      },
    });

    return leaveRequest;
  }

  if (sampleEmployees.length >= 3) {
    const approvedDays = daysBetweenInclusive(new Date("2024-02-01"), new Date("2024-02-03"));
    await seedLeaveRequest(sampleEmployees[0].id, policyV1, new Date("2024-02-01"), new Date("2024-02-03"), approvedDays);

    // Request for more days than the policy allows -> rejected trace.
    await seedLeaveRequest(sampleEmployees[1].id, policyV1, new Date("2024-03-01"), new Date("2024-03-25"), 25);

    // A half-day sick leave request, same start/end date, 0.5 days.
    await seedLeaveRequest(sampleEmployees[2].id, sickLeave, new Date("2024-04-10"), new Date("2024-04-10"), 0.5, true);
  }

  console.log("Seeded 3 sample leave requests (annual approved, annual rejected, half-day sick) with Process X-Ray traces.");
  console.log("Seed complete. Use Policy Lab in the app to propose/simulate/publish a new policy version,");
  console.log("then submit a new leave request to see Process X-Ray reference the new version.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
