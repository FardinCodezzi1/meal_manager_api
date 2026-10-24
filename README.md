<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="100" alt="Nest Logo" />
</p>

<h1 align="center">🥘 Mess Meal Manager API (NestJS)</h1>

<p align="center">
  High-performance, production-ready backend API built with <strong>NestJS</strong>, <strong>Prisma ORM</strong>, and <strong>Neon PostgreSQL</strong>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/OpenAPI-3.0.3-6BA539?style=flat&logo=swagger&logoColor=white" alt="Swagger" />
</p>

---

## 🚀 Key Features

* **Authentication & Role-Based Access Control**:
  * Secure JWT authentication with bcrypt password hashing.
  * Roles: `MANAGER` and `MEMBER` per mess; `LEAD`, `ACCOUNTANT`, `MEMBER` per tour; and platform `SUPER_ADMIN`.
  * Safe account deactivation preserving roommate financial ledgers and anonymizing historical entries.
* **Mess & Roommate Management**:
  * Invite code generation (`MESS-XXXXX`) for seamless roommate onboarding.
  * Dynamic monthly cycles (`YYYY-MM`) with automatic creation and isolation.
  * Safe mess closure guardrails with manager password verification.
* **Manager Rotation Queue & Anti-Cheat Audit Logs**:
  * Dynamic sequence queues for fair, democratic manager handoffs.
  * Automatic monthly rotation hook on new month creation.
  * Immutable, tamper-evident audit logs tracking all manual overrides and queue reorderings.
* **Bazar Expense Tracking & Approval Workflow**:
  * 2-mode entry: Quick expense logging or detailed itemized checklists.
  * Approval workflow: Member submissions remain `PENDING` until approved by the Manager.
  * Summary calculations strictly isolate unapproved pending expenses.
* **Daily Meal Tracking & Automated Leave Handling**:
  * Decimal meal recording (`lunch`, `dinner`).
  * Leave request approval workflow that automatically zeroes out meals (`lunch: 0, dinner: 0, isLeave: true`).
* **Financial Reconciliation & Real-Time Balances**:
  * Member deposits management (Manager only).
  * Real-time calculation of total meals, total approved bazar expenses, and exact meal rate.
  * Individual member balance calculations (surplus/refund vs. amount due).
* **Tour Expense Management System**:
  * Comprehensive group trip budgeting, expenses, deposits, and per-member cost distribution.
  * Role delegation: Tour Lead can appoint Tour Accountants.
  * Offline participant support for friends without accounts.
* **Interactive Documentation & OpenAPI 3.0.3**:
  * Built-in interactive Swagger UI at `/api/docs`.
  * Raw OpenAPI specification at `/api/openapi.json`.

---

## 🛠 Project Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Ensure your `.env` file contains your Neon PostgreSQL connection string and JWT secret:
```env
DATABASE_URL="postgresql://neondb_owner:***@ep-floral-breeze-azrjh0ey-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
DIRECT_URL="postgresql://neondb_owner:***@ep-floral-breeze-azrjh0ey.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="30d"
PORT=3000
```

### 3. Generate Prisma Client
```bash
npm run db:generate
```

---

## 🏃 Running the Application

### Development (Hot-Reload)
```bash
npm run start:dev
# or
npm run dev
```

### Production Build & Execution
```bash
npm run build
npm run start:prod
```

The server will start on `http://localhost:3000`.
* **Swagger API Docs**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
* **OpenAPI Spec**: [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json)

---

## 🧪 Automated Testing

Run the full end-to-end integration test suite covering all 24 architectural workflows:
```bash
npm run test:flow
```

---

## 🚢 Recommended Production Deployment (Render)

Because this backend uses persistent connection pooling with Neon PostgreSQL, deploy as a **Render Web Service**:

1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository.
3. Configure the service:
   - **Region**: `Singapore (Southeast Asia)` *(matches Neon DB region for ~2ms latency)*
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
4. Add Environment Variables:
   - `DATABASE_URL`: Your pooled Neon connection string.
   - `DIRECT_URL`: Your direct Neon connection string.
   - `JWT_SECRET`: Your production JWT secret.
   - `PORT`: `10000` (Render default).
