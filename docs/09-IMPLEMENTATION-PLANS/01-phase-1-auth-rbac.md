# Phase 1: Foundation — Authentication & RBAC

> **Sentinel360 Implementation Plan — Phase 1**
> **Version:** 1.0 | **Last Updated:** June 2026
> **Estimated Effort:** 3–4 weeks / 120–160 person-hours
> **Dependencies:** None (foundation layer)

---

## 1. Objective

Establish the foundational authentication, authorisation, and organisation management layer for Sentinel360. This phase enables all subsequent phases by providing user registration, login, role-based access control (RBAC), session management, and organisation grouping. Every API call, frontend route, and mobile screen in later phases depends on the auth infrastructure built here.

**Corresponding Requirements:**
- **US-01** — Register & Login (Community Member)
- **US-17** — Manage Users & Roles (Super Admin)
- **§6.3** — Access Control (RBAC) and Data Security
- **§9** — System Users (Security Operators, Investigators, Admins, Law Enforcement)

---

## 2. Key Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | **Database — Auth & RBAC schema** | Users, sessions, verification tokens, roles, permissions, user_roles, role_permissions, organisations tables |
| 2 | **better-auth integration** | Email/password authentication, session management, email verification, password reset |
| 3 | **tRPC auth middleware** | Protected procedure middleware, role-based guards, permission checks |
| 4 | **User CRUD API** | Create, read, update, deactivate users; profile management |
| 5 | **Role & Permission management** | Role assignment, permission grants, RBAC enforcement |
| 6 | **Organisation management** | Multi-tenant organisation support for security companies and police departments |
| 7 | **Web: Auth pages** | Login, Register, Forgot Password, Reset Password, Email Verification |
| 8 | **Web: User management admin page** | Super Admin interface for managing users, roles, and organisations |
| 9 | **Mobile: Auth screens** | Onboarding, Sign-in, Sign-up screens |
| 10 | **Audit logging foundation** | Core audit log tables and service for tracking auth events |
| 11 | **Email service** | Transactional email sending (verification, password reset, notifications) |

---

## 3. Database Tables

### 3.1 Schema Overview

| Table | Purpose | Phase Added | Dependencies |
|-------|---------|-------------|--------------|
| `users` | Core user accounts for all roles | Phase 1 | — |
| `sessions` | better-auth session management | Phase 1 | `users` |
| `accounts` | better-auth provider accounts (OAuth, email) | Phase 1 | `users` |
| `verification` | Email verification tokens | Phase 1 | `users` |
| `roles` | System and custom role definitions | Phase 1 | — |
| `permissions` | Granular permission definitions | Phase 1 | — |
| `user_roles` | Many-to-many user-to-role assignments | Phase 1 | `users`, `roles` |
| `role_permissions` | Many-to-many role-to-permission grants | Phase 1 | `roles`, `permissions` |
| `organizations` | Multi-tenant organisation grouping | Phase 1 | — |

### 3.2 Key Tables Detail

#### `users`
```sql
-- Managed primarily by better-auth, extended with profile fields
CREATE TABLE users (
    id                  TEXT PRIMARY KEY,                  -- better-auth managed
    email               VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at   TIMESTAMPTZ,
    password_hash       VARCHAR(255) NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    phone_number        VARCHAR(20),
    avatar_url          VARCHAR(512),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_locked           BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    last_login_at       TIMESTAMPTZ,
    last_login_ip       INET,
    organization_id     TEXT REFERENCES organizations(id),
    requires_2fa        BOOLEAN NOT NULL DEFAULT FALSE,
    totp_secret         VARCHAR(64),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);
```

#### `roles`
```sql
CREATE TABLE roles (
    id          TEXT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: community, security_operator, law_enforcement, admin, super_admin
```

#### `permissions`
```sql
CREATE TABLE permissions (
    id          TEXT PRIMARY KEY,
    resource    VARCHAR(100) NOT NULL,  -- 'cases', 'evidence', 'users', 'alerts', etc.
    action      VARCHAR(50) NOT NULL,   -- 'create', 'read', 'update', 'delete', 'verify'
    description TEXT,
    UNIQUE(resource, action)
);
```

#### `organizations`
```sql
CREATE TABLE organizations (
    id              TEXT PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(50) NOT NULL,  -- security_company, police_department, community_group
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(20),
    address         JSONB,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
```

### 3.3 Prisma Schema Location

