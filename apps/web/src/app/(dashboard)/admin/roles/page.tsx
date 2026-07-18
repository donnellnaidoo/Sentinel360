"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

export default function AdminRolesPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingPermissionIds, setPendingPermissionIds] = useState<string[] | null>(null);

  const { data: roles } = useQuery(trpc.roles.list.queryOptions());
  const { data: allPermissions } = useQuery(trpc.roles.listPermissions.queryOptions());

  const filteredRoles = useMemo(() => {
    if (!roles) return [];
    if (!searchQuery) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    );
  }, [roles, searchQuery]);

  const activeRole = roles?.find((r) => r.id === selectedRoleId) ?? roles?.[0];

  const { data: rolePermissions } = useQuery({
    ...trpc.roles.getPermissions.queryOptions({ id: activeRole?.id ?? "" }),
    enabled: !!activeRole,
  });

  useEffect(() => {
    setPendingPermissionIds(rolePermissions ? rolePermissions.map((p) => p.id) : null);
  }, [rolePermissions]);

  const updatePermissions = useMutation(
    trpc.roles.updatePermissions.mutationOptions({
      onSuccess: () => {
        if (activeRole) {
          queryClient.invalidateQueries({ queryKey: trpc.roles.getPermissions.queryKey({ id: activeRole.id }) });
        }
      },
    }),
  );

  const grouped = useMemo(() => {
    const byResource = new Map<string, { code: string; id: string; action: string }[]>();
    for (const perm of allPermissions ?? []) {
      const [resource, action] = perm.code.split(":");
      if (!resource || !action) continue;
      const list = byResource.get(resource) ?? [];
      list.push({ code: perm.code, id: perm.id, action });
      byResource.set(resource, list);
    }
    return byResource;
  }, [allPermissions]);

  const actions = useMemo(() => {
    const set = new Set<string>();
    for (const perm of allPermissions ?? []) {
      const action = perm.code.split(":")[1];
      if (action) set.add(action);
    }
    return Array.from(set);
  }, [allPermissions]);

  const isChecked = (permissionId: string) => (pendingPermissionIds ?? []).includes(permissionId);

  const toggle = (permissionId: string) => {
    setPendingPermissionIds((prev) => {
      const current = prev ?? [];
      return current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId];
    });
  };

  const hasChanges =
    rolePermissions &&
    pendingPermissionIds &&
    (rolePermissions.length !== pendingPermissionIds.length ||
      !rolePermissions.every((p) => pendingPermissionIds.includes(p.id)));

  return (
    <div className="flex h-full gap-6">
      <div className="w-80 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Roles</h2>
        </div>

        <div className="relative mb-4">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          {filteredRoles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeRole?.id === role.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted border border-transparent"
              }`}
            >
              <span className="font-medium text-sm">{role.name}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 border-l border-border pl-6">
        {!activeRole && <p className="text-sm text-muted-foreground">Loading roles...</p>}
        {activeRole && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">{activeRole.name}</h2>
                <p className="text-sm text-muted-foreground">{activeRole.description}</p>
              </div>
              <button
                disabled={!hasChanges || updatePermissions.isPending}
                onClick={() =>
                  updatePermissions.mutate({ roleId: activeRole.id, permissionIds: pendingPermissionIds ?? [] })
                }
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-40"
              >
                {updatePermissions.isPending ? "Saving..." : "Save Permissions"}
              </button>
            </div>

            {updatePermissions.error && (
              <p className="text-sm text-destructive mb-4">{updatePermissions.error.message}</p>
            )}

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Permissions</h3>
              <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resource</th>
                      {actions.map((action) => (
                        <th key={action} className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {action}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(grouped.entries()).map(([resource, perms]) => (
                      <tr key={resource} className="border-t border-border">
                        <td className="px-4 py-3 text-sm font-medium text-foreground capitalize">{resource}</td>
                        {actions.map((action) => {
                          const perm = perms.find((p) => p.action === action);
                          if (!perm) {
                            return (
                              <td key={action} className="text-center px-2 py-3">
                                <span className="material-symbols-outlined text-muted-foreground/30 text-[18px]">remove</span>
                              </td>
                            );
                          }
                          return (
                            <td key={action} className="text-center px-2 py-3">
                              <input
                                type="checkbox"
                                checked={isChecked(perm.id)}
                                onChange={() => toggle(perm.id)}
                                className="h-4 w-4"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
