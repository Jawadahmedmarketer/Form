import type { Metadata } from "next";
import { AdminCreateForm } from "@/components/admin/AdminCreateForm";

export const metadata: Metadata = {
  title: "Create Agreement | Unified Tax Group Admin",
};

export default function AdminNewAgreementPage() {
  return <AdminCreateForm />;
}
