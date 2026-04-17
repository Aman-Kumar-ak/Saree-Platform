---
name: Saree Shop Platform Plan
overview: Build a two-sided saree e-commerce platform that helps an offline store sell online, with customer shopping flows and an admin dashboard for catalog, orders, shipping, and tracking.
todos:
  - id: setup-mvp-architecture
    content: Initialize frontend/backend projects, environment config, and MongoDB schemas for users/products/categories/orders.
    status: completed
  - id: build-customer-mvp
    content: Implement catalog, product details, cart, checkout, and COD order placement end-to-end.
    status: completed
  - id: build-admin-dashboard
    content: Implement admin authentication guards and dashboard for product/order/tracking management with Cloudinary image uploads.
    status: completed
  - id: implement-auth
    content: Integrate phone OTP and Google login, connect verified auth tokens to backend user records and roles.
    status: completed
  - id: integrate-payments
    content: Add Razorpay prepaid flow with backend verification and webhook handling while preserving COD.
    status: pending
  - id: harden-and-launch
    content: Apply security controls, monitoring, legal pages, deployment setup, and final QA/UAT checklist.
    status: pending
isProject: false
---

# Saree Shop Online Platform Plan

## Goal

Launch a reliable MVP for a saree shop to sell online, then expand into secure authentication, prepaid payments, and delivery tracking automation.

## Phase 1: Foundation and MVP (Customer shopping + COD)

- Set up frontend (`React + Tailwind`) and backend (`Node.js + Express`) with environment-based config.
- Create core MongoDB models: `User`, `Product`, `Category`, `Order`.
- Build customer flows:
  - Home/catalog page
  - Category filtering
  - Product details
  - Cart
  - Checkout with Cash on Delivery (COD)
- Build backend APIs for product listing/details and COD order placement.
- Save order item snapshots (`name`, `price`, `image`, `quantity`) so historical orders remain accurate even if product data changes later.

## Phase 2: Admin dashboard + catalog operations

- Build role-based admin routes and dashboard (`/admin`).
- Add admin features:
  - Create/edit/delete products
  - Manage categories
  - Manage stock quantity
  - View all orders
- Integrate image upload via Cloudinary:
  - Upload from admin UI
  - Store only Cloudinary URLs in MongoDB
- Add order management actions:
  - Update status (`placed`, `packed`, `shipped`, `delivered`, `cancelled`)
  - Add/update tracking number
  - Store status timeline (who updated + when)

## Phase 3: Authentication and user accounts

- Implement customer authentication using Firebase Auth:
  - Phone OTP (primary)
  - Google login (secondary)
- Implement secure admin authentication:
  - Restricted admin allowlist and role checks
  - Avoid exposing admin access via open sign-up
- Connect auth to backend with token verification and user provisioning.
- Add customer account section for:
  - Profile basics
  - Address book (multiple addresses + default address)
  - Order history and tracking view

## Phase 4: Payments and shipping maturity

- Add Razorpay prepaid payments while keeping COD available.
- Implement backend payment verification with webhook validation (do not trust frontend callback alone).
- Track payment state transitions (`pending`, `paid`, `failed`, `refunded`).
- Keep shipping integration simple initially:
  - Manual courier booking and tracking number entry by admin
  - Customer tracking page showing courier name + tracking ID
- Optional next step: integrate courier aggregator API (Shiprocket/Delhivery) for automatic status sync.

## Phase 5: Security, compliance, and production readiness

- Enforce API security:
  - JWT/session checks
  - Admin-only middleware for protected routes
  - Request validation and sanitization
  - Rate limiting on login/OTP endpoints
- Protect data:
  - HTTPS everywhere
  - Secrets in environment variables
  - Minimize sensitive data logging
  - Data backup policy for MongoDB
- Add operational essentials:
  - Error monitoring/logging
  - Basic analytics (orders, top products, conversion)
  - SEO basics for product/category pages
  - Legal pages (privacy policy, terms, return/refund)

## Suggested Database Collections

- `users`: identity, role, verified login methods
- `addresses`: user-linked delivery addresses
- `categories`: saree categories and metadata
- `products`: catalog, stock, media URLs
- `orders`: items snapshot, amounts, statuses, tracking
- `payments`: gateway refs, status history, reconciliation

## API Groups (High level)

- `auth`: OTP send/verify, Google auth token exchange, session/token refresh
- `products`: list, detail, admin CRUD
- `categories`: list, admin CRUD
- `cart`: add/remove/update/get (session or user-bound)
- `orders`: create, customer list/detail, admin list/detail/update
- `payments`: create order, verify payment, webhook handler
- `uploads`: signed upload or backend-mediated upload

## Milestone-based timeline (practical)

- Week 1-2: Phase 1 MVP (catalog, cart, COD orders)
- Week 3: Phase 2 admin panel + image upload
- Week 4: Phase 3 auth + account pages
- Week 5: Phase 4 Razorpay + tracking polish
- Week 6: Phase 5 hardening + deployment + QA

## Future Implementation

Items below ease operations and conversion after the core phases; schedule them when MVP and admin basics are stable.

### Customer UX and catalog enhancements

- **Product variants**: fields such as color, fabric, length, blouse included (even simple at first) to match saree buying behavior.
- **Search and sort**: by price, newest, popularity (or featured) to improve discovery.
- **Stock safety**: atomic stock decrement (or reservation) on order placement to avoid overselling.
- **Human-readable order IDs**: e.g. `SR2026-000123` for support and packing labels.
- **Shipping charge rules**: configurable flat rate, free above a cart threshold, or zone-based as the business needs.
- **Order notifications**: confirmation via SMS, WhatsApp, and/or email so customers trust the purchase.
- **Lightweight CMS**: editable banner text, contact details, and policy snippets without code deploys.
- **Empty and error states**: dedicated UI for no products, out of stock, network errors, and failed payment (when prepaid exists).

### Admin and operational enhancements

- **Bulk product upload**: CSV import for large existing catalogs.
- **Image pipeline**: compression and optional cropping before or at Cloudinary upload for faster pages.
- **Low stock alerts**: per-product threshold and dashboard warnings.
- **Order filters**: by date range, status, payment mode, city, or courier.
- **Invoice / packing slip PDF**: one-click print or download from admin.
- **Internal order notes**: staff-only remarks (e.g. call customer, partial dispatch) separate from customer-facing status.
- **Roles beyond single admin**: e.g. `owner` vs `staff` with scoped permissions.
- **Activity / audit log**: who changed prices, stock, or order status and when.

### Guiding principles (ease of launch)

- **Phase 1 focus**: COD plus manual courier booking and tracking entry ships fastest; avoid blocking launch on automation.
- **Phase 2 priority**: prioritize operational speed (bulk upload, filters, slips, alerts) before deep courier API or advanced marketing features.

### Longer-term (optional)

- WhatsApp (or SMS) transactional updates beyond order placed.
- Discount coupons and campaigns.
- Reviews and ratings on products.
- Inventory and sales analytics dashboards.
- Deeper courier integration (aggregator APIs, automatic status sync).

## Success criteria

- Customers can browse, order, and track without support calls.
- Admin can fully manage catalog and shipping from dashboard.
- No sensitive data exposure and basic abuse protections are active.
- Store can fulfill real orders reliably in production.

