import {
  AGREEMENT_INTRO,
  CLIENT_ACCEPTANCE_TEXT,
  COMPANY_ACCEPTANCE_TEXT,
  COMPANY_READONLY_FIELDS,
  LEGAL_SECTIONS,
} from "@/config/agreement-content";
import { COMPANY } from "@/config/company";
import { SERVICE_OPTIONS, normalizeSelectedServices } from "@/config/services";
import { AgreementSection } from "@/components/agreement/AgreementSection";
import { LegalBlocks } from "@/components/agreement/LegalBlocks";
import { ReadOnlyField } from "@/components/agreement/ReadOnlyField";
import { formatLongDate } from "@/lib/dates";
import { maskIp } from "@/lib/ip";
import type { AgreementRow } from "@/lib/supabase/types";

function display(value?: string | null) {
  return value?.trim() || "—";
}

function LinedField({
  label,
  value,
  signatureUrl,
}: {
  label: string;
  value?: string;
  signatureUrl?: string | null;
}) {
  return (
    <div className="border-b border-slate-300 pb-2">
      <div className="flex min-h-12 items-end">
        {signatureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signatureUrl} alt={label} className="max-h-12 max-w-full object-contain object-left" />
        ) : (
          <p className="text-[15px] text-[#111827]">{value || " "}</p>
        )}
      </div>
      <p className="mt-2 text-[10px] font-semibold tracking-[0.14em] text-[#64748b]">{label}</p>
    </div>
  );
}

function SignatureBlock({
  signatureLabel,
  dataUrl,
  printedName,
  title,
  titleLabel,
  date,
}: {
  signatureLabel: string;
  dataUrl: string | null;
  printedName: string;
  title: string;
  titleLabel: string;
  date: string;
}) {
  return (
    <div className="space-y-6">
      <LinedField label={signatureLabel} signatureUrl={dataUrl} />
      <LinedField label="PRINTED NAME" value={display(printedName)} />
      <LinedField label={titleLabel} value={display(title)} />
      <LinedField label="DATE" value={display(date)} />
    </div>
  );
}

export function SignedAgreementRecord({
  row,
  clientSignatureDataUrl,
  representativeSignatureDataUrl,
}: {
  row: AgreementRow;
  clientSignatureDataUrl: string | null;
  representativeSignatureDataUrl: string | null;
}) {
  const selected = normalizeSelectedServices(row.selected_services);
  const clientName =
    row.client_printed_name ||
    [row.first_name, row.last_name].filter(Boolean).join(" ");

  return (
    <article className="border-t-[6px] border-[#1e3a8a] bg-white px-4 py-8 shadow-[0_10px_40px_rgba(15,23,42,0.08)] sm:px-10 sm:py-12 md:px-14">
      <header className="border-b border-slate-200 pb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-[#1e3a8a] font-serif text-2xl font-bold text-white">
          U
        </div>
        <p className="text-lg font-semibold text-[#111827]">{COMPANY.brandName}</p>
        <h1 className="mt-2 text-[22px] font-bold tracking-[0.14em] text-[#2563EB]">
          SERVICE AGREEMENT
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-[#475569]">
          {AGREEMENT_INTRO}
        </p>
      </header>

      <AgreementSection number={1} title="CLIENT INFORMATION">
        <div className="space-y-3">
          <ReadOnlyField label="Client Full Name" value={display(clientName)} />
          <ReadOnlyField label="Business Name (if applicable)" value={display(row.business_name)} />
          <ReadOnlyField label="Email" value={display(row.email)} />
          <ReadOnlyField label="Phone" value={display(row.phone)} />
          <ReadOnlyField label="Business Address" value={display(row.business_address)} />
          <ReadOnlyField label="Tax Year(s) / Period Covered" value={display(row.tax_period)} />
          <ReadOnlyField label="Agreement Date" value={display(formatLongDate(row.agreement_date))} />
          <ReadOnlyField label="Businesses Covered" value={display(row.businesses_covered)} />
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
        <p className="mb-4 text-sm text-[#475569]">
          Please select all services included under this Agreement:
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SERVICE_OPTIONS.map((service) => {
            const checked = selected.includes(service.id);
            return (
              <div
                key={service.id}
                className="flex items-center gap-3 rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                    checked ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-slate-400 bg-white"
                  }`}
                >
                  {checked ? (
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 8.5l3 3 7-7" />
                    </svg>
                  ) : null}
                </span>
                {service.label}
              </div>
            );
          })}
        </div>
        <div className="mt-5 space-y-3">
          <ReadOnlyField label="Other Service" value={display(row.other_service)} />
          <ReadOnlyField label="Service Description / Notes" value={display(row.service_description)} />
          <ReadOnlyField label="Service Start Date" value={display(formatLongDate(row.service_start_date))} />
          <ReadOnlyField label="Service End Date" value={display(formatLongDate(row.service_end_date) || row.service_end_date)} />
        </div>
      </AgreementSection>

      <AgreementSection number={4} title="FEES & PAYMENT TERMS">
        <div className="mb-5 space-y-3">
          <ReadOnlyField label="Total Cost / Setup Fee" value={display(row.setup_fee)} />
          <ReadOnlyField label="Monthly Fee (if applicable)" value={display(row.monthly_fee)} />
          <ReadOnlyField label="Payment Schedule" value={display(row.payment_schedule)} />
          <ReadOnlyField label="Payment Method" value={display(row.payment_method)} />
        </div>
        <LegalBlocks blocks={LEGAL_SECTIONS.find((section) => section.number === 4)?.blocks ?? []} />
      </AgreementSection>

      {LEGAL_SECTIONS.filter((section) => section.number >= 5 && section.number <= 19).map((section) => (
        <AgreementSection key={section.id} number={section.number} title={section.title}>
          <LegalBlocks blocks={section.blocks} />
        </AgreementSection>
      ))}

      <div className="grid gap-10 lg:grid-cols-2">
        <AgreementSection number={20} title="CLIENT ACCEPTANCE">
          <p className="mb-6 text-[15px] leading-7 text-[#111827]">{CLIENT_ACCEPTANCE_TEXT}</p>
          <SignatureBlock
            signatureLabel="CLIENT SIGNATURE"
            dataUrl={clientSignatureDataUrl}
            printedName={row.client_printed_name || ""}
            title={row.client_title || ""}
            titleLabel="TITLE (IF SIGNING FOR A BUSINESS)"
            date={formatLongDate(row.client_signed_date)}
          />
        </AgreementSection>

        <AgreementSection number={21} title="UNIFIED TAX GROUP ACCEPTANCE">
          <p className="mb-6 text-[15px] leading-7 text-[#111827]">{COMPANY_ACCEPTANCE_TEXT}</p>
          <SignatureBlock
            signatureLabel="AUTHORIZED REPRESENTATIVE SIGNATURE"
            dataUrl={representativeSignatureDataUrl}
            printedName={row.representative_name || ""}
            title={row.representative_title || ""}
            titleLabel="TITLE"
            date={formatLongDate(row.representative_date)}
          />
        </AgreementSection>
      </div>

      <p className="mt-10 border-t border-slate-200 pt-4 text-xs text-[#64748b]">
        Electronically signed {formatLongDate(row.signed_at)} · IP {maskIp(row.signer_ip)}
        {row.document_fingerprint ? ` · Fingerprint ${row.document_fingerprint.slice(0, 16)}…` : ""}
      </p>
    </article>
  );
}
