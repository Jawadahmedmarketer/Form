"use client";

import { useEffect, useState } from "react";
import {
  ACCOUNTING_BASIS_OPTIONS,
  emptyBusinessItem,
  formatBusinesses,
  parseBusinesses,
  type BusinessItem,
} from "@/lib/business-builder";

export function BusinessCoveredBuilder({
  value,
  onChange,
  error,
  readOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  readOnly?: boolean;
}) {
  const [items, setItems] = useState<BusinessItem[]>(() => parseBusinesses(value));

  // Sync external changes if value changes from outside
  useEffect(() => {
    const parsed = parseBusinesses(value);
    if (formatBusinesses(parsed) !== formatBusinesses(items)) {
      setItems(parsed);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateItem = (index: number, field: keyof BusinessItem, val: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    setItems(next);
    onChange(formatBusinesses(next));
  };

  const addItem = () => {
    const next = [...items, emptyBusinessItem()];
    setItems(next);
    onChange(formatBusinesses(next));
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      const next = [emptyBusinessItem()];
      setItems(next);
      onChange("");
      return;
    }
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    onChange(formatBusinesses(next));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800">Businesses</h4>
          <p className="text-xs text-slate-500">
            Every business we&apos;re servicing — printed on the agreement and saved to the client&apos;s profile.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items
          .filter((item, index) => {
            if (!readOnly) return true;
            if (index === 0) return true;
            return Boolean(
              item.name.trim() ||
              item.nature.trim() ||
              item.software.trim() ||
              (item.accountingBasis.trim() && item.accountingBasis !== "Select..."),
            );
          })
          .map((item, index) => (
          <div
            key={index}
            className="relative rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Business {index + 1}
              </span>
              {!readOnly && items.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  title="Remove this business"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Business Name
                </label>
                <input
                  type="text"
                  value={item.name}
                  disabled={readOnly}
                  onChange={(e) => updateItem(index, "name", e.target.value)}
                  placeholder="Acme LLC"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100 disabled:text-slate-700"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Nature of Business
                  </label>
                  <input
                    type="text"
                    value={item.nature}
                    disabled={readOnly}
                    onChange={(e) => updateItem(index, "nature", e.target.value)}
                    placeholder="e.g. Retail"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100 disabled:text-slate-700"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Software Used
                  </label>
                  <input
                    type="text"
                    value={item.software}
                    disabled={readOnly}
                    onChange={(e) => updateItem(index, "software", e.target.value)}
                    placeholder="e.g. QuickBooks - None"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100 disabled:text-slate-700"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Accounting Basis
                  </label>
                  <select
                    value={item.accountingBasis || "Select..."}
                    disabled={readOnly}
                    onChange={(e) => updateItem(index, "accountingBasis", e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100 disabled:text-slate-700"
                  >
                    {ACCOUNTING_BASIS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!readOnly ? (
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        >
          <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add business
        </button>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