`packages/db/prisma/schema.prisma` — Add models for `User`, `Session`, `Account`, `Verification`, `Role`, `Permission`, `UserRole`, `RolePermission`, `Organization`. Extend the base better-auth schema with Sentinel360-specific fields.

---

## 4. API Endpoints

### 4.1 Authentication Endpoints (better-auth)

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| `POST` | `/api/v1/auth/register` | Register new user | Public | — |
| `POST` | `/api/v1/auth/login` | Login with email/password | Public | — |
| `POST` | `/api/v1/auth/logout` | Logout / revoke session | Auth | All |
| `POST` | `/api/v1/auth/verify-email` | Verify email with token | Public | — |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset | Public | — |
| `POST` | `/api/v1/auth/reset-password` | Reset password with token | Public | — |
| `GET`  | `/api/v1/auth/session` | Get current session info | Auth | All |
| `POST` | `/api/v1/auth/refresh` | Refresh access token | Public | — |

### 4.2 User Management Endpoints (tRPC)

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/users/me` | Get current user profile | All authenticated |
| `PATCH`  | `/api/v1/users/me` | Update own profile | All authenticated |
| `GET`    | `/api/v1/users` | List all users (paginated) | admin, super_admin |
| `GET`    | `/api/v1/users/{id}` | Get user details | admin, super_admin |
| `POST`   | `/api/v1/users` | Create new user | super_admin |
| `PATCH`  | `/api/v1/users/{id}` | Update user | admin (limited), super_admin |
| `DELETE` | `/api/v1/users/{id}` | Deactivate user | super_admin |
| `GET`    | `/api/v1/users/{id}/sessions` | List user sessions | super_admin |
| `DELETE` | `/api/v1/users/{id}/sessions/{sessionId}` | Revoke session | super_admin |

### 4.3 Roles & Permissions Endpoints (tRPC)

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`   | `/api/v1/roles` | List all roles | admin, super_admin |
| `POST`  | `/api/v1/roles` | Create custom role | super_admin |
| `GET`   | `/api/v1/roles/{id}/permissions` | Get role permissions | admin, super_admin |
| `PATCH` | `/api/v1/roles/{id}/permissions` | Update role permissions | super_admin |
| `GET`   | `/api/v1/users/{id}/roles` | Get user roles | admin, super_admin |
| `POST`  | `/api/v1/users/{id}/roles` | Assign role to user | super_admin |
| `DELETE`| `/api/v1/users/{id}/roles/{roleId}` | Remove role from user | super_admin |

### 4.4 Organisation Endpoints (tRPC)

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`   | `/api/v1/organizations` | List organisations | admin, super_admin |
| `POST`  | `/api/v1/organizations` | Create organisation | super_admin |
| `GET`   | `/api/v1/organizations/{id}` | Get organisation details | admin, super_admin |
| `PATCH` | `/api/v1/organizations/{id}` | Update organisation | super_admin |
| `DELETE`| `/api/v1/organizations/{id}` | Deactivate organisation | super_admin |

### 4.5 Health & Status

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/health` | System health check | Public |
| `GET` | `/api/v1/health/ready` | Readiness probe | Public |

---

## 5. Frontend Components (Web — Next.js)

### 5.1 Route Structure

| Route | Component | Description | Auth |
|-------|-----------|-------------|------|
| `/login` | `LoginPage` | Email/password login form | Public |
| `/register` | `RegisterPage` | Registration form with validation | Public |
| `/forgot-password` | `ForgotPasswordPage` | Email input for reset link | Public |
| `/reset-password` | `ResetPasswordPage` | New password form (token from URL) | Public |
| `/verify-email` | `VerifyEmailPage` | Email verification status | Public |
| `/admin/users` | `UserManagementPage` | User list with CRUD (Super Admin) | Super Admin |
| `/admin/users/new` | `UserCreatePage` | Create new user form | Super Admin |
| `/admin/users/{id}` | `UserDetailPage` | User details, roles, sessions | Super Admin |
| `/admin/roles` | `RoleManagementPage` | Role and permission management | Super Admin |
| `/admin/organizations` | `OrganizationManagementPage` | Organisation list/CRUD | Super Admin |
| `/settings` | `SettingsPage` | Profile update, password change | Auth |

### 5.2 Shared Components

