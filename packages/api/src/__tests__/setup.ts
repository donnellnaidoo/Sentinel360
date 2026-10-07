import { vi } from "vitest";

// packages/env validates these at import time. Tests mock the DB and
// Supabase clients, so placeholders are enough — they are never dialled.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.SUPABASE_URL ??= "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.CORS_ORIGIN ??= "http://localhost:3001";
process.env.AI_SERVICE_API_KEY ??= "test-ai-service-key";

vi.mock("@Sentinel360/auth", () => {
  return {
    supabaseAdmin: {
      auth: {
        getUser: vi.fn(),
        signInWithPassword: vi.fn(),
        admin: {
          createUser: vi.fn(),
          updateUserById: vi.fn(),
          generateLink: vi.fn(),
          signOut: vi.fn(),
        },
      },
    },
    recordAuditEvent: vi.fn(),
    sendPasswordResetCode: vi.fn(),
    AuditEvents: {},
  };
});

vi.mock("@Sentinel360/db", () => {
  const defaultQuery = vi.fn().mockResolvedValue([]);

  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(defaultQuery),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn(defaultQuery),
              })),
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(vi.fn().mockResolvedValue([{ id: "mock-id" }])),
          })),
          returning: vi.fn(vi.fn().mockResolvedValue([{ id: "mock-id" }])),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(vi.fn().mockResolvedValue([{ id: "mock-id" }])),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    },
  };
});
