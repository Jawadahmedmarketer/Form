import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminCreateForm } from "@/components/admin/AdminCreateForm";
import { SERVICE_OPTIONS, normalizeSelectedServices } from "@/config/services";
import { getAgreementByToken } from "@/lib/agreement";
import { isLikelyToken } from "@/lib/tokens";
import type { AdminCreateFormInput } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Edit Agreement | Unified Tax Group Admin",
};

export const dynamic = "force-dynamic";

const serviceIds = SERVICE_OPTIONS.map((service) => service.id);

function toFormValues(row: NonNullable<Awaited<ReturnType<typeof getAgreementByToken>>>): AdminCreateFormInput {
  const selected = normalizeSelectedServices(row.selected_services).filter(
    (id): id is (typeof serviceIds)[number] => serviceIds.includes(id as (typeof serviceIds)[number]),
  );

  return {
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    businessName: row.business_name || "",
    representativeName: row.representative_name || "",
    representativeTitle: row.representative_title || "",
    representativeSignature: "",
    email: row.email || "",
    phone: row.phone || "",
    businessAddress: row.business_address || "",
    taxPeriod: row.tax_period || "",
    agreementDate: row.agreement_date || "",
    businessesCovered: row.businesses_covered || "",
    selectedServices: selected.length ? selected : ["monthly_bookkeeping"],
    otherService: row.other_service || "",
    serviceDescription: row.service_description || "",
    serviceStartDate: row.service_start_date || "",
    serviceEndDate: row.service_end_date || "",
    setupFee: row.setup_fee || "",
    monthlyFee: row.monthly_fee || "",
    setupFeeLabel: row.setup_fee_label || "",
    monthlyFeeLabel: row.monthly_fee_label || "",
    paymentSchedule: row.payment_schedule || "",
    paymentMethod: row.payment_method || "",
    ghlContactId: row.ghl_contact_id || "",
    paymentUrl: row.payment_url || "",
    status: row.status === "draft" ? "draft" : "sent",
  };
}

export default async function AdminEditAgreementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isLikelyToken(token)) notFound();

  const row = await getAgreementByToken(token);
  if (!row) notFound();
  if (row.status === "signed") {
    redirect("/admin");
  }

  return <AdminCreateForm mode="edit" token={token} initialValues={toFormValues(row)} />;
}
