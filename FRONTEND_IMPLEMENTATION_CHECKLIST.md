# CashDay Frontend Prioritized Implementation Checklist

## Purpose

This is a **frontend-only** implementation plan for closing the main product gaps identified in the docs-vs-UI review.

It is arranged in **strict execution order** so the team can complete work **one by one**, without rebuilding already-working prototype flows.

---

## Current Frontend Reality

### Already working in prototype form
- invoice list, create, edit, detail, send
- proforma list, create, send, convert
- debtor portal OTP-style flow
- liquidity and settlement UI flows
- customer and debtor officer management
- users, settings, bank accounts, dashboard simulation

### Main frontend gaps
- no auth/login UI or route protection
- no API integration layer (`HttpClient` not wired yet)
- no frontend abstraction between mock data and real API
- no **external invoice ingestion/import** workflow
- no signed-token / invalid-token UX states in debtor portal
- no evidence/audit history UI
- no automated tests

---

## Priority Order Summary

| Priority | Epic | Goal | Status |
|---|---|---|---|
| P0 | Frontend foundation | prepare app for real backend without breaking mock flow | Next |
| P1 | External invoice ingestion/import | add missing external receivables workflow | Critical |
| P2 | Portal + lifecycle hardening | production-ready UX states for portal/invoice actions | Important |
| P3 | PDF/notification UX polish | close document and feedback gaps | Important |
| P4 | Testing and QA | lock in behavior and reduce regressions | Important |

---

# Phase P0 — Frontend Foundation (Do First)

## Objective
Keep the current prototype working while introducing the frontend structure required for real backend integration later.

## Checklist
- [ ] **FE-01** Add a proper frontend data-access layer to replace direct feature coupling to `MockDataService`
- [ ] **FE-02** Add `provideHttpClient()` and environment-based API configuration
- [ ] **FE-03** Create auth stubs: `AuthService`, `auth.guard.ts`, `tenant.interceptor.ts`
- [ ] **FE-04** Protect internal app routes while keeping debtor portal publicly accessible
- [ ] **FE-05** Refactor feature pages to use interface-based services instead of direct mock-only calls

## Detailed task list

### FE-01 — Create service abstraction layer
**Why:** Right now every screen depends directly on `MockDataService`, which blocks gradual migration.

**Create / update:**
- `src/app/core/services/invoice-data.service.ts`
- `src/app/core/services/customer-data.service.ts`
- `src/app/core/services/settings-data.service.ts`
- `src/app/core/services/portal-data.service.ts`
- `src/app/core/services/user-data.service.ts`

**Done when:**
- each feature consumes a domain service instead of calling `MockDataService` directly
- mock implementation still works underneath

---

### FE-02 — Add HTTP foundation
**Why:** The app has no HTTP client wiring yet.

**Create / update:**
- `src/app/app.config.ts`
- `src/environments/` if added
- `src/app/core/interceptors/tenant.interceptor.ts`
- `src/app/core/interceptors/auth.interceptor.ts`

**Done when:**
- `provideHttpClient()` is enabled
- a configurable API base URL exists
- interceptors can be switched on without breaking the mock mode

---

### FE-03 — Add auth shell scaffolding
**Why:** Docs assume protected internal routes and a public debtor portal.

**Create / update:**
- `src/app/core/guards/auth.guard.ts`
- `src/app/core/services/auth.service.ts`
- optional `src/app/features/auth/login.component.ts`

**Done when:**
- internal routes can be guarded
- debtor portal route remains public
- mock login state can be toggled in frontend only

---

### FE-04 — Route protection split
**Why:** Internal app and external portal should behave differently.

**Create / update:**
- `src/app/app.routes.ts`

**Done when:**
- `/dashboard`, `/invoices`, `/customers`, `/users`, `/settings` are guard-ready
- `/acceptance/portal/:token` remains public

---

### FE-05 — Refactor features to use adapters
**Why:** This makes later backend hookup low-risk.

**Target components:**
- `features/invoices/*`
- `features/customers/*`
- `features/users/*`
- `features/settings/*`
- `features/debtor-portal/*`

**Done when:**
- feature components are not tightly coupled to one concrete mock class

---

# Phase P1 — External Invoice Ingestion / Import (Highest Missing Feature)

## Objective
Add a **frontend-only external receivables workflow** for invoices not originally created inside CashDay.

## Product intent
This closes the gap described in the docs around:
- external receivables
- imported invoices
- visibility-only invoices
- future verification through the debtor portal

