# Repository Audit: Dairy Inventory

This document captures prioritized issues and improvement opportunities found through static review and build/lint checks.

## Critical flaws

1. **CORS policy currently allows blocked origins anyway**  
   In `server/src/index.ts`, requests from unknown origins are logged as blocked but still accepted (`callback(null, true)`), which effectively disables origin enforcement.

2. **Financial and report read endpoints are mostly unauthenticated**  
   Several sensitive endpoints (e.g. `/finance/ar/stats`, `/payments/:sale_id`, report routes) can be queried without `requireAuth`, exposing business data.

3. **Route-level input validation is missing**  
   API handlers directly trust payloads (`sale_id`, `amount`, dates, status strings, IDs), creating risk of invalid data writes and runtime conversion problems.

4. **Client has extensive lint/type debt**  
   `npm --prefix client run lint` reports 93 issues (62 errors, 31 warnings), including `no-explicit-any`, hook ordering, and React effect anti-patterns.

5. **Build fragility due to external font fetch**  
   `next build` fails when Google Fonts is unavailable because `next/font` attempts network fetch at build time.

## Functional correctness issues

1. **Hook declaration order bug in Accounts Receivable page**  
   A function is used in `useEffect` before it is declared, triggering lint/runtime risks.

2. **Global spinner architecture causes effect-setState warnings**  
   Event-driven request counter with synchronous state updates in effects leads to React hook rule violations under strict linting.

3. **Auth initialization mutates state in mount effect**  
   `AuthContext` sets user state directly in effect from localStorage parse; lint flags this as a cascading render anti-pattern.

4. **Potential race conditions in finance payment updates**  
   Payment insert and sale aggregate update are separate operations without transaction semantics. Concurrent payments can produce wrong `amount_paid` values.

5. **Mixed `any` typing across dashboard and forms**  
   Widespread use of `any` weakens confidence in API contracts and increases runtime bug risk.

## Security and reliability improvements

1. Enforce strict CORS deny behavior (`callback(new Error(...))` or `callback(null, false)`).
2. Apply `requireAuth` consistently to all non-public business endpoints.
3. Add request schema validation (Zod/Joi) for every POST/PUT route.
4. Add centralized error middleware and structured request logging (with request IDs).
5. Add rate limiting and basic anti-abuse controls for auth + upload endpoints.
6. Add DB-side constraints/checks for non-negative quantity/amount fields.
7. Implement idempotency keys for payment and stock-mutating operations.

## Performance and maintainability improvements

1. Introduce shared TypeScript API types between client and server.
2. Replace ad-hoc query-string building with typed query helpers.
3. Refactor repeated CRUD patterns into service functions.
4. Add pagination defaults/maximum caps server-side for all list endpoints.
5. Add caching/partial revalidation for dashboard-heavy queries.

## Testing and quality gaps

1. No automated API test suite (auth, finance, transactions, reports).
2. No component/integration tests for critical flows (login, sales, payments).
3. No CI gate to run `server build`, `client lint`, and `client build`.
4. Add seed-based fixture strategy and test DB for reproducible checks.

## Features worth adding

1. **Role-based access control (RBAC)** for owner/manager/staff views.
2. **Invoice lifecycle controls** (draft, issued, partial, overdue automation).
3. **Alerts engine** for low stock, expiring products, receivables overdue.
4. **Audit log UI** for stock and payment mutations with actor identity.
5. **Offline-safe mobile workflow** for warehouse capture and sync.
6. **Advanced analytics** (customer aging buckets, SKU profitability, waste trend).

## Feature backlog (recommended additions)

### P0 (high impact)

1. **Multi-user roles & permissions**
   - Owner, accountant, operator roles.
   - Route-level guard + UI-level capability hiding.
   - Activity attribution (`updated_by` from authenticated user id, not static `system`).

2. **Accounts receivable workflow**
   - Aging buckets: `0-30`, `31-60`, `61-90`, `90+` days.
   - Automated overdue status transitions via scheduled job.
   - Reminder channels (WhatsApp/email export-ready payloads).

3. **Stock reconciliation module**
   - Physical count entry screen per SKU.
   - Variance report (system stock vs physical count).
   - One-click adjustment posting into stock logs with reason codes.

4. **Product batch tracking**
   - Batch number, purchase date, expiry date per lot.
   - FIFO/FEFO sell suggestion in sales form.
   - Recall-ready report by batch.

### P1 (growth features)

1. **Customer ledger and statement export**
   - Per-customer running balance timeline.
   - PDF statement for selected date range.
   - Payment allocation to specific invoice lines.

2. **Purchase planning assistant**
   - Reorder recommendation based on rolling sales velocity.
   - Suggested purchase quantity by lead time and safety stock.
   - "Stockout risk" card on dashboard.

3. **Waste intelligence**
   - Waste reason taxonomy (expired, damaged, spoilage, leakage, etc.).
   - Waste cost trend + top waste-causing SKUs.
   - Preventive actions checklist linked to high-waste items.

4. **Flexible pricing & margin guardrails**
   - Product-level min margin rule.
   - Discount approvals when sale price drops below threshold.
   - Margin impact preview in sales form.

### P2 (operational polish)

1. **Branch/warehouse support**
   - Multi-location stock ledger.
   - Inter-branch transfer flow (OUT from source, IN at destination).
   - Consolidated + branch-level reporting toggles.

2. **Notification center**
   - In-app inbox for expiring stock, low stock, overdue invoices.
   - Snooze/acknowledge actions.
   - Daily digest summary at login.

3. **Document management**
   - Attach invoice/receipt photos to purchases/expenses.
   - OCR metadata extraction with manual correction.
   - File retention policy controls.

4. **Data import/export toolkit**
   - CSV templates for products/customers/opening stock.
   - Import validation preview with row-level error report.
   - Scheduled exports for finance reconciliation.

## UI/UX design suggestions

1. Add unified spacing/type scale tokens to improve cross-page consistency.
2. Improve table usability: sticky headers, column resizing, saved filters.
3. Add empty states + inline recovery actions ("create product", "record payment").
4. Provide keyboard shortcuts for frequent actions (new sale/purchase).
5. Introduce optimistic UI and undo toast for reversible operations.
6. Add skeleton loaders (not only global overlay spinner) for perceived speed.
7. Improve color contrast and dark-mode support for accessibility.
8. Add status chips with clear semantic colors for payment states.

## Suggested execution order

1. Security hardening (CORS/auth guard/validation).
2. Lint/type cleanup and strict TS adoption for top 5 pages.
3. Payment and stock transaction consistency improvements.
4. UX polish pass on dashboard + tables.
5. Add CI and minimum integration test coverage.
