"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

// Distinct from Admin -> Users (which manages account details/status): this
// page is the role-assignment console — Admin -> Users deliberately leaves
// roles read-only there and points here to edit them.
export default function SuperAdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pendingRoleIds, setPendingRoleIds] = useState<string[] | null>(null);

  const { data, isLoading } = useQuery(
    trpc.users.list.queryOptions({ search: searchQuery || undefined, limit: 50, offset: 0 }),
  );
  const { data: roles } = useQuery(trpc.roles.list.queryOptions());
  const { data: selectedUser } = useQuery({
    ...trpc.users.getById.queryOptions({ id: selectedUserId ?? "" }),
    enabled: !!selectedUserId,
  });

  useEffect(() => {
    setPendingRoleIds(selectedUser ? selectedUser.roles.map((r) => r.id) : null);
  }, [selectedUser]);

  const updateUser = useMutation(
    trpc.users.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.users.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.users.getById.queryKey({ id: selectedUserId ?? "" }) });
      },
    }),
  );

  const hasChanges = useMemo(() => {
    if (!selectedUser || !pendingRoleIds) return false;
    const current = selectedUser.roles.map((r) => r.id);
    return current.length !== pendingRoleIds.length || !current.every((id) => pendingRoleIds.includes(id));
  }, [selectedUser, pendingRoleIds]);

  return (
    <div className="flex h-full gap-6">
      <div className="w-96 flex-shrink-0">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground">Users</h2>
          <p className="text-xs text-muted-foreground mt-1">Select a user to manage their roles</p>
        </div>

        <div className="relative mb-4">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">search</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading users...</p>}

        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          {data?.items.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                selectedUserId === u.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"
              }`}
            >
              <p className="font-medium text-sm">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 border-l border-border pl-6">
        {!selectedUserId && (
          <p className="text-sm text-muted-foreground">Select a user from the list to manage their roles.</p>
        )}
        {selectedUserId && !selectedUser && (
          <p className="text-sm text-muted-foreground">Loading user...</p>
        )}
        {selectedUserId && selectedUser && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedUser.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              <button
                disabled={!hasChanges || updateUser.isPending}
                onClick={() => updateUser.mutate({ id: selectedUser.id, roleIds: pendingRoleIds ?? [] })}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-40"
              >
                {updateUser.isPending ? "Saving..." : "Save Roles"}
              </button>
            </div>

            {updateUser.error && <p className="text-sm text-destructive mb-4">{updateUser.error.message}</p>}

            <div className="space-y-2">
              {roles?.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-3 border border-border rounded-lg px-4 py-3 cursor-pointer hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    checked={(pendingRoleIds ?? []).includes(role.id)}
                    onChange={(e) =>
                      setPendingRoleIds((prev) => {
                        const current = prev ?? [];
                        return e.target.checked
                          ? [...current, role.id]
                          : current.filter((id) => id !== role.id);
                      })
                    }
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-medium">{role.name}</p>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
