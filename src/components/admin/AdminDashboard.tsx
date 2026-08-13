"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AgreementRowActions } from "@/components/admin/AgreementRowActions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminAgreementSummary } from "@/lib/agreement";
import { AGREEMENT_STATUSES, type AgreementStatus } from "@/lib/supabase/types";

export function AdminDashboard() {
  const [items, setItems] = useState<AdminAgreementSummary[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AgreementStatus | "all">("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/agreements", { credentials: "include" });
        const json = (await response.json()) as { items?: AdminAgreementSummary[]; error?: string };
        if (!response.ok) throw new Error(json.error || "Unable to load agreements.");
        if (!cancelled) setItems(json.items ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load agreements.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (!needle) return true;
      const name = `${item.firstName} ${item.lastName}`.toLowerCase();
      return name.includes(needle) || item.email.toLowerCase().includes(needle);
    });
  }, [items, query, status]);

  return (
    <AdminShell
      title="Agreements"
      actions={
        <Link
          href="/admin/new"
          className="rounded-md bg-[#1e3a8a] px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-[#1e40af]"
        >
          Create New
        </Link>
      }
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Agreements</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, copy unique links, and create new service agreements.
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Search
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or email"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Status
          </span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AgreementStatus | "all")}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
          >
            <option value="all">All statuses</option>
            {AGREEMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Link</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    Loading agreements...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    {items.length === 0
                      ? "No agreements yet. Create one to generate a unique client link."
                      : "No agreements match this search."}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const name = [item.firstName, item.lastName].filter(Boolean).join(" ") || "Unnamed client";
                  return (
                    <tr key={item.token} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#111827]">{name}</p>
                        <p className="text-xs text-slate-500">{item.email || "No email"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                        {item.ghlSignedDocumentId ? (
                          <p className="mt-1 text-[11px] text-emerald-700">Signed copy synced</p>
                        ) : item.ghlSyncStatus === "synced" ? (
                          <p className="mt-1 text-[11px] text-slate-500">Signing link sent to GHL</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AgreementRowActions token={item.token} url={item.url} status={item.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
