export function AgreementSuccess({
  clientName,
  signedDate,
  downloadHref,
  paymentUrl,
}: {
  clientName: string;
  signedDate: string;
  downloadHref: string;
  paymentUrl?: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="mt-5 font-serif text-3xl font-semibold text-[#111827]">Agreement Signed</h1>
      <p className="mt-3 text-[15px] text-[#475569]">
        Signed by {clientName} on {signedDate}.
      </p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#475569]">
        This is the permanent record of your agreement. You may download a PDF copy for your records.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={downloadHref}
          className="inline-flex min-w-[180px] items-center justify-center rounded-md bg-[#1e3a8a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
        >
          Download PDF
        </a>
        {paymentUrl ? (
          <a
            href={paymentUrl}
            className="inline-flex min-w-[180px] items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#111827] hover:bg-slate-50"
          >
            Complete Payment
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex min-w-[180px] cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-400"
          >
            Complete Payment
          </button>
        )}
      </div>
    </div>
  );
}
