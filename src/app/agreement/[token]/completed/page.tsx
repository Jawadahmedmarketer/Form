import { CompletedAgreementView } from "@/components/agreement/CompletedAgreementView";
import { InvalidLink } from "@/components/agreement/InvalidLink";
import { getPaymentUrl } from "@/config/company";
import {
  downloadStorageDataUrl,
  getAgreementAccessState,
  getAgreementByToken,
} from "@/lib/agreement";
import { formatLongDate } from "@/lib/dates";
import { getAuthorizedSignatureDataUrl } from "@/lib/representative-signature";
import { SIGNATURE_BUCKET } from "@/lib/supabase/admin";
import { isLikelyToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function CompletedAgreementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isLikelyToken(token)) {
    return (
      <InvalidLink
        title="Invalid agreement link"
        message="This agreement link is invalid."
      />
    );
  }

  const row = await getAgreementByToken(token);
  if (!row) {
    return (
      <InvalidLink
        title="Invalid agreement link"
        message="This agreement could not be found."
      />
    );
  }

  const access = getAgreementAccessState(row);
  if (access !== "signed") {
    return (
      <InvalidLink
        title="Agreement not complete"
        message="This agreement has not been signed yet, or the link is no longer available."
      />
    );
  }

  const clientName =
    row.client_printed_name ||
    [row.first_name, row.last_name].filter(Boolean).join(" ") ||
    "the client";

  const [clientSignatureDataUrl, storedRepSignature] = await Promise.all([
    downloadStorageDataUrl(SIGNATURE_BUCKET, row.client_signature_path, "image/png"),
    downloadStorageDataUrl(SIGNATURE_BUCKET, row.representative_signature_path, "image/png"),
  ]);
  const representativeSignatureDataUrl =
    storedRepSignature || (await getAuthorizedSignatureDataUrl());

  return (
    <CompletedAgreementView
      row={row}
      clientName={clientName}
      signedDate={formatLongDate(row.signed_at || row.client_signed_date) || "the agreement date"}
      downloadHref={`/api/agreements/${token}/download`}
      paymentUrl={row.payment_url || getPaymentUrl() || undefined}
      clientSignatureDataUrl={clientSignatureDataUrl}
      representativeSignatureDataUrl={representativeSignatureDataUrl}
    />
  );
}
