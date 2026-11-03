"use client";

import { useEffect, useState } from "react";
import { useActingUser } from "@/components/ActingUserContext";
import StatusBadge from "@/components/StatusBadge";
import { isAdminOrHr } from "@/lib/roles";

type LeaveRequest = {
  id: string;
  employee: { id: string; name: string; department: string };
  startDate: string;
  endDate: string;
  daysRequested: number;
  halfDay: boolean;
  status: string;
  policyVersion: { name: string; version: number };
  decisionReasoning?: string | null;
  createdAt: string;
};

type LeaveType = {
  policyId: string;
  policyKey: string;
  name: string;
  balance: { remainingDays: number };
};

type RuleResult = { rule: string; passed: boolean; detail: string };
type Trace = {
  id: string;
  triggerEvent: string;
  outcome: string;
  timestamp: string;
  rulesEvaluated: string;
  inputs: string;
};

type SimpleEmployee = { id: string; name: string; department: string };

export default function ProcessXrayPage() {
  const { actingUserId, actingUser } = useActingUser();
  const admin = isAdminOrHr(actingUser?.role);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ employeeId: "", policyKey: "", startDate: "", endDate: "", halfDay: false });
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  function loadRequests() {
    const qs = actingUserId ? `?callerId=${encodeURIComponent(actingUserId)}` : "";
    fetch(`/api/leave-requests${qs}`)
      .then((r) => r.json())
      .then((d) => setRequests(d.leaveRequests ?? []));
  }

  useEffect(() => {
    loadRequests();
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingUserId]);

  useEffect(() => {
    if (!selectedId) return;
    const qs = actingUserId ? `?callerId=${encodeURIComponent(actingUserId)}` : "";
    fetch(`/api/leave-requests/${selectedId}/trace${qs}`)
      .then((r) => r.json())
      .then((d) => setTraces(d.traces ?? []));
  }, [selectedId, actingUserId]);

  const targetEmployeeId = admin ? form.employeeId : actingUserId;

  useEffect(() => {
    if (!targetEmployeeId) return;
    fetch(`/api/leave-types?employeeId=${encodeURIComponent(targetEmployeeId)}`)
      .then((r) => r.json())
      .then((d) => {
        const types: LeaveType[] = d.leaveTypes ?? [];
        setLeaveTypes(types);
        setForm((f) => (types.some((t) => t.policyKey === f.policyKey) ? f : { ...f, policyKey: types[0]?.policyKey ?? "" }));
      });
  }, [targetEmployeeId]);

  const selected = requests.find((r) => r.id === selectedId) ?? null;
  const sameDayRequest = form.startDate !== "" && form.startDate === form.endDate;

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const employeeId = admin ? form.employeeId : actingUserId ?? "";
    const res = await fetch("/api/leave-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, employeeId, halfDay: sameDayRequest && form.halfDay, actorId: actingUserId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to submit leave request");
      return;
    }
    setShowForm(false);
    setForm((f) => ({ ...f, startDate: "", endDate: "", halfDay: false }));
    loadRequests();
    setSelectedId(data.leaveRequest.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Process X-Ray</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            {admin
              ? "Pick a leave request to see exactly which policy version and rules produced its outcome."
              : "Your leave requests, and exactly why each one was approved or rejected."}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? "Cancel" : "Submit leave request"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitRequest} className="grid grid-cols-4 gap-3 rounded-xl border border-border bg-surface shadow-sm p-5">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-foreground">Employee</span>
            {admin ? (
              <select
                required
                className="w-full rounded border border-border px-2 py-1.5"
                value={form.employeeId}
                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              >
                <option value="">select…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.department})
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex w-full items-center rounded border border-border bg-surface-muted px-2 py-1.5 text-muted-foreground">
                You ({actingUser?.name})
              </div>
            )}
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-foreground">Leave type</span>
            <select
              required
              className="w-full rounded border border-border px-2 py-1.5"
              value={form.policyKey}
              onChange={(e) => setForm((f) => ({ ...f, policyKey: e.target.value }))}
              disabled={leaveTypes.length === 0}
            >
              {leaveTypes.length === 0 && <option value="">no leave type available</option>}
              {leaveTypes.map((t) => (
                <option key={t.policyKey} value={t.policyKey}>
                  {t.name} ({t.balance.remainingDays}d left)
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-foreground">Start date</span>
            <input
              type="date"
              required
              className="w-full rounded border border-border px-2 py-1.5"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-foreground">End date</span>
            <input
              type="date"
              required
              className="w-full rounded border border-border px-2 py-1.5"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </label>

          <div className="col-span-4 flex items-center justify-between">
            <label
              className={`flex items-center gap-2 text-sm ${sameDayRequest ? "text-foreground" : "text-muted-foreground"}`}
            >
              <input
                type="checkbox"
                disabled={!sameDayRequest}
                checked={sameDayRequest && form.halfDay}
                onChange={(e) => setForm((f) => ({ ...f, halfDay: e.target.checked }))}
              />
              Half day {!sameDayRequest && "(same start/end date only)"}
            </label>
            <button type="submit" className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
              Submit &amp; evaluate
            </button>
          </div>
          {error && <p className="col-span-4 text-sm text-danger">{error}</p>}
        </form>
      )}

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 rounded-xl border border-border bg-surface shadow-sm p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">{admin ? "Leave requests" : "Your leave requests"}</h2>
          <ul className="divide-y divide-border">
            {requests.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelectedId(r.id)}
                  className={`block w-full px-2 py-2 text-left text-sm hover:bg-surface-muted ${
                    selectedId === r.id ? "bg-surface-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{r.employee.name}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)} · {r.daysRequested}d
                    {r.halfDay && " (half day)"} · {r.policyVersion.name} v{r.policyVersion.version}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-3 rounded-xl border border-border bg-surface shadow-sm p-5">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a leave request to see its decision trace.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-medium text-foreground">
                  {selected.employee.name} — {selected.daysRequested} day(s)
                  {selected.halfDay && <span className="ml-2 rounded bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Half day</span>}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selected.startDate.slice(0, 10)} → {selected.endDate.slice(0, 10)} · evaluated against{" "}
                  <span className="font-medium">
                    {selected.policyVersion.name} v{selected.policyVersion.version}
                  </span>
                </p>
                <div className="mt-2">
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              <div className="rounded border border-border bg-surface-muted p-3 text-sm text-foreground">
                {selected.decisionReasoning}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Step-by-step trace</h3>
                {traces.map((t) => {
                  const rules: RuleResult[] = JSON.parse(t.rulesEvaluated);
                  return (
                    <div key={t.id} className="mb-3 rounded border border-border p-3">
                      <div className="mb-2 text-xs text-muted-foreground">
                        {t.triggerEvent} · {new Date(t.timestamp).toLocaleString()}
                      </div>
                      <ol className="space-y-2">
                        {rules.map((rule, i) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <span
                              className={`mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                rule.passed ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                              }`}
                            >
                              {rule.passed ? "✓" : "✗"}
                            </span>
                            <div>
                              <div className="font-medium text-foreground">{rule.rule.replace(/_/g, " ")}</div>
                              <div className="text-muted-foreground">{rule.detail}</div>
                            </div>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-2 text-sm font-medium">
                        Outcome: <StatusBadge status={t.outcome} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
