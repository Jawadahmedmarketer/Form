import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { safeAdminRedirect } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin Login | Unified Tax Group",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  return <AdminLoginForm redirectTo={safeAdminRedirect(params.redirect ?? null)} />;
}
