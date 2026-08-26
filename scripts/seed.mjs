/**
 * Create a development test agreement.
 * Usage: node --env-file=.env.local scripts/seed.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const token = randomBytes(24).toString("base64url");
const { data, error } = await supabase
  .from("agreements")
  .insert({
    public_token: token,
    status: "sent",
    first_name: "John",
    last_name: "Smith",
    email: "john@example.com",
    phone: "+1 555-0100",
    business_name: "Smith Holdings LLC",
    tax_period: "2025",
    selected_services: ["monthly_bookkeeping"],
    setup_fee: "$2,387",
    monthly_fee: "$217/month",
    payment_schedule: "Setup due on signing; monthly thereafter",
    payment_method: "Card / bank payment via secure payment link",
    service_end_date: "Ongoing — no fixed end date",
    representative_name: "Jawad Ahmed",
    representative_title: "CEO",
    sent_at: new Date().toISOString(),
    field_locks: {
      setupFee: "locked",
      monthlyFee: "locked",
      paymentSchedule: "locked",
      paymentMethod: "locked",
    },
  })
  .select("public_token")
  .single();

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Test agreement: ${appUrl}/agreement/${data.public_token}`);
