"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  CLIENT_ACCEPTANCE_TEXT,
  COMPANY_ACCEPTANCE_TEXT,
  COMPANY_READONLY_FIELDS,
  LEGAL_SECTIONS,
} from "@/config/agreement-content";
import { AgreementHeader } from "@/components/agreement/AgreementHeader";
import { AgreementSection } from "@/components/agreement/AgreementSection";
import { ClientAcceptance } from "@/components/agreement/ClientAcceptance";
import { CompanyAcceptance } from "@/components/agreement/CompanyAcceptance";
import { FeeFields } from "@/components/agreement/FeeFields";
import { FormField, TextArea, TextInput } from "@/components/agreement/FormField";
import { LegalBlocks } from "@/components/agreement/LegalBlocks";
import { ReadOnlyField } from "@/components/agreement/ReadOnlyField";
import { ServiceSelector } from "@/components/agreement/ServiceSelector";
import { isLocked } from "@/lib/field-locks";
import type { PublicAgreement } from "@/lib/supabase/types";
import { signAgreementSchema, type SignAgreementInput } from "@/lib/validation";

function localDate() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const PROGRESS_STEPS = [
  "Saving agreement",
  "Generating signed PDF",
  "Finalizing",
] as const;

async function readSignResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as { error?: string; alreadySigned?: boolean };
    } catch {
      return { error: text.slice(0, 240) || `Request failed (${response.status})` };
    }
  }
  const snippet = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
  return { error: snippet || `Request failed (${response.status})` };
}

