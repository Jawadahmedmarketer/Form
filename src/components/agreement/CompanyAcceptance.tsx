import { FormField, TextInput } from "@/components/agreement/FormField";

export function CompanyAcceptance({
  printedName,
  title,
  date,
  signatureDataUrl,
}: {
  printedName: string;
  title: string;
  date: string;
  signatureDataUrl: string | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold tracking-[0.12em] text-[#64748b]">
          AUTHORIZED REPRESENTATIVE SIGNATURE
        </p>
        <div className="flex h-40 items-center justify-center rounded-md border border-slate-300 bg-white px-4">
          {signatureDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signatureDataUrl}
              alt="Authorized representative signature"
              className="max-h-32 max-w-full object-contain"
            />
          ) : (
            <p className="text-sm text-[#475569]">
              Authorized signature will be applied from the approved company signature asset.
            </p>
          )}
        </div>
      </div>
      <FormField label="PRINTED NAME">
        <TextInput value={printedName} readOnly disabled />
      </FormField>
      <FormField label="TITLE">
        <TextInput value={title} readOnly disabled />
      </FormField>
      <FormField label="DATE">
        <TextInput type="date" value={date} readOnly disabled />
      </FormField>
    </div>
  );
}
