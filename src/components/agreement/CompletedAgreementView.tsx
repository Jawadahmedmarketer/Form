import { BrandMark } from "@/components/agreement/BrandMark";
import { SignedAgreementRecord } from "@/components/agreement/SignedAgreementRecord";
import type { AgreementRow } from "@/lib/supabase/types";

export function CompletedAgreementView({
  row,
  clientName,
  signedDate,
  downloadHref,
  paymentUrl,
  clientSignatureDataUrl,
  representativeSignatureDataUrl,
}: {
  row: AgreementRow;
  clientName: string;
  signedDate: string;
  downloadHref: string;
  paymentUrl?: string;
  clientSignatureDataUrl: string | null;
  representativeSignatureDataUrl: string | null;
}) {
  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 py-3">
          <BrandMark compact />
          <div className="flex items-center gap-2">
            {paymentUrl ? (
              <a
                href={paymentUrl}
                className="inline-flex items-center gap-2 rounded-md border border-slate-900 bg-white px-3 py-2 text-sm font-semibold text-[#111827] hover:bg-slate-50"
              >
                <CreditCardIcon />
                Complete payment
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400"
              >
                <CreditCardIcon />
                Complete payment
              </button>
            )}
            <a
              href={downloadHref}
              className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
            >
              <DownloadIcon />
              Download PDF
            </a>
          </div>
        </div>
      </header>

      <div className="border-y border-emerald-200 bg-emerald-50">
        <div className="mx-auto flex max-w-[1100px] items-start gap-3 px-4 py-3 text-sm text-emerald-900">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p>
            Signed by <span className="font-semibold">{clientName}</span> on {signedDate}. This is the
            permanent record of your agreement — bookmark this page or download a PDF copy.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[960px] px-3 py-8 sm:px-6 sm:py-10">
        <SignedAgreementRecord
          row={row}
          clientSignatureDataUrl={clientSignatureDataUrl}
          representativeSignatureDataUrl={representativeSignatureDataUrl}
        />
      </div>
    </div>
  );
}

function CreditCardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12" strokeLinecap="round" />
      <path d="M8 11l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" />
    </svg>
  );
}
