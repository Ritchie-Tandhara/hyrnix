-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "daysRequested" REAL NOT NULL,
    "halfDay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "policyVersionId" TEXT NOT NULL,
    "decisionReasoning" TEXT,
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "LeavePolicy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LeaveRequest" ("createdAt", "daysRequested", "decidedAt", "decidedById", "decisionReasoning", "employeeId", "endDate", "id", "policyVersionId", "startDate", "status", "updatedAt") SELECT "createdAt", "daysRequested", "decidedAt", "decidedById", "decisionReasoning", "employeeId", "endDate", "id", "policyVersionId", "startDate", "status", "updatedAt" FROM "LeaveRequest";
DROP TABLE "LeaveRequest";
ALTER TABLE "new_LeaveRequest" RENAME TO "LeaveRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