## Checklist
- [ ] **FE-06** Extend the frontend invoice model for external/imported invoices
- [ ] **FE-07** Add an `External Receivables` tab or route in the invoices module
- [ ] **FE-08** Add a manual external invoice entry form
- [ ] **FE-09** Add CSV import wizard with preview step
- [ ] **FE-10** Add import validation and error UI
- [ ] **FE-11** Add source badges, filters, and list states for imported invoices
- [ ] **FE-12** Allow imported invoices to be sent into the existing portal verification flow

## Detailed task list

### FE-06 — Extend invoice model
**Create / update:**
- `src/app/shared/models/models.ts`

**Suggested new fields:**
- `sourceType?: 'cashday' | 'external-manual' | 'external-csv' | 'external-api'`
- `isExternal?: boolean`
- `externalInvoiceNo?: string`
- `sourceSystem?: string`
- `importedAt?: string`
- `importBatchId?: string`
- `verificationMode?: 'portal' | 'visibility-only'`

**Done when:**
- model supports imported and manually registered external receivables cleanly

---

### FE-07 — Add `External Receivables` view
**Create / update:**
- `src/app/features/invoices/external-invoice-list.component.ts`
- `src/app/features/invoices/invoices.routes.ts`
- optional tab links in `invoice-list.component.ts`

**Recommended UX:**
- tabs: `Tax Invoices` | `Proforma Invoices` | `External Receivables`
- filters: source type, verification status, imported date, customer
- badges: `Imported`, `Visibility Only`, `Pending Verification`, `Verified`

**Done when:**
- user can view all external/imported receivables separately from standard CashDay invoices

---

### FE-08 — Manual external invoice entry form
**Create / update:**
- `src/app/features/invoices/external-invoice-form.component.ts`
- shared validation helpers if needed

**Fields to include:**
- customer
- external invoice number
- source system
- invoice date / due date
- amount details
- debtor officer
- notes
- verification mode

**Done when:**
- finance user can manually add an external receivable without using CSV

---

### FE-09 — CSV import wizard
**Create / update:**
- `src/app/features/invoices/components/import-invoices-modal.component.ts`
- utility parser in `src/app/core/services/` or `shared/`

**Recommended steps:**
1. upload CSV
2. parse and preview rows
3. show field mapping summary
4. validate required columns
5. import into mock/store state

**Minimum required CSV columns:**
- customer name or customer ID
- external invoice number
- invoice date
- due date
- gross amount

**Done when:**
- user can upload a CSV and see a clean preview before confirming import

---

### FE-10 — Import validation and error states
**Add validation for:**
- missing customer
- invalid dates
- duplicate external invoice number
- negative or empty amounts
- missing debtor officer when verification is required

**UX outputs:**
- row-level error badges
- summary panel with counts: `ready`, `warning`, `blocked`
- downloadable error list later if needed

**Done when:**
- bad imports are clearly blocked or flagged before save

---

### FE-11 — Source-aware UI indicators
**Update:**
- `invoice-list.component.ts`
- `invoice-detail.component.ts`
- dashboard outstanding tables if needed

**Display rules:**
- show `Imported` badge for external invoices
- show `Source: ERP/CSV/Manual`
- show `Verification pending` if not yet debtor-accepted

**Done when:**
- imported invoices are visually distinguishable from native CashDay invoices

---

### FE-12 — Reuse portal verification for imported invoices
**Why:** Imported invoices should optionally become verified receivables too.

**Update:**
- external invoice detail page / actions
- portal send action state
- mock service workflow

**Done when:**
- an imported invoice can be assigned to a debtor officer and sent through the same acceptance flow

---

# Phase P2 — Portal and Lifecycle Hardening

## Objective
Upgrade the debtor portal and invoice status UX from demo-grade to production-ready frontend behavior.

## Checklist
- [ ] **FE-13** Add explicit invalid token / expired token / blocked token portal states
- [ ] **FE-14** Add resend cooldown and clearer OTP timer UX
- [ ] **FE-15** Add acceptance evidence summary UI in invoice detail
- [ ] **FE-16** Add stronger action confirmations for settle/liquidate/send flows
- [ ] **FE-17** Add source-aware lifecycle timeline for imported invoices

## Task details

### FE-13 — Portal exception states
**Create / update:**
- `debtor-portal.component.ts`

