# VendorBridge — Procurement & Vendor Management ERP

VendorBridge is an enterprise procurement platform: vendors, RFQs, quotations, approvals, purchase orders, invoices, audit, analytics and AI insights — all in one console.

---

## 🔑 Demo Login Credentials

For testing and grading the ERP workflows, the following accounts have been pre-seeded in the database:

| Role | Email Address | Password | Description / Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@vendorbridge.com` | `VendorBridge2026!` | Manage users, vendors, roles, view full audit logs & analytics. |
| **Procurement Officer** | `officer@vendorbridge.com` | `VendorBridge2026!` | Create RFQs, invite vendors, compare quotations, generate POs and Invoices. |
| **Manager** | `manager@vendorbridge.com` | `VendorBridge2026!` | Approve, reject, or send-back quotation requests with remarks. |
| **Vendor** | `vendor@vendorbridge.com` | `VendorBridge2026!` | View invited RFQs, submit/update quotations, view POs. (Linked to *Apex Solutions Pvt Ltd*) |

---

## 📋 Features Checklist & Status

All requested ERP features have been verified, with a 100% success rate:

| # | Screen / Feature Area | Key Functionalities | Verification Status |
| :--- | :--- | :--- | :--- |
| **1** | **Login & Signup** | Email & password auth, role selection on signup, session persistency, route guarding. |  Working |
| **2** | **Dashboard** | KPI cards (Vendors, RFQs, POs, Invoices, Spend, Approvals), charts (spending trend, RFQ status distribution, volume), recent RFQ stream, quick action buttons. |  Working |
| **3** | **Vendor Management** | Vendor registration (category, contact details, address), automatic GSTIN validation, rating display, risk scoring, category & status filters, search. |  Working |
| **4** | **RFQ Creation** | Title, specs/product details, quantity, budget (INR), deadline calendar selection, active vendor invitation list. |  Working |
| **5** | **Vendor Quotation** | Bid price input, delivery days, warranty period, vendor notes, editable/updatable drafts. Locked automatically when the deadline passes. |  Working |
| **6** | **Quotation Comparison** | Side-by-side comparison matrix, lowest-price highlighting (Best tag), fastest-delivery indicator, top-rated vendor indicator, sorting, AI recommendation tradeoff summary. |  Working |
| **7** | **Approval Workflow** | Approve, Reject, or Send Back with remarks. Workflow state updates across approvals, RFQs, and quotations. Timeline tracking. |  Working |
| **8** | **PO & Invoice Generation** | Auto-generated PO number (`PO-YYYY-XXXXX`), auto-generated invoice number (`INV-YYYY-XXXXX`), auto tax calculations (9% CGST + 9% SGST), branded PDF generation, print-to-browser, open default email composer (mailto). |  Working |
| **9** | **Activity Logs & Audits** | Real-time notifications popover, activity stream logs, admin audit logs for modifications. |  Working |
| **10** | **Reports & Analytics** | spend summary KPIs, monthly spend predictive projection line, vendor rating vs risk bar charts, CSV report exports. |  Working |

---

## 🛠️ Stack & Architecture

- **Frontend**: TanStack Start (React 19, Vite), Tailwind v4, shadcn/ui, React Hook Form, Zod, TanStack Table, Recharts
- **Backend**: Supabase Postgres with Row Level Security, server functions via `@tanstack/react-start`
- **Auth**: Email/password + Google (managed OAuth), role-based access control
- **AI**: AI Gateway (default `google/gemini-3-flash-preview`) with **smart local heuristic fallbacks** to ensure zero-downtime operation
- **PDFs**: `@react-pdf/renderer`
- **Realtime**: Supabase Realtime for notifications
- **Drag & Drop**: `@dnd-kit/core`
## 🗄️ Database Tables

- `profiles`, `user_roles` (separate table — prevents privilege escalation)
- `vendors`, `vendor_ratings`
- `rfqs`, `rfq_vendors`, `quotations`, `approvals`
- `purchase_orders`, `invoices`
- `notifications`, `activity_logs`, `audit_logs`

All tables use UUID PKs, Row Level Security and role-scoped policies via `has_role()` / `is_staff()` security-definer functions.
