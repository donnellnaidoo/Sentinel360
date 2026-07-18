import { describe, expect, it } from "vitest";

import {
  assignRoleSchema,
  createOrganizationSchema,
  createRoleSchema,
  createUserSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateOrganizationSchema,
  updateProfileSchema,
  userListSchema,
  verifyEmailSchema,
} from "../validators";

describe("registerSchema", () => {
  it("should accept valid input", () => {
    const result = registerSchema.parse({ name: "Test User", email: "test@example.com", password: "securePass1" });
    expect(result.name).toBe("Test User");
  });

  it("should reject short name", () => {
    expect(() => registerSchema.parse({ name: "A", email: "test@example.com", password: "securePass1" })).toThrow();
  });

  it("should reject invalid email", () => {
    expect(() => registerSchema.parse({ name: "Test User", email: "not-an-email", password: "securePass1" })).toThrow();
  });

  it("should reject short password", () => {
    expect(() => registerSchema.parse({ name: "Test User", email: "test@example.com", password: "short" })).toThrow();
  });

  it("should accept optional fields", () => {
    const result = registerSchema.parse({
      name: "Test User",
      email: "test@example.com",
      password: "securePass1",
      firstName: "Test",
      lastName: "User",
      phoneNumber: "+1234567890",
    });
    expect(result.firstName).toBe("Test");
    expect(result.phoneNumber).toBe("+1234567890");
  });
});

describe("loginSchema", () => {
  it("should accept valid input", () => {
    const result = loginSchema.parse({ email: "test@example.com", password: "pass" });
    expect(result.email).toBe("test@example.com");
  });

  it("should reject empty password", () => {
    expect(() => loginSchema.parse({ email: "test@example.com", password: "" })).toThrow();
  });
});

describe("createUserSchema", () => {
  it("should accept valid input", () => {
    const result = createUserSchema.parse({
      name: "New User",
      email: "new@example.com",
      roleIds: ["550e8400-e29b-41d4-a716-446655440000"],
    });
    expect(result.name).toBe("New User");
    expect(result.roleIds).toHaveLength(1);
  });

  it("should reject invalid uuid in roleIds", () => {
    expect(() =>
      createUserSchema.parse({
        name: "New User",
        email: "new@example.com",
        roleIds: ["not-a-uuid"],
      }),
    ).toThrow();
  });

  it("should accept without roleIds", () => {
    const result = createUserSchema.parse({ name: "New User", email: "new@example.com" });
    expect(result.roleIds).toBeUndefined();
  });
});

describe("updateProfileSchema", () => {
  it("should accept partial updates", () => {
    const result = updateProfileSchema.parse({ name: "Updated Name" });
    expect(result.name).toBe("Updated Name");
  });

  it("should accept empty object", () => {
    const result = updateProfileSchema.parse({});
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("should reject empty name", () => {
    expect(() => updateProfileSchema.parse({ name: "A" })).toThrow();
  });

  it("should reject invalid image url", () => {
    expect(() => updateProfileSchema.parse({ image: "not-a-url" })).toThrow();
  });
});

describe("resetPasswordSchema", () => {
  it("should accept valid input", () => {
    const result = resetPasswordSchema.parse({ token: "valid-token", password: "newSecurePass1" });
    expect(result.token).toBe("valid-token");
  });

  it("should reject empty token", () => {
    expect(() => resetPasswordSchema.parse({ token: "", password: "newSecurePass1" })).toThrow();
  });
});

describe("forgotPasswordSchema", () => {
  it("should accept valid email", () => {
    const result = forgotPasswordSchema.parse({ email: "test@example.com" });
    expect(result.email).toBe("test@example.com");
  });

  it("should reject invalid email", () => {
    expect(() => forgotPasswordSchema.parse({ email: "" })).toThrow();
  });
});

describe("verifyEmailSchema", () => {
  it("should accept valid token", () => {
    const result = verifyEmailSchema.parse({ token: "some-token" });
    expect(result.token).toBe("some-token");
  });

  it("should reject empty token", () => {
    expect(() => verifyEmailSchema.parse({ token: "" })).toThrow();
  });
});

describe("userListSchema", () => {
  it("should apply defaults", () => {
    const result = userListSchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it("should reject limit > 100", () => {
    expect(() => userListSchema.parse({ limit: 200 })).toThrow();
  });

  it("should accept status filter", () => {
    const result = userListSchema.parse({ status: "active" });
    expect(result.status).toBe("active");
  });

  it("should reject invalid status", () => {
    expect(() => userListSchema.parse({ status: "unknown" })).toThrow();
  });

  it("should accept organization filter", () => {
    const result = userListSchema.parse({ organizationId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.organizationId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });
});

describe("createRoleSchema", () => {
  it("should accept valid input", () => {
    const result = createRoleSchema.parse({ code: "viewer", name: "Viewer" });
    expect(result.code).toBe("viewer");
  });

  it("should reject short code", () => {
    expect(() => createRoleSchema.parse({ code: "A", name: "Viewer" })).toThrow();
  });

  it("should accept permissionIds", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = createRoleSchema.parse({ code: "viewer", name: "Viewer", permissionIds: [uuid] });
    expect(result.permissionIds).toHaveLength(1);
  });
});

describe("createOrganizationSchema", () => {
  it("should accept valid security_company", () => {
    const result = createOrganizationSchema.parse({ name: "SecureCorp", type: "security_company" });
    expect(result.name).toBe("SecureCorp");
  });

  it("should accept valid police_department", () => {
    const result = createOrganizationSchema.parse({ name: "NYPD", type: "police_department" });
    expect(result.type).toBe("police_department");
  });

  it("should reject invalid type", () => {
    expect(() => createOrganizationSchema.parse({ name: "Test", type: "invalid_type" })).toThrow();
  });
});

describe("updateOrganizationSchema", () => {
  it("should require id", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = updateOrganizationSchema.parse({ id: uuid, name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("should reject invalid id", () => {
    expect(() => updateOrganizationSchema.parse({ id: "bad", name: "Test" })).toThrow();
  });
});

describe("assignRoleSchema", () => {
  it("should accept valid input", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = assignRoleSchema.parse({ userId: "user1", roleId: uuid });
    expect(result.userId).toBe("user1");
  });

  it("should reject invalid roleId", () => {
    expect(() => assignRoleSchema.parse({ userId: "user1", roleId: "bad" })).toThrow();
  });
});
