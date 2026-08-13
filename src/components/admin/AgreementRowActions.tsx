"use client";

import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import type { AgreementStatus } from "@/lib/supabase/types";

const actionClass =
  "inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50";

export function AgreementRowActions({
  token,
  url,
  status,
}: {
  token: string;
  url: string;
  status: AgreementStatus;
}) {
  const showCopy = status === "draft" || status === "sent" || status === "viewed" || status === "signed";
  const showDownload = status === "signed";

  return (
    <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
      <a
        href={`/agreement/${token}`}
        target="_blank"
        rel="noreferrer"
        className={actionClass}
      >
        View
      </a>
      {showCopy ? (
        <CopyLinkButton value={url} label="Copy link" className={actionClass} />
      ) : null}
      {showDownload ? (
        <a href={`/api/agreements/${token}/download`} className={actionClass}>
          Download PDF
        </a>
      ) : null}
    </div>
  );
}