**Add screens for:**
- invalid token
- expired link
- already-used or already-finalized response
- OTP lockout / too many attempts

---

### FE-14 — Better OTP UX
**Add:**
- visible cooldown timer
- resend disabled state copy
- clearer success/error messaging

---

### FE-15 — Evidence summary on invoice detail
**Frontend-only placeholder UI** for:
- accepted by whom
- accepted at time
- verified via OTP
- rejection reason if present
- settlement path summary

**Note:** even if backend evidence isn’t ready, the UI structure should exist.

---

### FE-16 — Safer irreversible actions
Standardize confirmation modals for:
- send invoice
- liquidate invoice
- mark settled
- delete draft proforma
- import overwrite / duplicate handling

---

### FE-17 — Timeline improvement
Extend invoice detail timeline to show:
- imported
- verification requested
- OTP verified
- accepted/rejected
- settled/liquidated

---

# Phase P3 — PDF and Notification UX Polish

## Objective
Improve the frontend experience for document download and operational feedback.

## Checklist
- [ ] **FE-18** Add real loading/error states around PDF actions
- [ ] **FE-19** Add notification center / activity panel UI stub
- [ ] **FE-20** Add better toasts for import, portal, and settlement events
- [ ] **FE-21** Add print-ready external invoice detail styling

## Task details

### FE-18 — PDF states
**Update:**
- `invoice-list.component.ts`
- `invoice-detail.component.ts`

**Done when:**
- buttons show `Preparing PDF...`
- failures have visible error toasts/messages
- print/download flows feel intentional, not abrupt

### FE-19 — Notification center stub
**Create / update:**
- `shared/components/topbar.component.ts`
- optional `notifications-panel.component.ts`

**Show placeholder events such as:**
- invoice sent
- OTP issued
- invoice accepted/rejected
- import completed
- liquidity confirmed

### FE-20 — Improve event feedback
Ensure every major user action results in:
- success toast
- error toast
- inline status change when relevant

### FE-21 — External invoice print view
If imported invoices need view/print support, align their detail page with existing invoice print styling.

---

# Phase P4 — Testing and QA (Do after feature work)

## Objective
Add automated safety around the critical frontend flows.

## Checklist
- [ ] **FE-22** Add component tests for invoice and proforma flows
- [ ] **FE-23** Add tests for external invoice import validation
- [ ] **FE-24** Add debtor portal OTP flow tests
- [ ] **FE-25** Add smoke tests for route protection and shell loading
- [ ] **FE-26** Run mobile QA at 390px and 430px widths

## Suggested minimum test targets
- invoice form required fields
- customer officer validation
- external CSV import validation
- portal OTP request/verify/reject flow
- liquidity amount validation
- role-protected route behavior (mock auth state)

---

# Recommended One-by-One Execution Order

Use this exact order to complete the frontend incrementally:

1. **FE-01** Service abstraction layer
2. **FE-02** HTTP + environment config
3. **FE-03** Auth service + guards/interceptors
4. **FE-04** Route protection split
5. **FE-05** Feature refactor to adapters
6. **FE-06** Extend invoice model for external invoices
7. **FE-07** Add `External Receivables` page/tab
8. **FE-08** Add manual external invoice form
9. **FE-09** Add CSV import wizard
10. **FE-10** Add import validation UI
11. **FE-11** Add source badges and filters
12. **FE-12** Reuse portal verification for imported invoices
13. **FE-13** to **FE-17** Portal/lifecycle hardening
14. **FE-18** to **FE-21** PDF + notification UX polish
15. **FE-22** to **FE-26** Testing and QA

---

# Best First Sprint Recommendation

If you want the **best immediate value**, implement this first sprint:

- [ ] FE-01 Service abstraction layer
- [ ] FE-02 HTTP foundation
- [ ] FE-06 Model extension for external invoices
- [ ] FE-07 External Receivables list screen
- [ ] FE-08 Manual external invoice form

This gives the product its biggest missing business capability without waiting for backend completion.

---

# Definition of Success

This checklist is complete when the frontend can:
- protect internal routes while keeping the debtor portal public
- support both CashDay-created and externally imported receivables
- visually distinguish imported invoices from native invoices
- let imported invoices flow into the same verification UX
- present strong loading/error/confirmation states
- pass basic automated tests for the critical flows

---

# Next Action

**Start with FE-01**. Do not build the import wizard first; add the service abstraction layer and model support before creating new invoice ingestion screens.