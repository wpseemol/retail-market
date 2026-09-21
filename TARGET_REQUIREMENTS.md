# Target Architecture & Functional Requirements: Multi-Vendor Platform (`www.niyenin.com`)

## 1. High-Level Architecture & Separation of Concerns

The ecosystem is decoupled into distinct client applications and a centralized backend API:

- **Customer Storefront (Buyers):**
    - Built with **Next.js (App Router)**, **Tailwind CSS**, and **Framer Motion**.
    - Optimized for SEO, Core Web Vitals, SSR/SSG rendering, and server-side cache invalidation.
    - Native Dark & Light mode theme token support.
    - Public domain: `www.niyenin.com`.

- **Internal Management Dashboard (SPA):**
    - Built with **React (Vite / CRA)**, **Tailwind CSS**, and state management (Zustand / Redux Toolkit).
    - Role-based workspace serving 4 user tiers:
        1. **Super Admin**
        2. **Admin**
        3. **Moderator**
        4. **Vendor (Seller)**
    - Dashboard domain / path: `admin.niyenin.com` or `dashboard.niyenin.com`.

- **Backend & API Layer:**
    - REST / GraphQL API built with Node.js / Express or Laravel.
    - Primary Database: PostgreSQL or MySQL (Relational schema required for multi-vendor transactions, ACID compliance, and financial ledgers).
    - Cache & In-Memory Store: Redis (Sessions, cart management, rate-limiting, and real-time chat sockets).

---

## 2. Role-Based Access Control (RBAC) Matrix

| Feature / Domain                       |  Super Admin  |        Admin        |    Moderator     |       Vendor       |    Customer     |
| :------------------------------------- | :-----------: | :-----------------: | :--------------: | :----------------: | :-------------: |
| **System Settings & Global Config**    |     Full      |        None         |       None       |        None        |      None       |
| **Admin & Moderator Management**       |     Full      |     Manage Mods     |       None       |        None        |      None       |
| **Vendor Verification / Approval**     |     Full      |    Policy-based     |    Flag only     |    Self-profile    |      None       |
| **Commission Rates & Payout Approval** |     Full      |    View / Review    |       None       | View Own / Request |      None       |
| **Product Listings & Moderation**      |     Full      |        Full         |  Review / Flag   |    Own Catalog     |   View / Buy    |
| **Order Management**                   |    Global     |       Global        | Track / Inspect  |     Own Orders     |   Own Orders    |
| **Refunds & Disputes Resolution**      | Final Verdict | Escalation / Triage | Review / Collect |   Provide Proof    | Request Refund  |
| **Review & Comment Moderation**        |     Full      |        Full         |  Edit / Delete   |      Respond       | Post / Edit Own |
| **Support Ticket System**              | Final Appeal  |   Tier 2 Support    |  Tier 1 Support  |   Raise / Reply    |  Raise / Reply  |

---

## 3. Customer Storefront Requirements (Next.js Application)

### 3.1 UX & Visual Standards

- **Responsive Breakpoints:** Mobile-first architecture supporting mobile, tablet, and desktop viewports.
- **Theme Switching:** Dark and Light mode toggle using CSS variables and Tailwind tokens (`bg-bg-base`, `bg-bg-surface`, `text-text-primary`, `text-brand-primary`).
- **Asset Organization:** All static assets referenced strictly from `/public/images/` and `/public/icons/`.

### 3.2 Core Feature Modules

- **Homepage:**
    - Responsive Header with categorized navigation drawer and search bar.
    - Hero banner with promotional slide integrations.
    - Featured services bar.
    - Product Category Groups (4-card layout featuring grid groupings and dynamic product sliders).
    - Promotional Showcase Banner Slider with vertical transition indicators and background overlays.
    - Best Seller Product section with single-row horizontal carousel, tab switching, and promo cards.
    - Latest Items sidebar with dual promotional banners.
    - Deals of the Day section featuring live countdown clocks, stock progress trackers, and interactive thumbnails.
    - Expert service promotional banner.
    - Top Brands directory.
    - Site-wide responsive footer with dual dark/light logo variants (`/logo/niyenin-dark.png` and `/logo/niyenin-white.png`).
- **Catalog & Discovery:**
    - Server-Side Rendered (SSR) search and facet filters (category, brand, price range, ratings, attributes).
    - Clean URLs with query parameter synchronization.
- **Product Detail Pages (PDP):**
    - Multi-angle high-resolution gallery with zoom preview.
    - Variant selectors (size, color, specifications).
    - Real-time vendor details, rating metrics, and shipping estimates.
    - Customer verified reviews with media attachments.
- **Cart, Checkout & Localized Payments:**
    - Guest checkout and registered customer multi-address books.
    - Integrated payment gateways: **SSLCOMMERZ**, **bKash**, **Nagad**, **Rocket**, Debit/Credit cards, and Cash on Delivery (COD).
    - Automated order invoice generation (PDF download and email delivery).

---

## 4. Multi-Role Dashboard Requirements (React SPA)

### 4.1 Super Admin Module

- System governance: Global commissions, flat/percentage rates, payment gateway credentials, and automated payout schedules.
- Access delegation: Creation, permissions assignment, and deactivation of Admins and Moderators.
- Global analytics: Net Gross Merchandise Value (GMV), platform fee collections, payout pipeline, and churn rates.
- Supreme dispute resolution panel for contested refund/fraud decisions.

### 4.2 Admin Module

- Day-to-day operations: Vendor identity verification (KYC/Trade License approval).
- Category tree taxonomy management and site-wide marketing banners.
- Order pipeline tracking: Shipped, Out for Delivery, Delivered, Returned, Failed.
- Vendor payment reconciliations and dispute escalation to Super Admin.

### 4.3 Moderator Module

- Product verification queue: Check newly submitted vendor products for image clarity, copyright violations, policy conformity, and appropriate categorization.
- Review scrubbing: Moderate spam, abusive comments, and fake vendor reviews.
- Customer service triage: First-line ticket response handling.

### 4.4 Vendor (Seller) Module

- Vendor onboarding workflow with verification document upload.
- Inventory and catalog manager: SKU configuration, stock tracking, and variant matrices.
- Order fulfillment hub: Shipping label generation, package tracking updates, and invoice printing.
- Financial ledger: Real-time balance, platform deduction breakdown, and manual/automated withdrawal requests.
- Vendor store customizer: Store profile, banner, description, return/shipping policies.

---

## 5. Support & Dispute Workflow Engine
