# HRMS Platform - Phase 1 Core Implementation Spec

A single, multi-tenant SaaS Human Resource Management System (HRMS) built using Node.js, Express, React, and MongoDB, with support for a local file-based persistent fallback database.

---

## 📁 Repository Layout

The project is split into two cleanly separated folders: `backend` and `frontend`.

### 1. Backend Architecture (`/backend`)
The backend is structured for modularity and scalability:
- **`config/`**: Contains database connections (`db.js`) and the persistent local JSON database driver (`jsonDb.js`).
- **`controllers/`**: House API handlers for:
  - `authController.js`: Session management, locks, tenant registrations, audit logs.
  - `employeeController.js`: Onboarding, updates, directory listings, profile change logs.
  - `attendanceController.js`: Daily punches, durations, statuses, regularization claims.
  - `leaveController.js`: Allowance balances, applications, date overlaps.
  - `approvalController.js`: Approver reviews for leaves, punches, and profile updates.
  - `reportController.js`: Dashboard aggregate metrics.
  - `notificationController.js`: Alerts.
- **`middleware/`**: Controls authentication state (`authMiddleware.js`), RBAC permissions (`roleMiddleware.js`), and tenant separation (`tenantMiddleware.js`).
- **`models/`**: Scopes and isolation schemas (`Attendance.js`, `Employee.js`, `User.js`, etc.) wrapping both MongoDB and the local fallback.
- **`routes/`**: Standard Express routers mapping REST endpoints.

### 2. Frontend Architecture (`/frontend`)
The frontend is structured with clean separation of concerns and role-based folder organization:
- **`src/apis/`**: Includes `apiClient.js` which manages fetch headers, authentication tokens, and tenant scoping.
- **`src/components/`**: Houses layout structural frames and routing access guards (`Layout.jsx`, `ProtectedRoute.jsx`).
- **`src/services/`**: Setup for global Redux Toolkit store (`store.js`) and slices:
  - `slices/authSlice.js`: Authentication state, session storage synchronizers, login/register thunks.
  - `slices/notificationSlice.js`: In-app alerts, unread counts, status update thunks.
- **`src/hooks/`**: Custom hooks for components (`useAuth.js` proxying state to Redux, `useNotifications.js` for alert operations).
- **`src/pages/`**: Divided into subfolders by role:
  - `auth/`: `LoginPage.jsx` and `RegisterPage.jsx`
  - `employee/`: Employee-facing dashboards (`EmployeeDashboardPage.jsx`), attendance punch logging (`MyAttendancePage.jsx`), leave requests (`MyLeavesPage.jsx`), and search directory (`DirectoryPage.jsx`).
  - `manager/`: Manager team view (`ManagerDashboardPage.jsx`) and team approvals (`TeamApprovalsPage.jsx`).
  - `hr/`: Company dashboard (`HRDashboardPage.jsx`) and onboarding/edit management (`EmployeeManagementPage.jsx`).
  - `leadership/`: Executive overview (`LeadershipDashboardPage.jsx`) and organization report registers (`OrganizationReportsPage.jsx`).
  - `Dashboard.jsx`: Main routing hub that detects `user.role` from Redux state and dynamically renders the appropriate dashboard view.

---

## ⚡ Quick Start Instructions

### Prerequisites
- Node.js installed locally.
- (Optional) MongoDB server running locally or a cloud database URL. *If MongoDB is not running, the application will automatically fallback to storing data in the local persistent file `/backend/data/db.json`.*

### Step 1: Install & Setup Backend
1. Navigate to `/backend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your environment variables in `/backend/.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/hrms
   JWT_SECRET=super_secret_jwt_key_here
   JWT_LIFETIME=1d
   ```
4. Seed the database (will automatically fallback to seeding `/backend/data/db.json` if MongoDB is not running):
   ```bash
   npm run seed
   ```
5. Start the backend:
   ```bash
   npm run dev
   ```

### Step 2: Install & Setup Frontend
1. Navigate to `/frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```

---

## 🔑 Demo Account Credentials
After database seeding, you can log in to the workspace with password `Welcome@123` using the following test roles:

| Role | Email Credentials | Dashboard Mounted | Capabilities |
| :--- | :--- | :--- | :--- |
| **HR / Admin** | `hr@antigravity.com` | `HRDashboardPage` | Onboard staff, manage profiles, configure roles, approve requests |
| **Manager** | `manager@antigravity.com` | `ManagerDashboardPage` | View reporting team, approve team leaves & regularization punches |
| **Employee** | `employee@antigravity.com` | `EmployeeDashboardPage` | Log daily punch in/out, view balance, apply leaves, search directory |
| **Leadership** | `leader@antigravity.com` | `LeadershipDashboardPage` | Org-wide headcount reports, department allocations, read-only stats |
