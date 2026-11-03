import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const employees = await prisma.employee.findMany({
    include: { manager: true },
    orderBy: [{ department: "asc" }, { name: "asc" }],
  });

  const departments = Array.from(new Set(employees.map((e) => e.department))).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">People</h1>
        <p className="mt-1 text-muted-foreground">
          {employees.length} employees across {departments.length} departments.
        </p>
      </div>

      {departments.map((dept) => {
        const deptEmployees = employees.filter((e) => e.department === dept);
        return (
          <div key={dept} className="rounded-xl border border-border bg-surface shadow-sm p-5">
            <h2 className="mb-3 text-lg font-medium text-foreground">
              {dept} <span className="text-sm font-normal text-muted-foreground">({deptEmployees.length})</span>
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Manager</th>
                  <th className="py-2 pr-4">Hire date</th>
                </tr>
              </thead>
              <tbody>
                {deptEmployees.map((e) => (
                  <tr key={e.id} className="border-b border-border">
                    <td className="py-2 pr-4 font-medium text-foreground">{e.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{e.email}</td>
                    <td className="py-2 pr-4">{e.role}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {e.manager ? e.manager.name : <span className="italic text-muted-foreground">none</span>}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{e.hireDate.toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
