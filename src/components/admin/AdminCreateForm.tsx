"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminShell } from "@/components/admin/AdminShell";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { FormField, TextArea, TextInput } from "@/components/agreement/FormField";
import { SignaturePad } from "@/components/agreement/SignaturePad";
import { SERVICE_OPTIONS } from "@/config/services";
import { adminCreateFormSchema, type AdminCreateFormInput } from "@/lib/validation";

function localDate() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function defaultValues(): AdminCreateFormInput {
  return {
    firstName: "",
    lastName: "",
    businessName: "",
    representativeName: "",
    representativeTitle: "",
    representativeSignature: "",
    email: "",
    phone: "",
    businessAddress: "",
    taxPeriod: String(new Date().getFullYear()),
    agreementDate: localDate(),
    businessesCovered: "",
    selectedServices: ["monthly_bookkeeping"],
    otherService: "",
    serviceDescription: "",
    serviceStartDate: "",
    serviceEndDate: "",
    setupFee: "",
    monthlyFee: "",
    paymentSchedule: "Setup due on signing; monthly thereafter",
    paymentMethod: "Card or ACH",
    ghlContactId: "",
    paymentUrl: "",
    status: "sent",
  };
}

export function AdminCreateForm() {
  const [submitError, setSubmitError] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const defaults = useMemo(() => defaultValues(), []);

  const form = useForm<AdminCreateFormInput>({
    resolver: zodResolver(adminCreateFormSchema),
    defaultValues: defaults,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const selectedServices = watch("selectedServices");

  function toggleService(id: (typeof SERVICE_OPTIONS)[number]["id"]) {
    const next = selectedServices.includes(id)
      ? selectedServices.filter((value) => value !== id)
      : [...selectedServices, id];
    setValue("selectedServices", next, { shouldValidate: true });
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError("");
    setCreatedUrl("");
    try {
      const response = await fetch("/api/admin/agreements", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await response.json()) as { error?: string; url?: string };
      if (!response.ok) throw new Error(json.error || "Unable to create agreement.");
      setCreatedUrl(json.url || "");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to create agreement.");
    }
  });

  function createAnother() {
    setCreatedUrl("");
    setSubmitError("");
    reset(defaultValues());
  }

  return (
    <AdminShell
      title="Create agreement"
      actions={
        <Link
          href="/admin"
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          All agreements
        </Link>
      }
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#111827]">Create agreement</h1>
        <p className="mt-1 text-sm text-slate-500">
          Prefill the client record, then copy the unique signing link. Fee fields stay locked for the client.
        </p>
      </div>

      {createdUrl ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm font-semibold text-emerald-900">Agreement created</p>
          <p className="mt-1 text-sm text-emerald-800">
            Share this unique link with the client. Anyone with the link can open the agreement.
          </p>
          <div className="mt-4 rounded-lg border border-emerald-200 bg-white px-4 py-3">
            <p className="break-all font-mono text-sm text-[#111827]">{createdUrl}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <CopyLinkButton value={createdUrl} />
            <a
              href={createdUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Open link
            </a>
            <button
              type="button"
              onClick={createAnother}
              className="inline-flex items-center rounded-md bg-[#1e3a8a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af]"
            >
              Create another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          {submitError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          <Section title="Client Info">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First name" required error={errors.firstName?.message}>
                <TextInput error={errors.firstName?.message} {...register("firstName")} />
              </FormField>
              <FormField label="Last name" required error={errors.lastName?.message}>
                <TextInput error={errors.lastName?.message} {...register("lastName")} />
              </FormField>
              <FormField label="Email" required error={errors.email?.message}>
                <TextInput type="email" error={errors.email?.message} {...register("email")} />
              </FormField>
              <FormField label="Phone" error={errors.phone?.message}>
                <TextInput error={errors.phone?.message} {...register("phone")} />
              </FormField>
              <FormField label="Business name" error={errors.businessName?.message}>
                <TextInput error={errors.businessName?.message} {...register("businessName")} />
              </FormField>
              <FormField label="Representative name" error={errors.representativeName?.message}>
                <TextInput
                  placeholder="Jawad Ahmed"
                  error={errors.representativeName?.message}
                  {...register("representativeName")}
                />
              </FormField>
              <FormField label="Representative title" error={errors.representativeTitle?.message}>
                <TextInput
                  placeholder="CEO"
                  error={errors.representativeTitle?.message}
                  {...register("representativeTitle")}
                />
              </FormField>
              <div>
                <p className="mb-1.5 text-sm font-medium text-[#111827]">
                  Representative signature
                </p>
                <SignaturePad
                  onChange={(value) => setValue("representativeSignature", value, { shouldValidate: true })}
                  error={errors.representativeSignature?.message}
                />
                <p className="mt-1 text-xs text-[#475569]">
                  Leave blank to use the default authorized signature on file.
                </p>
              </div>
              <FormField label="Tax year(s)" error={errors.taxPeriod?.message}>
                <TextInput error={errors.taxPeriod?.message} {...register("taxPeriod")} />
              </FormField>
              <FormField label="Agreement date" error={errors.agreementDate?.message}>
                <TextInput type="date" error={errors.agreementDate?.message} {...register("agreementDate")} />
              </FormField>
              <FormField label="Business address" error={errors.businessAddress?.message}>
                <TextInput error={errors.businessAddress?.message} {...register("businessAddress")} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Businesses covered" error={errors.businessesCovered?.message}>
                  <TextArea error={errors.businessesCovered?.message} {...register("businessesCovered")} />
                </FormField>
              </div>
            </div>
          </Section>

          <Section title="Selected Services">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SERVICE_OPTIONS.map((service) => (
                <label key={service.id} className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                    className="h-4 w-4 rounded border-slate-300 text-[#1e3a8a]"
                  />
                  {service.label}
                </label>
              ))}
            </div>
            {errors.selectedServices?.message ? (
              <p className="mt-2 text-xs text-red-600">{errors.selectedServices.message}</p>
            ) : null}
            {selectedServices.includes("other") ? (
              <div className="mt-4">
                <FormField label="Other service" required error={errors.otherService?.message}>
                  <TextInput error={errors.otherService?.message} {...register("otherService")} />
                </FormField>
              </div>
            ) : null}
          </Section>

          <Section title="Services">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField label="Service description" error={errors.serviceDescription?.message}>
                  <TextArea error={errors.serviceDescription?.message} {...register("serviceDescription")} />
                </FormField>
              </div>
              <FormField label="Service start date" error={errors.serviceStartDate?.message}>
                <TextInput type="date" error={errors.serviceStartDate?.message} {...register("serviceStartDate")} />
              </FormField>
              <FormField label="Service end date" error={errors.serviceEndDate?.message}>
                <TextInput type="date" error={errors.serviceEndDate?.message} {...register("serviceEndDate")} />
              </FormField>
            </div>
          </Section>

          <Section title="Fees & Payment">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Setup fee" error={errors.setupFee?.message}>
                <TextInput placeholder="$2,387" error={errors.setupFee?.message} {...register("setupFee")} />
              </FormField>
              <FormField label="Monthly fee" error={errors.monthlyFee?.message}>
                <TextInput placeholder="$217/month" error={errors.monthlyFee?.message} {...register("monthlyFee")} />
              </FormField>
              <FormField label="Payment schedule" error={errors.paymentSchedule?.message}>
                <TextInput error={errors.paymentSchedule?.message} {...register("paymentSchedule")} />
              </FormField>
              <FormField label="Payment method" error={errors.paymentMethod?.message}>
                <TextInput error={errors.paymentMethod?.message} {...register("paymentMethod")} />
              </FormField>
              <FormField label="Payment URL (optional)" error={errors.paymentUrl?.message}>
                <TextInput
                  placeholder="https://"
                  error={errors.paymentUrl?.message}
                  {...register("paymentUrl")}
                />
              </FormField>
              <FormField label="GHL contact ID (optional)" error={errors.ghlContactId?.message}>
                <TextInput error={errors.ghlContactId?.message} {...register("ghlContactId")} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Link status" error={errors.status?.message}>
                  <select
                    {...register("status")}
                    className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20"
                  >
                    <option value="sent">Sent — active client link</option>
                    <option value="draft">Draft</option>
                  </select>
                </FormField>
              </div>
            </div>
          </Section>

          <div className="flex items-center justify-end gap-3">
            <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-800">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#1e3a8a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:bg-slate-400"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create agreement link"
              )}
            </button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 border-b border-slate-100 pb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}
