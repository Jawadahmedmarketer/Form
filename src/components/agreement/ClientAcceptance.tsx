"use client";

import { ACCEPTANCE_CHECKBOX_LABEL } from "@/config/agreement-content";
import { FormField, TextInput } from "@/components/agreement/FormField";
import { SignaturePad } from "@/components/agreement/SignaturePad";

export function ClientAcceptance({
  accepted,
  onAccepted,
  printedName,
  onPrintedName,
  title,
  onTitle,
  date,
  onDate,
  onSignature,
  errors,
  disabled,
}: {
  accepted: boolean;
  onAccepted: (value: boolean) => void;
  printedName: string;
  onPrintedName: (value: string) => void;
  title: string;
  onTitle: (value: string) => void;
  date: string;
  onDate: (value: string) => void;
  onSignature: (value: string) => void;
  errors?: {
    acceptedTerms?: string;
    clientSignature?: string;
    clientPrintedName?: string;
    clientSignedDate?: string;
  };
  disabled?: boolean;
}) {
  return (
    <div className="space-y-5">
      <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-3 text-sm text-[#111827]">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[#1d4ed8]"
          checked={accepted}
          disabled={disabled}
          onChange={(event) => onAccepted(event.target.checked)}
        />
        <span>
          {ACCEPTANCE_CHECKBOX_LABEL}
          <span className="text-red-600"> *</span>
        </span>
      </label>
      {errors?.acceptedTerms ? (
        <p className="text-xs text-red-600">{errors.acceptedTerms}</p>
      ) : null}

      <div>
        <p className="mb-1.5 text-sm font-medium text-[#111827]">
          Client Signature <span className="text-red-600">*</span>
        </p>
        <SignaturePad onChange={onSignature} error={errors?.clientSignature} disabled={disabled} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Printed Name" required error={errors?.clientPrintedName}>
          <TextInput
            value={printedName}
            disabled={disabled}
            onChange={(event) => onPrintedName(event.target.value)}
          />
        </FormField>
        <FormField label="Title (if signing for a business)">
          <TextInput value={title} disabled={disabled} onChange={(event) => onTitle(event.target.value)} />
        </FormField>
        <FormField label="Date" required error={errors?.clientSignedDate}>
          <TextInput
            type="date"
            value={date}
            disabled={disabled}
            onChange={(event) => onDate(event.target.value)}
          />
        </FormField>
      </div>
    </div>
  );
}
