"use client";

import { useState, type FormEvent } from "react";
import { SERVICE_OPTIONS } from "@/config/services";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const selectedServices = SERVICE_OPTIONS
      .map((service) => service.id)
      .filter((id) => form.get(`service_${id}`) === "on");

    const payload = {
      firstName: String(form.get("firstName") || ""),
      lastName: String(form.get("lastName") || ""),
      businessName: String(form.get("businessName") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      businessAddress: String(form.get("businessAddress") || ""),
      taxPeriod: String(form.get("taxPeriod") || ""),
      agreementDate: String(form.get("agreementDate") || ""),
      businessesCovered: String(form.get("businessesCovered") || ""),
      selectedServices,
      otherService: String(form.get("otherService") || ""),
      serviceDescription: String(form.get("serviceDescription") || ""),
      serviceStartDate: String(form.get("serviceStartDate") || ""),
      serviceEndDate: String(form.get("serviceEndDate") || "Ongoing — no fixed end date"),
      setupFee: String(form.get("setupFee") || ""),
      monthlyFee: String(form.get("monthlyFee") || ""),
      paymentSchedule: String(form.get("paymentSchedule") || ""),
      paymentMethod: String(form.get("paymentMethod") || ""),
      status: "sent",
    };

    try {
      const response = await fetch("/api/admin/agreements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { error?: string; url?: string };
      if (!response.ok) throw new Error(json.error || "Unable to create agreement.");
      setResult(json.url || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create agreement.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-3xl text-[#111827]">Create Agreement</h1>
      <p className="mt-2 text-sm text-[#475569]">
        Prefill a service agreement and copy the unique client link. Requires ADMIN_API_SECRET.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-md bg-white p-6 shadow-sm">
        <label className="block text-sm">
          Admin secret
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2"
            required
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <input name="firstName" placeholder="First name" defaultValue="John" className="rounded-md border border-slate-200 px-3 py-2" />
          <input name="lastName" placeholder="Last name" defaultValue="Smith" className="rounded-md border border-slate-200 px-3 py-2" />
          <input name="email" placeholder="Email" defaultValue="john@example.com" className="rounded-md border border-slate-200 px-3 py-2" />
          <input name="phone" placeholder="Phone" defaultValue="+1 555-0100" className="rounded-md border border-slate-200 px-3 py-2" />
          <input name="businessName" placeholder="Business name" className="rounded-md border border-slate-200 px-3 py-2" />
          <input name="taxPeriod" placeholder="Tax year(s)" defaultValue="2025" className="rounded-md border border-slate-200 px-3 py-2" />
          <input name="setupFee" placeholder="Setup fee" defaultValue="$2,387" className="rounded-md border border-slate-200 px-3 py-2" />
          <input name="monthlyFee" placeholder="Monthly fee" defaultValue="$217/month" className="rounded-md border border-slate-200 px-3 py-2" />
          <input name="paymentSchedule" placeholder="Payment schedule" defaultValue="Setup due on signing; monthly thereafter" className="rounded-md border border-slate-200 px-3 py-2 sm:col-span-2" />
          <input name="paymentMethod" placeholder="Payment method" defaultValue="Card or ACH" className="rounded-md border border-slate-200 px-3 py-2 sm:col-span-2" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SERVICE_OPTIONS.map((service) => (
            <label key={service.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`service_${service.id}`}
                defaultChecked={service.id === "monthly_bookkeeping"}
              />
              {service.label}
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#1e3a8a] px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-400"
        >
          {pending ? "Creating..." : "Create agreement link"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {result ? (
          <p className="break-all text-sm text-emerald-700">
            Agreement URL: <a className="underline" href={result}>{result}</a>
          </p>
        ) : null}
      </form>
    </main>
  );
}
