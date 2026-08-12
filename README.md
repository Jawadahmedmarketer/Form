# Unified Tax Group Service Agreement

Custom service-agreement signing for Unified Tax Group (Prosperity Solutions LLC). Clients sign on a branded web agreement. The app stores the record in Supabase, generates a full signed PDF, and then syncs the contact, PDF, and workflow webhook to GoHighLevel.

This app does **not** use GHL Forms or GHL Documents & Contracts for the customer-facing agreement.

## Local setup

1. Copy `.env.example` to `.env.local` and fill in values.
2. In Supabase, run `supabase/migrations/001_create_agreements.sql`, then `002_agreement_email_status.sql` if the table already exists.
3. Confirm private storage buckets `agreement-signatures` and `signed-agreements` exist.
4. Replace `src/assets/authorized-signature.png` with Jawad Ahmed’s approved signature before production use.
5. Install and run:

```bash
npm install
npm run dev
```

6. Create a test agreement:

```bash
npm run seed
```

Or open `/admin`, enter `ADMIN_API_SECRET`, and create a prefilled agreement.

7. Open the printed `/agreement/[token]` URL, complete the form, sign, and confirm `/agreement/[token]/completed` plus PDF download.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (not used for agreement data access) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Bypasses RLS. Never expose to the browser. |
| `GHL_API_TOKEN` | HighLevel private integration token |
| `GHL_LOCATION_ID` | HighLevel sub-account / location ID |
| `GHL_WORKFLOW_WEBHOOK_URL` | Inbound workflow webhook URL |
| `GHL_SIGNED_AGREEMENT_CUSTOM_FIELD_ID` | File custom field for the signed PDF |
| `GHL_CF_AGREEMENT_STATUS` | Optional text custom field |
| `GHL_CF_AGREEMENT_SIGNED_DATE` | Optional date/text custom field |
| `GHL_CF_AGREEMENT_TYPE` | Optional text custom field |
| `GHL_CF_SELECTED_SERVICES` | Optional text custom field |
| `GHL_CF_SETUP_FEE` | Optional text custom field |
| `GHL_CF_MONTHLY_FEE` | Optional text custom field |
| `NEXT_PUBLIC_APP_URL` | Public app URL, e.g. `https://agreements.unifiedtaxgroup.com` |
| `ADMIN_API_SECRET` | Protects `/admin` create and GHL retry APIs |
| `PAYMENT_URL` | Optional destination for the future Complete Payment button |
| `RESEND_API_KEY` | Sends the signed PDF to the client after signing |
| `EMAIL_FROM` | From address, e.g. `Unified Tax Group <info@unifiedtaxgroup.com>` |

## Supabase

### Table

`public.agreements` — see `supabase/migrations/001_create_agreements.sql`.

RLS is enabled with no anon policies. Agreement reads, signing, and downloads go through Next.js server routes using the service role.

### Storage buckets

- `agreement-signatures` (private)
- `signed-agreements` (private)

Paths:

```text
{agreementId}/client-signature.png
{agreementId}/representative-signature.png
{agreementId}/signed-agreement.pdf
```

## GHL setup

Create these contact custom fields in the HighLevel location, then paste their IDs into env vars:

- Agreement Status
- Agreement Signed Date
- Agreement Type
- Selected Services
- Total Cost / Setup Fee
- Monthly Fee
- Signed Agreement (file field)

Private integration scopes / permissions:

- Contacts read
- Contacts write
- Forms / custom file upload (or equivalent file custom-field permission)

After signing, the app:

1. Upserts the contact with `POST /contacts/upsert` ([HighLevel Contacts API](https://marketplace.gohighlevel.com/docs/ghl/contacts/upsert-contact))
2. Uploads the PDF with `POST /forms/upload-custom-files` ([upload custom files](https://marketplace.gohighlevel.com/docs/ghl/forms/upload-to-custom-fields/))
3. POSTs this webhook payload:

```json
{
  "event": "agreement.signed",
  "agreement_id": "...",
  "ghl_contact_id": "...",
  "first_name": "...",
  "last_name": "...",
  "email": "...",
  "phone": "...",
  "agreement_status": "signed",
  "agreement_signed_date": "...",
  "selected_services": [],
  "setup_fee": "...",
  "monthly_fee": "...",
  "pdf_available": true
}
```

If GHL is down, the signed agreement and PDF remain in Supabase. Retry with:

```bash
curl -X POST "$APP_URL/api/admin/agreements/$TOKEN/retry-ghl" \
  -H "Authorization: Bearer $ADMIN_API_SECRET"
```

## Vercel

1. Import this repository into Vercel.
2. Set all environment variables from `.env.example`.
3. Set `NEXT_PUBLIC_APP_URL` to the production domain.
4. Deploy with the Next.js preset. No special build command is required.
5. Confirm Node.js 20+.
6. After deploy, create one test agreement and run the full sign → PDF → download flow.
7. Then confirm GHL contact upsert, PDF file field, and workflow webhook.

## Legal copy

Web and PDF wording both come from `src/config/agreement-content.ts`. Edit that file to change contract language. Do not duplicate legal text in components.

Replace `src/assets/authorized-signature.png` with the approved representative signature before sending live agreements.

## Payment

The completed page shows **Complete Payment**. It stays disabled until `PAYMENT_URL` or `agreements.payment_url` is set. Payment processing is not implemented yet.
