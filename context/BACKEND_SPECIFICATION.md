# Multi-User Mess Meal Manager Backend Specification

This document provides complete, production-ready specifications for building the backend for the **Mess Meal Manager** application using **Next.js (App Router)**, **Prisma ORM**, **Neon PostgreSQL**, and **JWT Authentication**.

---

## 1. Architecture & Core Requirements

- **Framework**: Next.js (App Router with `/app/api/...` route handlers) or Node.js serverless functions.
- **Database**: Neon Serverless PostgreSQL via Prisma ORM.
- **Authentication**: Stateless JWT in the `Authorization: Bearer <token>` header.
- **Target Clients**:
  - Web browsers.
  - Android APK packaged via **html2app.dev** (runs inside Android WebView at `http://127.0.0.1:<port>`).
- **CORS Handling**: **Critical**. The API must return `Access-Control-Allow-Origin: *` (or reflect dynamic origins) and respond to `OPTIONS` preflight requests so requests from the Android WebView are never blocked.

---

## 2. Environment Variables (`.env`)

```env
# Neon PostgreSQL Connection URLs (Use private values from .env, do not commit real passwords)
DATABASE_URL="postgresql://neondb_owner:YOUR_DATABASE_PASSWORD@ep-floral-breeze-azrjh0ey-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
DIRECT_URL="postgresql://neondb_owner:YOUR_DATABASE_PASSWORD@ep-floral-breeze-azrjh0ey.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# JWT Secret Key
JWT_SECRET="super-secret-jwt-key-change-in-production-32-chars-min"
JWT_EXPIRES_IN="30d"

# App Port (Local development)
PORT=3000
```

---

## 3. Database Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  MANAGER
  MEMBER
}

enum MembershipStatus {
  ACTIVE
  LEFT
  REMOVED
}

enum ApprovalStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
}

