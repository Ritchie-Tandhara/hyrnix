"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActingUser } from "@/components/ActingUserContext";
import StatusBadge from "@/components/StatusBadge";

type Policy = {
  id: string;
  policyKey: string;
  name: string;
  version: number;
  entitlementDays: number;
  eligibleGroup: string;
  accrualRule: string;
  carryForwardDays: number;
  effectiveDate: string;
  status: string;
  createdBy: { name: string };
  approvedBy?: { name: string } | null;
};

export default function PolicyLabPage() {
  const { actingUserId } = useActingUser();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPolicyKeySuggestion] = useState(() => `policy-${Date.now()}`);

  const [form, setForm] = useState({
    policyKey: "standard-annual-leave",
    name: "Standard Annual Leave",
    description: "",
    entitlementDays: 24,
    eligibleGroup: "all",
    accrualRule: "ANNUAL_UPFRONT",
    carryForwardDays: 5,
    effectiveDate: "2026-01-01",
  });

  function load() {
    fetch("/api/policies")
      .then((r) => r.json())
      .then((d) => setPolicies(d.policies ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const policyKeys = Array.from(new Set(policies.map((p) => p.policyKey)));

  async function createDraft(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, createdById: actingUserId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create policy");
      return;
    }
    setShowForm(false);
    load();
  }

  const grouped = policyKeys.map((key) => ({
    key,
    versions: policies.filter((p) => p.policyKey === key).sort((a, b) => b.version - a.version),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Policy Lab</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Propose a leave policy change, simulate its impact against real employee data, then move it
            through approval to publication.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? "Cancel" : "Propose policy change"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createDraft} className="space-y-4 rounded-xl border border-border bg-surface shadow-sm p-5">
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Policy key (group)</span>
              <select
                className="w-full rounded border border-border px-2 py-1.5"
                value={form.policyKey}
                onChange={(e) => {
                  const key = e.target.value;
                  const existing = policies.find((p) => p.policyKey === key);
                  setForm((f) => ({ ...f, policyKey: key, name: existing?.name ?? f.name }));
                }}
              >
                {policyKeys.length === 0 && <option value="standard-annual-leave">standard-annual-leave</option>}
                {policyKeys.map((k) => (
                  <option key={k} value={k}>
                    {k} (new version)
                  </option>
                ))}
                <option value={newPolicyKeySuggestion}>+ brand new policy</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Name</span>
              <input
                className="w-full rounded border border-border px-2 py-1.5"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Entitlement days / year</span>
              <input
                type="number"
                step="0.5"
                className="w-full rounded border border-border px-2 py-1.5"
                value={form.entitlementDays}
                onChange={(e) => setForm((f) => ({ ...f, entitlementDays: Number(e.target.value) }))}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Eligible group</span>
              <select
                className="w-full rounded border border-border px-2 py-1.5"
                value={form.eligibleGroup}
                onChange={(e) => setForm((f) => ({ ...f, eligibleGroup: e.target.value }))}
              >
                <option value="all">all</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
                <option value="Support">Support</option>
                <option value="People">People</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Accrual rule</span>
              <select
                className="w-full rounded border border-border px-2 py-1.5"
                value={form.accrualRule}
                onChange={(e) => setForm((f) => ({ ...f, accrualRule: e.target.value }))}
              >
                <option value="ANNUAL_UPFRONT">Annual upfront</option>
                <option value="MONTHLY_ACCRUAL">Monthly accrual</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Carry-forward days (max)</span>
              <input
                type="number"
                step="0.5"
                className="w-full rounded border border-border px-2 py-1.5"
                value={form.carryForwardDays}
                onChange={(e) => setForm((f) => ({ ...f, carryForwardDays: Number(e.target.value) }))}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Effective date</span>
              <input
                type="date"
                className="w-full rounded border border-border px-2 py-1.5"
                value={form.effectiveDate}
                onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
              />
            </label>

            <label className="col-span-2 block text-sm">
              <span className="mb-1 block font-medium text-foreground">Description (optional)</span>
              <input
                className="w-full rounded border border-border px-2 py-1.5"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Create draft
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.key} className="rounded-xl border border-border bg-surface shadow-sm p-5">
              <h2 className="mb-3 font-mono text-sm text-muted-foreground">{g.key}</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4">Version</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Entitlement</th>
                    <th className="py-2 pr-4">Eligible group</th>
                    <th className="py-2 pr-4">Effective date</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Created by</th>
                  </tr>
                </thead>
                <tbody>
                  {g.versions.map((p) => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="py-2 pr-4">v{p.version}</td>
                      <td className="py-2 pr-4">
                        <Link href={`/policy-lab/${p.id}`} className="font-medium text-foreground underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{p.entitlementDays} days</td>
                      <td className="py-2 pr-4">{p.eligibleGroup}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{p.effectiveDate.slice(0, 10)}</td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{p.createdBy?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
