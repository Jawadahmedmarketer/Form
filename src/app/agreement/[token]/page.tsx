import { redirect } from "next/navigation";
import { AgreementForm } from "@/components/agreement/AgreementForm";
import { DocumentShell } from "@/components/agreement/DocumentShell";
import { InvalidLink } from "@/components/agreement/InvalidLink";
import {
  downloadStorageDataUrl,
  getAgreementAccessState,
  getAgreementByToken,
  markAgreementViewed,
  toPublicAgreement,
} from "@/lib/agreement";
import { cleanGhlString, getGhlRepresentativeDetails } from "@/lib/ghl";
import { getAuthorizedSignatureDataUrl } from "@/lib/representative-signature";
import { SIGNATURE_BUCKET } from "@/lib/supabase/admin";
import { isLikelyToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const INVALID_MESSAGES = {
  missing: {
    title: "Invalid agreement link",
    message: "This agreement link is invalid. Please contact Unified Tax Group if you need a new link.",
  },
  revoked: {
    title: "This agreement link has been revoked",
    message: "This agreement is no longer available. Please contact Unified Tax Group for a replacement link.",
  },
  cancelled: {
    title: "This agreement has been cancelled",
    message: "This agreement is no longer active. Please contact Unified Tax Group if you have questions.",
  },
  expired: {
    title: "This agreement link has expired",
    message: "This agreement link is no longer valid. Please contact Unified Tax Group to request a new agreement.",
  },
};

export default async function AgreementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isLikelyToken(token)) {
    return <InvalidLink {...INVALID_MESSAGES.missing} />;
  }

  let row;
  try {
    row = await getAgreementByToken(token);
  } catch {
    return (
      <InvalidLink
        title="Agreement unavailable"
        message="We could not load this agreement right now. Please try again in a few minutes."
      />
    );
  }

  if (!row) {
    return <InvalidLink {...INVALID_MESSAGES.missing} />;
  }

  const access = getAgreementAccessState(row);
  if (access === "signed") {
    redirect(`/agreement/${token}/completed`);
  }
  if (access !== "ok") {
    return <InvalidLink {...INVALID_MESSAGES[access]} />;
  }

  const viewed = await markAgreementViewed(row);
  const fromGhl = await getGhlRepresentativeDetails(viewed.ghl_contact_id);
  const ghlRepName = cleanGhlString(fromGhl.name);
  const ghlRepTitle = cleanGhlString(fromGhl.title);
  if (ghlRepName) viewed.representative_name = ghlRepName;
  if (ghlRepTitle) viewed.representative_title = ghlRepTitle;
  if (cleanGhlString(fromGhl.businessesCovered)) viewed.businesses_covered = cleanGhlString(fromGhl.businessesCovered);
  if (fromGhl.selectedServices?.length) viewed.selected_services = fromGhl.selectedServices;
  if (cleanGhlString(fromGhl.businessName)) viewed.business_name = cleanGhlString(fromGhl.businessName);
  if (cleanGhlString(fromGhl.businessAddress)) viewed.business_address = cleanGhlString(fromGhl.businessAddress);
  if (cleanGhlString(fromGhl.taxPeriod)) viewed.tax_period = cleanGhlString(fromGhl.taxPeriod);
  if (cleanGhlString(fromGhl.monthlyFee)) viewed.monthly_fee = cleanGhlString(fromGhl.monthlyFee);
  if (cleanGhlString(fromGhl.setupFee)) viewed.setup_fee = cleanGhlString(fromGhl.setupFee);
  if (cleanGhlString(fromGhl.paymentSchedule)) viewed.payment_schedule = cleanGhlString(fromGhl.paymentSchedule);
  if (cleanGhlString(fromGhl.paymentMethod)) viewed.payment_method = cleanGhlString(fromGhl.paymentMethod);
  if (cleanGhlString(fromGhl.serviceStartDate)) viewed.service_start_date = cleanGhlString(fromGhl.serviceStartDate);
  if (cleanGhlString(fromGhl.serviceEndDate)) viewed.service_end_date = cleanGhlString(fromGhl.serviceEndDate);
  if (cleanGhlString(fromGhl.serviceDescription)) viewed.service_description = cleanGhlString(fromGhl.serviceDescription);

  const effectiveRepName = cleanGhlString(viewed.representative_name);
  const representativeSignatureDataUrl =
    (viewed.representative_signature_path
      ? await downloadStorageDataUrl(SIGNATURE_BUCKET, viewed.representative_signature_path, "image/png")
      : null) ?? (await getAuthorizedSignatureDataUrl(effectiveRepName || undefined));
  const agreement = toPublicAgreement(viewed, representativeSignatureDataUrl);

  return (
    <DocumentShell>
      <AgreementForm agreement={agreement} />
    </DocumentShell>
  );
}
