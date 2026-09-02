"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminShell } from "@/components/admin/AdminShell";
import { BusinessCoveredBuilder } from "@/components/admin/BusinessCoveredBuilder";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { FormField, TextArea, TextInput } from "@/components/agreement/FormField";
import { SERVICE_OPTIONS } from "@/config/services";
import { adminCreateFormSchema, type AdminCreateFormInput } from "@/lib/validation";
import { Dancing_Script } from "next/font/google";

const signatureFont = Dancing_Script({ subsets: ["latin"], weight: ["700"] });

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
    serviceEndDate: "Ongoing — no fixed end date",
    setupFee: "",
    monthlyFee: "",
    setupFeeLabel: "",
    monthlyFeeLabel: "",
    paymentSchedule: "Setup due on signing; monthly thereafter",
    paymentMethod: "Card / bank payment via secure payment link",
    ghlContactId: "",
    paymentUrl: "",
    status: "sent",
  };
}

function nameToSignatureDataUrl(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `64px ${signatureFont.style.fontFamily}`;
  ctx.fillText(trimmed, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL("image/png");
}

export function AdminCreateForm({
  mode = "create",
  token,
  initialValues,
}: {
  mode?: "create" | "edit";
  token?: string;
  initialValues?: AdminCreateFormInput;
} = {}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const defaults = useMemo(
    () => (mode === "edit" && initialValues ? initialValues : defaultValues()),
    [mode, initialValues],
  );

  const [isOngoingEndDate, setIsOngoingEndDate] = useState(
    !defaults.serviceEndDate || !/^\d{4}-\d{2}-\d{2}$/.test(defaults.serviceEndDate),
  );

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
  const representativeName = watch("representativeName");

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
      const representativeSignature = nameToSignatureDataUrl(values.representativeName);
      const payload = { ...values, representativeSignature };

      if (mode === "edit" && token) {
        const response = await fetch(`/api/admin/agreements/${token}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(json.error || "Unable to save changes.");
        router.push("/admin");
        return;
      }

      const response = await fetch("/api/admin/agreements", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { error?: string; url?: string };
      if (!response.ok) throw new Error(json.error || "Unable to create agreement.");
      setCreatedUrl(json.url || "");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to save.");
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
        <h1 className="text-2xl font-semibold text-[#111827]">
          {mode === "edit" ? "Edit agreement" : "Create agreement"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "edit"
            ? "Update the client record. The signing link and status stay the same."
            : "Prefill the client record, then copy the unique signing link. Fee fields stay locked for the client."}
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
                  error={errors.representativeName?.message}
                  {...register("representativeName")}
                />
              </FormField>
              <FormField label="Representative title" error={errors.representativeTitle?.message}>
                <TextInput
                  placeholder="Senior Advisor"
                  error={errors.representativeTitle?.message}
                  {...register("representativeTitle")}
                />
              </FormField>
              <div>
                <p className="mb-1.5 text-sm font-medium text-[#111827]">
                  Signature preview
                </p>
                <div className="flex min-h-[96px] items-center justify-center rounded-md border border-slate-200 bg-[#f8fafc] px-4 py-6">
                  <span className={`${signatureFont.className} text-4xl text-[#111827]`}>
                    {representativeName || "Representative name"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#475569]">
                  This signature is generated automatically from the representative
                  name above — no drawing needed. Leave the name blank to use the
                  default authorized signature instead.
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
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Businesses covered
                </label>
                <BusinessCoveredBuilder
                  value={watch("businessesCovered")}
                  onChange={(val) => setValue("businessesCovered", val, { shouldValidate: true })}
                  error={errors.businessesCovered?.message}
                />
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Service end date</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOngoingEndDate(true);
                        setValue("serviceEndDate", "Ongoing — no fixed end date");
                      }}
                      className={`rounded-md px-2.5 py-1 font-medium transition ${
                        isOngoingEndDate
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Ongoing
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOngoingEndDate(false);
                        setValue("serviceEndDate", "");
                      }}
                      className={`rounded-md px-2.5 py-1 font-medium transition ${
                        !isOngoingEndDate
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Specific Date
                    </button>
                  </div>
                </div>
                {isOngoingEndDate ? (
                  <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
                    Ongoing — no fixed end date
                  </div>
                ) : (
                  <TextInput
                    type="date"
                    error={errors.serviceEndDate?.message}
                    {...register("serviceEndDate")}
                  />
                )}
                {errors.serviceEndDate?.message ? (
                  <p className="text-xs text-red-600">{errors.serviceEndDate.message}</p>
                ) : null}
              </div>
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
              {mode === "create" ? (
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
              ) : null}
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
