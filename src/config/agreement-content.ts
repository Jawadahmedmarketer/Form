import { COMPANY, COMPANY_ADDRESS_SINGLE_LINE } from "@/config/company";

export type LegalBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "columns"; items: string[] }
  | { type: "callout"; text: string; emphasis?: string };

export type LegalSection = {
  number: number;
  id: string;
  title: string;
  intro?: string;
  blocks: LegalBlock[];
};

export const AGREEMENT_INTRO =
  "This Service Agreement is entered into by and between Unified Tax Group (“Company,” “we,” “us,” or “our”) and the client listed below (“Client,” “you,” or “your”).";

export const CLIENT_ACCEPTANCE_TEXT =
  "By signing below, Client confirms that Client has reviewed, understands, and agrees to this Unified Tax Group Service Agreement.";

export const COMPANY_ACCEPTANCE_TEXT =
  "Authorized on behalf of Unified Tax Group.";

export const ACCEPTANCE_CHECKBOX_LABEL =
  "I have read and agree to the terms of this agreement.";

export const SERVICES_INSTRUCTION =
  "Please select all services included under this Agreement:";

/**
 * Approved Unified Tax Group Service Agreement copy.
 * Edit this file to update legal wording for both the web agreement and the signed PDF.
 * Do not duplicate this text in React components.
 */
