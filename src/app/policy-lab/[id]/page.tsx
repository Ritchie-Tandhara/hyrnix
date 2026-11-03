"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useActingUser } from "@/components/ActingUserContext";
import StatusBadge from "@/components/StatusBadge";

type EmployeeImpact = {
  employeeId: string;
  employeeName: string;
  department: string;
  before: { entitlementDays: number; remainingDays: number };
  after: { entitlementDays: number; remainingDays: number };
  deltaRemaining: number;
};

type SimulationResult = {
  affectedEmployeeCount: number;
  totalEntitlementDelta: number;
  perEmployee: EmployeeImpact[];
  conflicts: { conflictingPolicyName: string; conflictingPolicyVersion: number; reason: string }[];
};

type SimulationRun = {
  id: string;
  runAt: string;
  runBy: { name: string };
  affectedEmployeeCount: number;
  totalDaysDelta: number;
  conflictCount: number;
  outputSnapshot: string;
};

type PolicyDetail = {
  id: string;
  policyKey: string;
  name: string;
  version: number;
  description?: string | null;
  entitlementDays: number;
  eligibleGroup: string;
  accrualRule: string;
  carryForwardDays: number;
  effectiveDate: string;
  status: string;
  createdBy: { name: string };
  approvedBy?: { name: string } | null;
};

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { actingUserId } = useActingUser();

  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [simulationRuns, setSimulationRuns] = useState<SimulationRun[]>([]);
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; actor: { name: string }; timestamp: string; details: string }[]>([]);
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/policies/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setPolicy(d.policy);
        setSimulationRuns(d.simulationRuns ?? []);
        setAuditLogs(d.auditLogs ?? []);
        if (d.simulationRuns?.[0]) {
          setLatestResult(JSON.parse(d.simulationRuns[0].outputSnapshot));
        }
      });
  }

  useEffect(load, [id]);

  async function runAction(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/policies/${id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Action failed");
      return;
    }
    if (data.result) setLatestResult(data.result);
    load();
  }

  if (!policy) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            {policy.name} <span className="text-slate-400">v{policy.version}</span>
          </h1>
          <StatusBadge status={policy.status} />
        </div>
        <p className="mt-1 text-sm text-slate-500 font-mono">{policy.policyKey}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <Field label="Entitlement" value={`${policy.entitlementDays} days/yr`} />
        <Field label="Eligible group" value={policy.eligibleGroup} />
        <Field label="Accrual rule" value={policy.accrualRule} />
        <Field label="Carry-forward cap" value={`${policy.carryForwardDays} days`} />
        <Field label="Effective date" value={policy.effectiveDate.slice(0, 10)} />
        <Field label="Created by" value={policy.createdBy?.name} />
        <Field label="Approved by" value={policy.approvedBy?.name ?? "—"} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={busy || !["DRAFT", "SIMULATED"].includes(policy.status)}
          onClick={() => runAction("simulate", { runById: actingUserId })}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Run simulation
        </button>
        <button
          disabled={busy || policy.status !== "SIMULATED"}
          onClick={() => runAction("submit", { actorId: actingUserId })}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Submit for approval
        </button>
        <button
          disabled={busy || policy.status !== "PENDING_APPROVAL"}
          onClick={() => runAction("publish", { approverId: actingUserId })}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Publish
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {latestResult && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-medium text-slate-900">Latest simulation impact</h2>
          <div className="mb-4 flex gap-6 text-sm">
            <Stat label="Employees affected" value={latestResult.affectedEmployeeCount} />
            <Stat
              label="Net entitlement day delta"
              value={`${latestResult.totalEntitlementDelta >= 0 ? "+" : ""}${latestResult.totalEntitlementDelta}`}
            />
            <Stat label="Conflicts" value={latestResult.conflicts.length} warn={latestResult.conflicts.length > 0} />
          </div>

          {latestResult.conflicts.length > 0 && (
            <div className="mb-4 space-y-1 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              {latestResult.conflicts.map((c, i) => (
                <div key={i}>⚠ {c.reason}</div>
              ))}
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Dept</th>
                <th className="py-2 pr-4">Before entitlement</th>
                <th className="py-2 pr-4">After entitlement</th>
                <th className="py-2 pr-4">Before remaining</th>
                <th className="py-2 pr-4">After remaining</th>
                <th className="py-2 pr-4">Δ remaining</th>
              </tr>
            </thead>
            <tbody>
              {latestResult.perEmployee.map((e) => (
                <tr key={e.employeeId} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-800">{e.employeeName}</td>
                  <td className="py-2 pr-4 text-slate-500">{e.department}</td>
                  <td className="py-2 pr-4">{e.before.entitlementDays}</td>
                  <td className="py-2 pr-4">{e.after.entitlementDays}</td>
                  <td className="py-2 pr-4">{e.before.remainingDays}</td>
                  <td className="py-2 pr-4">{e.after.remainingDays}</td>
                  <td className={`py-2 pr-4 font-medium ${e.deltaRemaining >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {e.deltaRemaining >= 0 ? "+" : ""}
                    {e.deltaRemaining}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-medium text-slate-900">Simulation history</h2>
        {simulationRuns.length === 0 ? (
          <p className="text-sm text-slate-500">No simulations run yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {simulationRuns.map((s) => (
              <li key={s.id} className="flex justify-between border-b border-slate-100 pb-2">
                <span>
                  Run by {s.runBy.name} — {s.affectedEmployeeCount} affected, {s.totalDaysDelta >= 0 ? "+" : ""}
                  {s.totalDaysDelta} days, {s.conflictCount} conflict(s)
                </span>
                <span className="text-slate-400">{new Date(s.runAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-medium text-slate-900">Audit log</h2>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-slate-500">No audit events yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {auditLogs.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-slate-100 pb-2">
                <span>
                  <span className="font-medium">{a.action}</span> by {a.actor.name}
                </span>
                <span className="text-slate-400">{new Date(a.timestamp).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div>
      <div className={`text-xl font-semibold ${warn ? "text-amber-600" : "text-slate-900"}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