enum BazarMode {
  QUICK
  CHECKLIST
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String
  passwordHash  String
  phone         String?
  memberships   MessMember[]
  personalNotes PersonalNote[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Mess {
  id          String        @id @default(cuid())
  name        String
  inviteCode  String        @unique // e.g. "MESS-7X9K2"
  managerId   String        // User ID of current manager
  members     MessMember[]
  months      MessMonth[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model MessMember {
  id            String           @id @default(cuid())
  userId        String
  messId        String
  role          Role             @default(MEMBER)
  status        MembershipStatus @default(ACTIVE)
  joinedAt      DateTime         @default(now())
  leftAt        DateTime?

  user          User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  mess          Mess             @relation(fields: [messId], references: [id], onDelete: Cascade)
  bazarEntries  BazarEntry[]
  deposits      Deposit[]
  dailyMeals    DailyMeal[]
  leaveRequests LeaveRequest[]

  @@unique([userId, status]) // Restricts user to at most 1 ACTIVE mess at a time!
}

model MessMonth {
  id           String        @id @default(cuid())
  messId       String
  monthKey     String        // Format: "YYYY-MM" (e.g., "2026-10")
  status       String        @default("OPEN") // OPEN, CLOSED
  createdAt    DateTime      @default(now())

  mess         Mess          @relation(fields: [messId], references: [id], onDelete: Cascade)
  bazarEntries BazarEntry[]
  deposits     Deposit[]
  dailyMeals   DailyMeal[]

  @@unique([messId, monthKey])
}

model BazarEntry {
  id          String         @id @default(cuid())
  messMonthId String
  memberId    String
  amount      Float
  category    String         // e.g. "Vegetables", "Fish/Meat", "Groceries", "Spices"
  date        DateTime
  status      ApprovalStatus @default(APPROVED) // PENDING for member submissions, APPROVED for manager
  mode        BazarMode      @default(QUICK)   // QUICK or CHECKLIST
  items       Json?          // Array: [{ name: string, qty: string, price: number, bought: boolean }]
  notes       String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  messMonth   MessMonth      @relation(fields: [messMonthId], references: [id], onDelete: Cascade)
  member      MessMember     @relation(fields: [memberId], references: [id], onDelete: Cascade)
}

model Deposit {
  id          String     @id @default(cuid())
  messMonthId String
  memberId    String
  amount      Float
  date        DateTime
  notes       String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  messMonth   MessMonth  @relation(fields: [messMonthId], references: [id], onDelete: Cascade)
  member      MessMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
}

model DailyMeal {
  id          String     @id @default(cuid())
  messMonthId String
  memberId    String
  date        DateTime   // Stored as start-of-day UTC (YYYY-MM-DDT00:00:00.000Z)
  lunch       Float      @default(1.0)
  dinner      Float      @default(1.0)
  isLeave     Boolean    @default(false)
  updatedAt   DateTime   @updatedAt

  messMonth   MessMonth  @relation(fields: [messMonthId], references: [id], onDelete: Cascade)
  member      MessMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([memberId, date]) // Exactly 1 record per member per calendar date (idempotent)
}

model LeaveRequest {
  id          String         @id @default(cuid())
  memberId    String
  startDate   DateTime
  endDate     DateTime
  reason      String?
  status      ApprovalStatus @default(PENDING) // PENDING, APPROVED, REJECTED
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  member      MessMember     @relation(fields: [memberId], references: [id], onDelete: Cascade)
}

model PersonalNote {
  id          String   @id @default(cuid())
  userId      String   // Completely user-scoped (persists even if user changes mess)
  title       String
  content     String
  isChecklist Boolean  @default(false)
  items       Json?    // Array: [{ id: string, text: string, done: boolean }]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 4. CORS & Authentication Middleware

### CORS Helper (`lib/cors.ts`)
Must handle all incoming API requests and preflight `OPTIONS` requests:

```typescript
import { NextResponse } from 'next/server';

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
}

export function handleOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
```

### JWT Auth Helper (`lib/auth.ts`)
Extracts and verifies `Authorization: Bearer <token>`:
- Encodes: `{ userId: string, email: string }`
- Rejects missing or invalid tokens with HTTP 401.

---

## 5. API Endpoints Specification

### A. Authentication
| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Body: `{ name, email, password, phone? }`. Returns user & JWT. |
| `POST` | `/api/auth/login` | Body: `{ email, password }`. Verifies password hash. Returns user & JWT. |
| `GET` | `/api/auth/me` | Returns current user profile and active mess membership (if any). |

### B. Mess Management
| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/mess/create` | Body: `{ name }`. Checks if user already has an `ACTIVE` mess. If so, rejects (400). Creates mess, generates unique 6-char `inviteCode`, creates `MessMember` with role `MANAGER`. |
| `POST` | `/api/mess/join` | Body: `{ inviteCode }`. Checks if user is already in an `ACTIVE` mess. Finds mess by code. Adds user as `MEMBER` with `ACTIVE` status. |
| `POST` | `/api/mess/leave` | Member leaves current mess. Sets `status = 'LEFT'`, `leftAt = now()`. All historical meal & bazar records are strictly preserved! |
| `GET` | `/api/mess/members` | Returns list of members: both `ACTIVE` and `LEFT` (so historical data displays author names correctly). |

### C. Months Management
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/mess/months` | Returns list of months for current mess. |
| `POST` | `/api/mess/months` | Body: `{ monthKey: "YYYY-MM" }`. Locks out future months (can only create current or previous months). Creates `MessMonth`. |

### D. Meals & Leaves
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/meals?monthKey=YYYY-MM` | Returns all daily meal records for the month grouped by date and member. |
| `POST` | `/api/meals/update` | Body: `{ memberId, date, lunch, dinner }`. Upserts `DailyMeal`. Role check: Members can only update their own meals unless `MANAGER`. |
| `POST` | `/api/meals/leave-request` | Body: `{ startDate, endDate, reason? }`. Submits leave request. |
| `GET` | `/api/meals/leave-requests` | Returns leave requests. Managers see all; members see their own. |
| `PATCH` | `/api/meals/leave-requests/[id]` | Body: `{ status: "APPROVED" | "REJECTED" }`. Manager only. If approved, bulk upserts `DailyMeal` for those dates with `lunch: 0, dinner: 0, isLeave: true`. |

### E. Bazar Management (2 Modes & Approvals)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/bazar?monthKey=YYYY-MM` | Returns all bazar records for the month. Includes pending/draft counts for manager. |
| `POST` | `/api/bazar` | Body: `{ monthKey, amount, category, date, mode: "QUICK" | "CHECKLIST", items?, notes? }`.<br>• If submitted by `MANAGER` $\rightarrow$ status `APPROVED`.<br>• If submitted by `MEMBER` $\rightarrow$ status `PENDING`. |
| `PATCH` | `/api/bazar/[id]/approve` | Manager only. Body: `{ status: "APPROVED" | "REJECTED" }`. |
| `PUT` | `/api/bazar/[id]` | Edit existing record (amount, category, items). Rejection/edit does not create duplicate entries. |
| `DELETE` | `/api/bazar/[id]` | Delete bazar entry (Manager only, or Member if still in `DRAFT`/`PENDING`). |

### F. Deposits
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/deposits?monthKey=YYYY-MM` | Returns all deposits for the month. |
| `POST` | `/api/deposits` | Body: `{ monthKey, memberId, amount, date, notes? }`. (Manager only). |
| `PUT` | `/api/deposits/[id]` | Edit deposit amount or details. |
| `DELETE` | `/api/deposits/[id]` | Delete deposit record with confirmation. |

### G. Calculation Summary Endpoint
`GET /api/summary?monthKey=YYYY-MM`
Returns computed statistics:
```typescript
{
  monthKey: "2026-10",
  totalApprovedBazar: 12500,
  totalDeposits: 15000,
  totalMeals: 180,
  mealRate: 69.44, // totalApprovedBazar / totalMeals
  memberSummaries: [
    {
      memberId: "...",
      name: "Fardin",
      totalMeals: 45,
      totalDeposit: 5000,
      mealCost: 3125, // 45 * 69.44
      balance: +1875 // deposit - mealCost (positive = refund, negative = due)
    }
  ]
}
```
*Note: Pending bazar entries are strictly excluded from `totalApprovedBazar` and `mealRate`.*

### H. Personal Notes (Isolated from Mess)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/notes` | Returns current user's personal notes & checklists. |
| `POST` | `/api/notes` | Body: `{ title, content, isChecklist, items? }`. |
| `PUT` | `/api/notes/[id]` | Update title, content, or toggle checklist items. |
| `DELETE` | `/api/notes/[id]` | Delete personal note. |

---

## 6. Cloud Import/Export (Solving APK File Download Limits)

Why Android APK import/export failed previously:
- In mobile WebViews (html2app), browser-triggered `<a>` blob downloads and `<input type="file">` file dialogs are restricted by Android OS permissions without native bridge hooks.

How the Cloud API Solves This:
1. **Automatic Cloud Sync**: Every entry is instantly persisted to the Neon Postgres database. When a member logs into their phone, everything is already loaded.
2. **Server-Generated Export**:
   - `GET /api/mess/export?monthKey=YYYY-MM`: Generates and returns a clean, structured JSON payload of the entire month's data.
   - The frontend can also display a **"Copy JSON to Clipboard"** button (which works 100% inside mobile WebViews without requiring file storage permissions).
3. **Cloud Import**:
   - `POST /api/mess/import`: Accepts a JSON payload pasted or sent via body to restore or migrate data.

---

## 7. Verification Steps

1. Run `npx prisma db push` to generate all tables in Neon.
2. Seed/test with a small script (`tests/test-flow.ts`):
   - Register User 1 $\rightarrow$ Create Mess $\rightarrow$ Get Invite Code.
   - Register User 2 $\rightarrow$ Join Mess using Invite Code.
   - User 2 submits Bazar entry (status is `PENDING`).
   - Verify `GET /api/summary` does not count pending entry.
   - User 1 (Manager) approves Bazar entry.
   - Verify `GET /api/summary` now reflects new meal rate.
   - User 2 requests Leave $\rightarrow$ Manager approves $\rightarrow$ Daily meals are set to 0.