export const LEGAL_SECTIONS: LegalSection[] = [
  {
    number: 1,
    id: "client-information",
    title: "CLIENT INFORMATION",
    blocks: [],
  },
  {
    number: 2,
    id: "company-information",
    title: "UNIFIED TAX GROUP INFORMATION",
    blocks: [],
  },
  {
    number: 3,
    id: "selected-services",
    title: "SELECTED SERVICES",
    intro: SERVICES_INSTRUCTION,
    blocks: [],
  },
  {
    number: 4,
    id: "fees-payment-terms",
    title: "FEES & PAYMENT TERMS",
    blocks: [
      {
        type: "list",
        items: [
          "Fees for the selected services are as stated in this Agreement. Client agrees to pay all fees when due.",
          "The Total Cost / Setup Fee is due according to the payment schedule specified above. Recurring monthly fees, if applicable, will be billed in accordance with the stated payment schedule and payment method.",
          "Client authorizes Unified Tax Group to invoice Client using the payment method designated in this Agreement.",
          "Late or failed payments may result in suspension of services until the account is brought current. Client remains responsible for fees for work already performed.",
          "Government filing fees, software subscriptions, postage, and similar third-party costs are not included unless expressly stated and will be billed separately if incurred with Client’s knowledge.",
        ],
      },
    ],
  },
  {
    number: 5,
    id: "refund-policy",
    title: "REFUND POLICY",
    blocks: [
      {
        type: "paragraph",
        text: "Because professional services require time, labor, and dedicated resources, payments are generally non-refundable once work has commenced. The following fees are non-refundable once work has commenced:",
      },
      {
        type: "columns",
        items: [
          "Setup fees",
          "Catch-up bookkeeping fees",
          "Cleanup fees",
          "Monthly bookkeeping fees",
          "Tax preparation fees",
          "Advisory fees",
          "Completed service fees",
          "Work-in-progress fees",
        ],
      },
      {
        type: "paragraph",
        text: "Refunds for services not yet started are at the sole discretion of Unified Tax Group. Client agrees to contact the Company in writing before initiating a payment dispute or chargeback.",
      },
      {
        type: "paragraph",
        text: "Nothing in this section limits any non-waivable rights Client may have under applicable law.",
      },
    ],
  },
  {
    number: 6,
    id: "client-responsibilities",
    title: "CLIENT RESPONSIBILITIES",
    blocks: [
      {
        type: "paragraph",
        text: "Client agrees to:",
      },
      {
        type: "list",
        items: [
          "Provide complete, accurate, and timely information, documents, access, and responses reasonably requested by the Company;",
          "Review all work product, including tax returns, reports, and filings, before authorizing the Company to file or submit;",
          "Maintain required records and retain copies of documents provided to the Company;",
          "Notify the Company promptly of IRS or state notices, changes in business structure, ownership, accounting methods, or other facts that may affect the services;",
          "Ensure that login credentials and third-party access granted to the Company remain authorized and secure; and",
          "Pay all fees when due.",
        ],
      },
      {
        type: "paragraph",
        text: "The Company is not responsible for penalties, interest, missed elections, or other consequences arising from incomplete, inaccurate, delayed, or withheld Client information, or from Client’s failure to review, approve, or respond by stated deadlines.",
      },
    ],
  },
  {
    number: 7,
    id: "company-responsibilities",
    title: "COMPANY RESPONSIBILITIES",
    blocks: [
      {
        type: "paragraph",
        text: "Unified Tax Group will perform the selected services in a professional manner consistent with this Agreement. The Company will use reasonable efforts to meet applicable filing and delivery timelines when Client has provided complete information with sufficient lead time.",
      },
      {
        type: "paragraph",
        text: "The Company may assign qualified personnel, including bookkeepers, tax preparers, and, where applicable, CPA or other licensed professionals, to perform or review work. The Company does not guarantee that a specific individual will perform all services.",
      },
    ],
  },
  {
    number: 8,
    id: "scope-of-services",
    title: "SCOPE OF SERVICES",
    blocks: [
      {
        type: "paragraph",
        text: "The scope of this Agreement is limited to the services selected in Section 3 and any written addendum. Services not selected are excluded.",
      },
      {
        type: "paragraph",
        text: "Unless expressly included, the following are outside the scope of this Agreement: audit representation; tax controversy or collections representation beyond initial notice response as selected; legal advice; investment, insurance, or securities advice; CFO or controller services; cleanup of books beyond the described catch-up engagement; formation of entities; payroll tax deposits unless payroll support is selected; and any work for tax years or entities not identified in this Agreement.",
      },
      {
        type: "paragraph",
        text: "Additional work may be quoted separately and will not begin until Client agrees in writing (including email or electronic acceptance).",
      },
    ],
  },
  {
    number: 9,
    id: "tax-return-review",
    title: "TAX RETURN REVIEW & FILING AUTHORIZATION",
    blocks: [
      {
        type: "paragraph",
        text: "If tax preparation services are included, the Company will prepare the applicable return(s) based on information Client provides. Client is responsible for reviewing the return for completeness and accuracy before filing.",
      },
      {
        type: "paragraph",
        text: "The Company will not file any tax return until Client provides express authorization to file. Electronic filing authorization (including Form 8879 or equivalent state authorization) must be completed by Client. Client’s signature on this Agreement does not, by itself, constitute authorization to file a specific tax return.",
      },
      {
        type: "paragraph",
        text: "Client acknowledges that Client, not the Company, is the taxpayer and remains legally responsible for the tax return and for any tax, penalty, or interest assessed.",
      },
    ],
  },
  {
    number: 10,
    id: "communication-deadlines",
    title: "COMMUNICATION & DEADLINES",
    blocks: [
      {
        type: "paragraph",
        text: "The parties will communicate primarily by email, phone, and other electronic means. Client agrees to monitor the email address provided in this Agreement and to respond to information requests by the deadlines the Company communicates.",
      },
      {
        type: "paragraph",
        text: "If Client does not provide required information with sufficient time before a filing deadline, the Company may be unable to complete or file work by that deadline. The Company may, where appropriate, recommend an extension. An extension to file is not an extension to pay. Client is responsible for any tax due by the original deadline.",
      },
    ],
  },
  {
    number: 11,
    id: "confidentiality",
    title: "CONFIDENTIALITY & DATA PROTECTION",
    blocks: [
      {
        type: "paragraph",
        text: "The Company will treat Client’s non-public information as confidential and will use it to perform services under this Agreement, to comply with law, and to operate the Company’s practice (including quality review, professional supervision, and secure vendors).",
      },
      {
        type: "paragraph",
        text: "The Company implements reasonable administrative, technical, and physical safeguards. No method of electronic storage or transmission is completely secure. Client agrees to use reasonable care when transmitting information.",
      },
      {
        type: "paragraph",
        text: "The Company may disclose information if required by law, court order, or professional obligation, or with Client’s authorization.",
      },
    ],
  },
  {
    number: 12,
    id: "data-ownership",
    title: "DATA OWNERSHIP & INTERNAL MATERIALS",
    blocks: [
      {
        type: "paragraph",
        text: "Client retains ownership of Client’s original records and of deliverables prepared specifically for Client (such as completed bookkeeping files for Client’s accounts and prepared tax returns), subject to the Company’s right to retain copies as required for professional, legal, or quality purposes.",
      },
      {
        type: "paragraph",
        text: "The Company retains all rights in its internal templates, checklists, workflows, software configurations, training materials, playbooks, and other proprietary methods. This Agreement does not transfer the Company’s intellectual property to Client.",
      },
      {
        type: "paragraph",
        text: "Upon termination, and after payment of amounts due, the Company will make available Client’s primary work product and Client-provided records in a reasonably usable format. The Company is not obligated to deliver internal notes, process documents, or proprietary tools.",
      },
    ],
  },
  {
    number: 13,
    id: "third-party-platforms",
    title: "THIRD-PARTY PLATFORMS & ACCESS",
    blocks: [
      {
        type: "paragraph",
        text: "Services may require use of or access to third-party platforms (including accounting software, payroll systems, tax software, banks, IRS or state portals, and similar tools). Client authorizes the Company to access those platforms as needed to perform the selected services.",
      },
      {
        type: "paragraph",
        text: "Client is responsible for the cost of Client’s own software subscriptions unless this Agreement expressly includes them. The Company is not responsible for outages, data loss, or changes caused by third-party vendors, nor for Client’s failure to maintain licenses, multi-factor authentication, or access permissions.",
      },
      {
        type: "paragraph",
        text: "Client will revoke Company access when this Agreement ends, and the Company will discontinue use of Client credentials upon termination except as needed for an orderly transition.",
      },
    ],
  },
  {
    number: 14,
    id: "no-guarantee",
    title: "NO GUARANTEE OF RESULTS",
    blocks: [
      {
        type: "paragraph",
        text: "Client acknowledges that tax, bookkeeping, and advisory services involve professional judgment based on facts Client provides and on law as reasonably understood at the time. The Company does not guarantee any particular tax savings, refund, audit outcome, financial result, or that any position will be accepted by the IRS or any state or local tax authority.",
      },
      {
        type: "paragraph",
        text: "Prior results of other clients are not a promise of Client’s results.",
      },
    ],
  },
  {
    number: 15,
    id: "limitation-of-liability",
    title: "LIMITATION OF LIABILITY",
    blocks: [
      {
        type: "callout",
        text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY’S TOTAL LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT AND THE SERVICES, WHETHER IN CONTRACT, TORT (INCLUDING NEGLIGENCE), OR OTHERWISE, SHALL NOT EXCEED THE FEES ACTUALLY PAID BY CLIENT TO THE COMPANY UNDER THIS AGREEMENT FOR THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE CLAIM.",
        emphasis:
          "Liability cap: fees paid in the 12 months immediately preceding the claim.",
      },
      {
        type: "paragraph",
        text: "IN NO EVENT SHALL THE COMPANY BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST TAX BENEFITS, BUSINESS INTERRUPTION, OR DATA LOSS, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.",
      },
      {
        type: "paragraph",
        text: "This limitation does not apply to liability that cannot be limited under applicable law, including liability for gross negligence or willful misconduct where such limitation is prohibited.",
      },
    ],
  },
  {
    number: 16,
    id: "term-cancellation",
    title: "TERM, CANCELLATION & TERMINATION",
    blocks: [
      {
        type: "paragraph",
        text: "This Agreement begins on the Agreement Date (or the Service Start Date, if later) and continues until the Service End Date, or on an ongoing basis if no fixed end date is stated, unless earlier terminated.",
      },
      {
        type: "paragraph",
        text: "Either party may terminate this Agreement by written notice (including email). If monthly services apply, termination will generally take effect at the end of the then-current billing period unless a different date is agreed in writing.",
      },
      {
        type: "paragraph",
        text: "The Company may suspend or terminate services immediately if Client fails to pay amounts due, fails to provide required information, or engages in unlawful or abusive conduct.",
      },
      {
        type: "paragraph",
        text: "Upon termination, Client remains responsible for fees for work performed and for periods already billed. The Company may retain records as required by law or professional standards.",
      },
    ],
  },
  {
    number: 17,
    id: "electronic-signatures",
    title: "ELECTRONIC COMMUNICATIONS & SIGNATURES",
    blocks: [
      {
        type: "paragraph",
        text: "Client consents to electronic communications and to electronic signatures for this Agreement and related documents. An electronic signature, including a signature drawn on an electronic signature pad, has the same legal effect as a handwritten signature.",
      },
      {
        type: "paragraph",
        text: "This Agreement may be executed electronically. The signed PDF, together with the stored signature image(s), timestamp, and document fingerprint, constitutes the official record of this Agreement.",
      },
    ],
  },
  {
    number: 18,
    id: "governing-law",
    title: "GOVERNING LAW",
    blocks: [
      {
        type: "paragraph",
        text: "This Agreement is governed by the laws of the State of New Mexico, without regard to conflict-of-law principles. Subject to any non-waivable rights, the parties consent to exclusive jurisdiction and venue in the state or federal courts located in New Mexico.",
      },
    ],
  },
  {
    number: 19,
    id: "entire-agreement",
    title: "ENTIRE AGREEMENT",
    blocks: [
      {
        type: "paragraph",
        text: "This Agreement, including the selected services and fees stated herein, is the entire agreement between the parties concerning its subject matter and supersedes prior oral or written proposals or understandings on that subject. Amendments must be in writing and accepted by both parties (including by electronic means).",
      },
      {
        type: "paragraph",
        text: "If any provision is held unenforceable, the remaining provisions will continue in effect. Failure to enforce a provision is not a waiver. This Agreement binds permitted successors and assigns. Client may not assign this Agreement without the Company’s prior written consent.",
      },
    ],
  },
  {
    number: 20,
    id: "client-acceptance",
    title: "CLIENT ACCEPTANCE",
    intro: CLIENT_ACCEPTANCE_TEXT,
    blocks: [],
  },
  {
    number: 21,
    id: "company-acceptance",
    title: "UNIFIED TAX GROUP ACCEPTANCE",
    intro: COMPANY_ACCEPTANCE_TEXT,
    blocks: [],
  },
];

export const COMPANY_READONLY_FIELDS = [
  { label: "Company Name", value: COMPANY.brandName },
  { label: "Legal Business Name", value: COMPANY.legalName },
  { label: "Company Address", value: COMPANY_ADDRESS_SINGLE_LINE },
  { label: "Email", value: COMPANY.email, href: `mailto:${COMPANY.email}` },
  { label: "Phone", value: COMPANY.phone, href: `tel:${COMPANY.phone}` },
  {
    label: "Website",
    value: COMPANY.website,
    href: COMPANY.websiteUrl,
  },
] as const;
