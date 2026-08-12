import { AgreementSuccess } from "@/components/agreement/AgreementSuccess";
import { DocumentShell } from "@/components/agreement/DocumentShell";
import { InvalidLink } from "@/components/agreement/InvalidLink";
import { getAgreementAccessState, getAgreementByToken } from "@/lib/agreement";
import { getPaymentUrl } from "@/config/company";
import { isLikelyToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

function formatSignedDate(value: string | null) {
  if (!value) return "the agreement date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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

  return (
    <DocumentShell>
      <AgreementSuccess
        clientName={clientName}
        signedDate={formatSignedDate(row.signed_at || row.client_signed_date)}
        downloadHref={`/api/agreements/${token}/download`}
        paymentUrl={row.payment_url || getPaymentUrl() || undefined}
      />
    </DocumentShell>
  );
}