| Component | Description | Used In |
|-----------|-------------|---------|
| `AuthLayout` | Layout wrapper for auth pages (logo, branding) | All auth pages |
| `LoginForm` | Email/password form with validation | LoginPage |
| `RegisterForm` | Registration with name, email, password | RegisterPage |
| `PasswordResetForm` | New password with confirmation | ResetPasswordPage |
| `UserTable` | Paginated, filterable table of users | UserManagementPage |
| `UserForm` | Create/edit user form (role assignment) | UserCreatePage, UserDetailPage |
| `RoleBadge` | Coloured badge showing user role | UserTable, UserDetailPage |
| `RoleSelector` | Multi-select dropdown for role assignment | UserForm |
| `PermissionMatrix` | Grid view of resource × action permissions | RoleManagementPage |
| `OrganizationCard` | Organisation summary card | OrganizationManagementPage |
| `SessionList` | Table of active sessions with revoke action | UserDetailPage |

### 5.3 tRPC Procedure Groups

```typescript
// packages/api/src/routers/auth.ts
export const authRouter = t.router({
  register: publicProcedure.input(RegisterSchema).mutation(...),
  login: publicProcedure.input(LoginSchema).mutation(...),
  logout: protectedProcedure.mutation(...),
  getSession: protectedProcedure.query(...),
  forgotPassword: publicProcedure.input(EmailSchema).mutation(...),
  resetPassword: publicProcedure.input(ResetPasswordSchema).mutation(...),
  verifyEmail: publicProcedure.input(VerifyEmailSchema).mutation(...),
});

// packages/api/src/routers/users.ts
export const usersRouter = t.router({
  me: protectedProcedure.query(...),
  updateMe: protectedProcedure.input(UpdateProfileSchema).mutation(...),
  list: adminProcedure.input(UserListSchema).query(...),
  getById: adminProcedure.input(IdSchema).query(...),
  create: superAdminProcedure.input(CreateUserSchema).mutation(...),
  update: superAdminProcedure.input(UpdateUserSchema).mutation(...),
  deactivate: superAdminProcedure.input(IdSchema).mutation(...),
  getSessions: superAdminProcedure.input(IdSchema).query(...),
  revokeSession: superAdminProcedure.input(SessionIdSchema).mutation(...),
});

// packages/api/src/routers/roles.ts
export const rolesRouter = t.router({
  list: adminProcedure.query(...),
  create: superAdminProcedure.input(CreateRoleSchema).mutation(...),
  getPermissions: adminProcedure.input(IdSchema).query(...),
  updatePermissions: superAdminProcedure.input(PermissionsSchema).mutation(...),
  assignRole: superAdminProcedure.input(AssignRoleSchema).mutation(...),
  removeRole: superAdminProcedure.input(RemoveRoleSchema).mutation(...),
});
```

---

## 6. Mobile Screens (Expo)

### 6.1 Screen Structure

| Screen | Route | Description | Auth |
|--------|-------|-------------|------|
| `OnboardingScreen` | `/onboarding` | Welcome carousel with app features | Public |
| `SignInScreen` | `/sign-in` | Email/password login | Public |
| `SignUpScreen` | `/sign-up` | Registration form | Public |
| `ForgotPasswordScreen` | `/forgot-password` | Email input for reset | Public |
| `VerifyEmailScreen` | `/verify-email` | Verification status display | Public |
| `ProfileScreen` | `/profile` | View/edit own profile | Auth |
| `SettingsScreen` | `/settings` | App settings, password change | Auth |

### 6.2 Shared Mobile Components

| Component | Description |
|-----------|-------------|
| `AuthScrollView` | Keyboard-avoiding scroll container for auth forms |
| `EmailInput` | Validated email input with icon |
| `PasswordInput` | Secure text input with show/hide toggle |
| `PrimaryButton` | Themed primary action button |
| `SocialAuthButtons` | Google/Apple sign-in buttons (future) |
| `BiometricToggle` | Face ID / fingerprint toggle (settings) |

### 6.3 Expo Router Setup

```typescript
// apps/native/app/_layout.tsx
export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SessionProvider>
  );
}
```

---

## 7. Testing Focus

### 7.1 Unit Tests

| Area | Tests | Target Coverage |
|------|-------|-----------------|
| **Auth service** | Registration validation, login flow, password hashing, session creation | 90%+ |
| **RBAC middleware** | Role guard logic, permission resolution, hierarchical role checks | 95%+ |
| **User service** | CRUD operations, soft delete, profile update validation | 90%+ |
| **Token management** | JWT generation, refresh rotation, revocation | 95%+ |
| **Zod validation schemas** | All auth and user input schemas | 100% |