export function AgreementForm({ agreement }: { agreement: PublicAgreement }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [progress, setProgress] = useState<(typeof PROGRESS_STEPS)[number] | null>(null);

  const defaultValues = useMemo<SignAgreementInput>(
    () => ({
      firstName: agreement.firstName,
      lastName: agreement.lastName,
      businessName: agreement.businessName,
      email: agreement.email,
      phone: agreement.phone,
      businessAddress: agreement.businessAddress,
      taxPeriod: agreement.taxPeriod,
      agreementDate: agreement.agreementDate || localDate(),
      businessesCovered: agreement.businessesCovered,
      selectedServices: agreement.selectedServices,
      otherService: agreement.otherService,
      serviceDescription: agreement.serviceDescription,
      serviceStartDate: agreement.serviceStartDate,
      serviceEndDate: agreement.serviceEndDate,
      setupFee: agreement.setupFee,
      monthlyFee: agreement.monthlyFee,
      setupFeeLabel: agreement.setupFeeLabel,
      monthlyFeeLabel: agreement.monthlyFeeLabel,
      paymentSchedule: agreement.paymentSchedule,
      paymentMethod: agreement.paymentMethod,
      acceptedTerms: false,
      clientSignature: "",
      clientPrintedName:
        agreement.clientPrintedName ||
        [agreement.firstName, agreement.lastName].filter(Boolean).join(" "),
      clientTitle: agreement.clientTitle,
      clientSignedDate: agreement.clientSignedDate || localDate(),
    }),
    [agreement],
  );

  const form = useForm<SignAgreementInput>({
    resolver: zodResolver(signAgreementSchema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const selectedServices = watch("selectedServices");
  const representativeDate = agreement.representativeDate || localDate();
  const submitting = isSubmitting || Boolean(progress);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError("");
    setProgress("Saving agreement");
    const timers = [
      window.setTimeout(() => setProgress("Generating signed PDF"), 700),
      window.setTimeout(() => setProgress("Finalizing"), 1600),
    ];

    try {
      const response = await fetch(`/api/agreements/${agreement.publicToken}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await readSignResponse(response);
      if (!response.ok) {
        throw new Error(payload.error || "Unable to sign the agreement.");
      }
      router.push(`/agreement/${agreement.publicToken}/completed`);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to sign the agreement.");
      setProgress(null);
    } finally {
      timers.forEach((timer) => window.clearTimeout(timer));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <AgreementHeader />

      <AgreementSection number={1} title="CLIENT INFORMATION">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Client First Name" required error={errors.firstName?.message}>
            <TextInput readOnly={isLocked(agreement.fieldLocks.firstName)} {...register("firstName")} />
          </FormField>
          <FormField label="Client Last Name" required error={errors.lastName?.message}>
            <TextInput readOnly={isLocked(agreement.fieldLocks.lastName)} {...register("lastName")} />
          </FormField>
          <FormField label="Business Name (if applicable)">
            <TextInput readOnly={isLocked(agreement.fieldLocks.businessName)} {...register("businessName")} />
          </FormField>
          <FormField label="Email" required error={errors.email?.message}>
            <TextInput type="email" readOnly={isLocked(agreement.fieldLocks.email)} {...register("email")} />
          </FormField>
          <FormField label="Phone" required error={errors.phone?.message}>
            <TextInput type="tel" readOnly={isLocked(agreement.fieldLocks.phone)} {...register("phone")} />
          </FormField>
          <FormField label="Tax Year(s) / Period Covered">
            <TextInput readOnly={isLocked(agreement.fieldLocks.taxPeriod)} {...register("taxPeriod")} />
          </FormField>
          <FormField label="Business Address">
            <TextInput readOnly={isLocked(agreement.fieldLocks.businessAddress)} {...register("businessAddress")} />
          </FormField>
          <FormField label="Agreement Date" error={errors.agreementDate?.message}>
            <TextInput type="date" readOnly={isLocked(agreement.fieldLocks.agreementDate)} {...register("agreementDate")} />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="Businesses Covered">
            <TextArea readOnly={isLocked(agreement.fieldLocks.businessesCovered)} {...register("businessesCovered")} />
          </FormField>
        </div>
      </AgreementSection>

      <AgreementSection number={2} title="UNIFIED TAX GROUP INFORMATION">
        <div className="space-y-3">
          {COMPANY_READONLY_FIELDS.map((field) => (
            <ReadOnlyField
              key={field.label}
              label={field.label}
              value={field.value}
              href={"href" in field ? field.href : undefined}
            />
          ))}
        </div>
      </AgreementSection>

      <AgreementSection number={3} title="SELECTED SERVICES">
        <ServiceSelector
          selected={selectedServices}
          locked={isLocked(agreement.fieldLocks.selectedServices)}
          onToggle={(id) => {
            const next = selectedServices.includes(id)
              ? selectedServices.filter((item) => item !== id)
              : [...selectedServices, id];
            setValue("selectedServices", next, { shouldValidate: true });
          }}
          otherService={watch("otherService")}
          onOtherService={(value) => setValue("otherService", value)}
          serviceDescription={watch("serviceDescription")}
          onServiceDescription={(value) => setValue("serviceDescription", value)}
          serviceDescriptionLocked={isLocked(agreement.fieldLocks.serviceDescription)}
          serviceStartDate={watch("serviceStartDate")}
          onServiceStartDate={(value) => setValue("serviceStartDate", value)}
          serviceEndDate={watch("serviceEndDate")}
          onServiceEndDate={(value) => setValue("serviceEndDate", value)}
          errors={{
            selectedServices: errors.selectedServices?.message,
            otherService: errors.otherService?.message,
          }}
        />
      </AgreementSection>

      <AgreementSection number={4} title="FEES & PAYMENT TERMS">
        <FeeFields
          setupFee={watch("setupFee")}
          monthlyFee={watch("monthlyFee")}
          setupFeeLabel={watch("setupFeeLabel")}
          monthlyFeeLabel={watch("monthlyFeeLabel")}
          paymentSchedule={watch("paymentSchedule")}
          paymentMethod={watch("paymentMethod")}
          locked={isLocked(agreement.fieldLocks.setupFee)}
          onChange={(field, value) => setValue(field, value)}
        />
        <div className="mt-5">
          <LegalBlocks blocks={LEGAL_SECTIONS.find((section) => section.number === 4)?.blocks ?? []} />
        </div>
      </AgreementSection>

      {LEGAL_SECTIONS.filter((section) => section.number >= 5 && section.number <= 19).map((section) => (
        <AgreementSection key={section.id} number={section.number} title={section.title}>
          <LegalBlocks blocks={section.blocks} />
        </AgreementSection>
      ))}

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <AgreementSection number={20} title="CLIENT ACCEPTANCE" className="mt-8 lg:mt-8">
          <p className="mb-5 text-[15px] leading-7 text-[#111827]">{CLIENT_ACCEPTANCE_TEXT}</p>
          <ClientAcceptance
            accepted={Boolean(watch("acceptedTerms"))}
            onAccepted={(value) => setValue("acceptedTerms", value, { shouldValidate: true })}
            printedName={watch("clientPrintedName")}
            onPrintedName={(value) => setValue("clientPrintedName", value)}
            title={watch("clientTitle")}
            onTitle={(value) => setValue("clientTitle", value)}
            date={watch("clientSignedDate")}
            onDate={(value) => setValue("clientSignedDate", value)}
            onSignature={(value) => setValue("clientSignature", value, { shouldValidate: true })}
            disabled={submitting}
            errors={{
              acceptedTerms: errors.acceptedTerms?.message,
              clientSignature: errors.clientSignature?.message,
              clientPrintedName: errors.clientPrintedName?.message,
              clientSignedDate: errors.clientSignedDate?.message,
            }}
          />
        </AgreementSection>

        <AgreementSection number={21} title="UNIFIED TAX GROUP ACCEPTANCE" className="mt-8">
          <p className="mb-5 text-[15px] leading-7 text-[#111827]">{COMPANY_ACCEPTANCE_TEXT}</p>
          <CompanyAcceptance
            printedName={agreement.representativeName}
            title={agreement.representativeTitle}
            date={representativeDate}
            signatureDataUrl={agreement.representativeSignatureDataUrl}
          />
        </AgreementSection>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        {submitError ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-[#1e3a8a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
        >
          {submitting ? "Finalizing your agreement..." : "Sign Agreement"}
        </button>
        {progress ? (
          <p className="mt-3 text-sm text-[#475569]">
            {progress}...
          </p>
        ) : null}
      </div>
    </form>
  );
}
