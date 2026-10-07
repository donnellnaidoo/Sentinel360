"use client";

import { createContext, useContext } from "react";

import type { ConsoleRole } from "./console-role";

const ConsoleRoleContext = createContext<ConsoleRole>("admin");

export const ConsoleRoleProvider = ConsoleRoleContext.Provider;

/**
 * The signed-in user's console role, resolved server-side in the dashboard
 * layout. Use it to hide controls the API would reject — it is a UX hint,
 * not a security boundary (the tRPC procedures enforce the real checks).
 */
export function useConsoleRole() {
  const role = useContext(ConsoleRoleContext);
  return { role, isSuperAdmin: role === "super_admin" };
}
