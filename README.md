# VendorBridge — Procurement & Vendor Management ERP

VendorBridge is an enterprise procurement platform that digitizes and automates the complete procurement lifecycle—from vendor onboarding and RFQ management to quotation evaluation, approvals, purchase orders, invoices, analytics, and AI-powered procurement insights.

Built for modern organizations, VendorBridge eliminates fragmented procurement processes and provides a centralized, secure, and intelligent procurement ecosystem.

---

## 🚀 Problem Statement

Organizations often struggle with:

* Manual procurement workflows using spreadsheets and emails
* Lack of vendor visibility and performance tracking
* Slow approval cycles
* Difficult quotation comparisons
* Limited spend analytics
* Poor auditability and compliance tracking
* Inefficient communication between procurement teams and vendors

VendorBridge addresses these challenges through an integrated procurement ERP platform that improves transparency, efficiency, and decision-making.

---

## 💡 Solution

VendorBridge provides an end-to-end procurement management system where organizations can:

* Manage vendors centrally
* Create and distribute RFQs
* Collect vendor quotations
* Compare quotations intelligently
* Run approval workflows
* Generate purchase orders and invoices
* Monitor procurement activities
* Analyze spending patterns
* Leverage AI-powered procurement recommendations

---

## 🔑 Demo Login Credentials

For testing and grading the ERP workflows, the following accounts have been pre-seeded in the database:

| Role                    | Email Address              | Password            | Description / Capabilities                                                  |
| :---------------------- | :------------------------- | :------------------ | :-------------------------------------------------------------------------- |
| **Admin**               | `admin@vendorbridge.com`   | `VendorBridge2026!` | Manage users, vendors, roles, audit logs, and analytics.                    |
| **Procurement Officer** | `officer@vendorbridge.com` | `VendorBridge2026!` | Create RFQs, invite vendors, compare quotations, generate POs and invoices. |
| **Manager**             | `manager@vendorbridge.com` | `VendorBridge2026!` | Approve, reject, or send-back procurement requests.                         |
| **Vendor**              | `vendor@vendorbridge.com`  | `VendorBridge2026!` | Submit quotations, manage bids, and view purchase orders.                   |

---

## 📋 Features Checklist & Status

| #  | Module                  | Key Functionalities                                   | Status |
| -- | ----------------------- | ----------------------------------------------------- | ------ |
| 1  | Authentication          | Email login, Google OAuth, RBAC, session persistence  | ✅      |
| 2  | Dashboard               | KPIs, charts, analytics, recent activities            | ✅      |
| 3  | Vendor Management       | Registration, GST validation, risk scoring, ratings   | ✅      |
| 4  | RFQ Management          | RFQ creation, vendor invitations, deadline management | ✅      |
| 5  | Vendor Portal           | Quotation submission, editing, bid management         | ✅      |
| 6  | Comparison Engine       | Side-by-side bid comparison, AI recommendation        | ✅      |
| 7  | Approval Workflow       | Approve, reject, send-back with remarks               | ✅      |
| 8  | PO & Invoice Management | Automated document generation and tax calculations    | ✅      |
| 9  | Activity & Audit Logs   | Realtime notifications and compliance tracking        | ✅      |
| 10 | Reports & Analytics     | Spend analytics, forecasting, CSV exports             | ✅      |

---

## 🔄 Procurement Workflow

```text
Vendor Registration
        │
        ▼
RFQ Creation
        │
        ▼
Vendor Invitations
        │
        ▼
Quotation Submission
        │
        ▼
AI-Based Comparison
        │
        ▼
Manager Approval
        │
        ▼
Purchase Order Generation
        │
        ▼
Invoice Generation
        │
        ▼
Analytics & Audit Logs
```

---

## 🤖 AI-Powered Features

VendorBridge integrates AI to assist procurement teams with better decision-making.

### Smart Quotation Analysis

* Identifies lowest-cost vendors
* Highlights fastest delivery options
* Evaluates vendor reliability
* Generates recommendation summaries

### Intelligent Procurement Insights

* Spend trend analysis
* Procurement forecasting
* Vendor risk assessment
* Performance monitoring

### Resilient AI Architecture

* Gemini-powered recommendations
* Local heuristic fallback system
* Zero-downtime recommendation engine

---

## 🛠️ Technology Stack

### Frontend

* React 19
* TanStack Start
* Vite
* TypeScript
* Tailwind CSS v4
* shadcn/ui
* React Hook Form
* Zod
* TanStack Table
* Recharts

### Backend

* Supabase PostgreSQL
* Row Level Security (RLS)
* Server Functions via TanStack Start

### Authentication

* Supabase Auth
* Google OAuth
* Role-Based Access Control

### AI

* Google Gemini
* AI Gateway
* Smart Heuristic Fallback Engine

### Realtime Services

* Supabase Realtime

### Document Generation

* React PDF Renderer

### Drag & Drop

* DnD Kit

---

## 🏗️ System Architecture

```text
┌─────────────────────────────┐
│         Frontend            │
│ React + TanStack Start      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Server Functions       │
│ Business Logic Layer        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Supabase Backend       │
│ PostgreSQL + RLS Policies   │
└───────┬───────────┬─────────┘
        │           │
        ▼           ▼
   AI Engine   Realtime Layer
   Gemini      Notifications
```

---

## 🔒 Security Features

VendorBridge follows enterprise-grade security practices:

* Row Level Security (RLS)
* UUID-based Primary Keys
* Role-Based Access Control
* Protected Routes
* Security-Definer Functions
* Privilege Escalation Prevention
* Role-Scoped Database Policies

---

## 🗄️ Database Schema

### User Management

* `profiles`
* `user_roles`

### Vendor Management

* `vendors`
* `vendor_ratings`

### Procurement

* `rfqs`
* `rfq_vendors`
* `quotations`
* `approvals`

### Procurement Documents

* `purchase_orders`
* `invoices`

### Monitoring & Compliance

* `notifications`
* `activity_logs`
* `audit_logs`

---

## 📊 Analytics & Reporting

VendorBridge provides actionable procurement insights through:

* Spend Summary KPIs
* Monthly Spend Forecasting
* Vendor Risk Analysis
* Vendor Rating Analytics
* Procurement Trends
* CSV Report Exports

---

## ⚙️ Local Development Setup

### Clone Repository

```bash
git clone https://github.com/your-username/vendorbridge.git
cd vendorbridge
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GOOGLE_CLIENT_ID=
AI_GATEWAY_API_KEY=
```

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

---

## 🌟 Future Enhancements

* Multi-Tenant Organization Support
* Mobile Application
* ERP Integrations (SAP, Oracle)
* Advanced Vendor Performance Prediction
* AI Contract Analysis
* Procurement Fraud Detection
* Blockchain-Based Audit Trail
* Multi-Currency Procurement Support

---

## 🏆 Why VendorBridge?

VendorBridge combines procurement automation, AI-powered insights, approval workflows, analytics, and compliance monitoring into a single platform, helping organizations make smarter procurement decisions while reducing operational complexity.

---

## 📜 License

This project was developed for educational, research, and hackathon purposes.
