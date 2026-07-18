import { vi } from "vitest";

vi.mock("@Sentinel360/auth", () => {
  return {
    supabaseAdmin: {
      auth: {
        getUser: vi.fn(),
        admin: {
          createUser: vi.fn(),
          updateUserById: vi.fn(),
        },
      },
    },
    recordAuditEvent: vi.fn(),
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