### 7.2 Integration Tests

| Area | Tests |
|------|-------|
| **Register → Login flow** | Full registration, email verification, login, session retrieval |
| **Password reset flow** | Request reset, receive token, reset password, login with new password |
| **Role assignment** | Assign role, verify permission enforcement, remove role |
| **Session management** | Create session, list sessions, revoke session |
| **Organisation CRUD** | Create, list, update, deactivate organisation |
| **Rate limiting** | Auth endpoint rate limiting on login |

### 7.3 E2E Tests (Playwright — Web)

| Test | Description |
|------|-------------|
| `auth-register.spec.ts` | Complete registration flow |
| `auth-login.spec.ts` | Login with valid/invalid credentials |
| `auth-password-reset.spec.ts` | Forgot password → reset → login |
| `admin-user-management.spec.ts` | User CRUD, role assignment, deactivation |
| `admin-role-management.spec.ts` | Permission matrix, role CRUD |
| `auth-rbac-guards.spec.ts` | Verify role-restricted routes reject unauthorised access |

### 7.4 E2E Tests (Detox — Mobile)

| Test | Description |
|------|-------------|
| `onboarding.spec.ts` | Carousel swiping, get started button |
| `sign-up.spec.ts` | Registration form submission |
| `sign-in.spec.ts` | Login from credentials |

---

## 8. Estimated Effort Breakdown

| Task | Hours | Assigned To |
|------|-------|-------------|
| **Database schema** — Users, roles, permissions, organisations (Prisma models + migration) | 12 | Backend Dev |
| **better-auth setup** — Configuration, session management, email verification | 16 | Full Stack Dev |
| **tRPC auth middleware** — Protected procedure wrapper, role guards, permission resolver | 12 | Backend Dev |
| **Auth endpoints** — register, login, logout, refresh, forgot/reset password | 16 | Backend Dev |
| **User CRUD endpoints** — List, get, create, update, deactivate | 12 | Full Stack Dev |
| **Role & permission endpoints** — Role CRUD, assign/remove, permission matrix | 10 | Backend Dev |
| **Organisation endpoints** — CRUD, user-org association | 8 | Backend Dev |
| **Email service** — Transactional email sending (verification, password reset) | 10 | Full Stack Dev |
| **Web: Auth pages** — Login, Register, Forgot Password, Reset Password, Verify Email | 20 | Frontend Dev |
| **Web: Admin user management** — User list, create/edit, role assignment UI | 16 | Frontend Dev |
| **Web: Role & permission management** — Permission matrix, role CRUD UI | 12 | Frontend Dev |
| **Mobile: Auth screens** — Onboarding, Sign-in, Sign-up | 20 | Frontend Dev |
| **Mobile: Profile & Settings** — Profile view, password change | 8 | Frontend Dev |
| **Tests** — Unit, integration, E2E for all auth flows | 16 | All |
| **Documentation** — API docs, setup guide, RBAC matrix | 4 | PM / BA |
| **Total** | **192** | |

---

## 9. Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| better-auth configuration complexity | Delays auth setup | Use proven config from reference projects; stub with simple JWT if needed |
| RBAC design changes mid-phase | Scope creep | Freeze RBAC model at start; defer advanced conditions to Phase 4 |
| Email deliverability (dev environment) | Blocked verification flow | Use log-based email capture in dev; configure SendGrid/Mailgun in staging |
| Mobile auth flow differences | Duplicate effort | Share Zod schemas between web and mobile; Expo Router auth guard pattern |

---

## 10. Definition of Done

- [ ] All database tables created and migrated
- [ ] better-auth fully configured with email/password auth
- [ ] tRPC middleware enforcing role-based access on all protected procedures
- [ ] User registration, login, logout, email verification, password reset all working
- [ ] Super Admin can create, read, update, deactivate users
- [ ] Roles and permissions assignable via API
- [ ] Organisations CRUD operational
- [ ] Web auth pages fully functional and responsive
- [ ] Mobile auth screens working on both iOS and Android simulators
- [ ] Unit + integration test coverage > 85% for auth and user domains
- [ ] E2E tests passing for all critical auth flows
- [ ] API documentation generated (tRPC OpenAPI export)
- [ ] No critical or high-severity security vulnerabilities
