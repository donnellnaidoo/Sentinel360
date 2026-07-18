"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DataTable } from "@Sentinel360/ui/components/data-table";
import type { Column } from "@Sentinel360/ui/components/data-table";
import { SearchBar } from "@Sentinel360/ui/components/search-bar";
import type { SearchFilter } from "@Sentinel360/ui/components/search-bar";
import { StatusBadge } from "@Sentinel360/ui/components/status-badge";
import { ProfileAvatar } from "@Sentinel360/ui/components/profile-avatar";

import { queryClient, trpc } from "@/lib/trpc/client";

const PAGE_SIZE = 20;

interface UserRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | Date | null;
}

const searchFilters: SearchFilter[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "locked", label: "Locked" },
    ],
  },
];

interface UserFormState {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
  organizationId: string;
}

const emptyForm: UserFormState = { name: "", email: "", password: "", roleIds: [], organizationId: "" };

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);

  const input = useMemo(
    () => ({
      search: searchQuery || undefined,
      status: (activeFilters.status || undefined) as "active" | "inactive" | "locked" | undefined,
      limit: PAGE_SIZE,
      offset: 0,
    }),
    [searchQuery, activeFilters],
  );

  const { data, isLoading } = useQuery(trpc.users.list.queryOptions(input));
  const { data: roles } = useQuery(trpc.roles.list.queryOptions());
  const { data: organizations } = useQuery(trpc.organizations.list.queryOptions());
  const { data: editingUser } = useQuery({
    ...trpc.users.getById.queryOptions({ id: editUserId ?? "" }),
    enabled: !!editUserId,
  });

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: trpc.users.list.queryKey() });

  const createUser = useMutation(
    trpc.users.create.mutationOptions({
      onSuccess: () => {
        invalidateUsers();
        setShowAddModal(false);
        setForm(emptyForm);
      },
    }),
  );

  const updateUser = useMutation(
    trpc.users.update.mutationOptions({
      onSuccess: () => {
        invalidateUsers();
        setEditUserId(null);
      },
    }),
  );

  const deactivateUser = useMutation(
    trpc.users.deactivate.mutationOptions({ onSuccess: invalidateUsers }),
  );

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      label: "User",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <ProfileAvatar alt={u.name} size="sm" fallback={u.name} />
          <div>
            <p className="font-medium text-sm">{u.name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (u) =>
        u.isLocked ? (
          <StatusBadge status="critical">Locked</StatusBadge>
        ) : u.isActive ? (
          <StatusBadge status="active">Active</StatusBadge>
        ) : (
          <StatusBadge status="archived">Inactive</StatusBadge>
        ),
    },
    {
      key: "lastLoginAt",
      label: "Last Login",
      sortable: true,
      render: (u) => (
        <span className="text-sm text-muted-foreground">
          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      className: "text-right",
      render: (u) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEditUserId(u.id)}
            className="p-1.5 text-muted-foreground hover:text-primary rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button
            onClick={() => {
              if (confirm(`Deactivate ${u.name}?`)) deactivateUser.mutate({ id: u.id });
            }}
            className="p-1.5 text-muted-foreground hover:text-red-400 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all registered users and their roles
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add User
        </button>
      </div>

      <div className="mb-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name or email..."
          filters={searchFilters}
          activeFilters={activeFilters}
          onFilterChange={(key, value) =>
            setActiveFilters((prev) => ({ ...prev, [key]: value }))
          }
          onClear={() => setSearchQuery("")}
        />
      </div>

      <DataTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
        isLoading={isLoading}
        pageSize={10}
        emptyMessage="No users found matching your filters."
      />

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="bg-background rounded-xl w-full max-w-lg shadow-2xl relative z-10 border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-semibold">Add New User</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUser.mutate({
                  name: form.name,
                  email: form.email,
                  password: form.password || undefined,
                  roleIds: form.roleIds,
                  organizationId: form.organizationId || undefined,
                });
              }}
            >
              <div className="p-6 space-y-4">
                {createUser.error && <p className="text-sm text-destructive">{createUser.error.message}</p>}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Temporary Password</label>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organization</label>
                  <select
                    value={form.organizationId}
                    onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
                    className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">None</option>
                    {organizations?.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roles</label>
                  <div className="flex flex-wrap gap-2">
                    {roles?.map((r) => (
                      <label key={r.id} className="flex items-center gap-1.5 text-sm border border-input rounded-lg px-2.5 py-1.5">
                        <input
                          type="checkbox"
                          checked={form.roleIds.includes(r.id)}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              roleIds: e.target.checked
                                ? [...f.roleIds, r.id]
                                : f.roleIds.filter((id) => id !== r.id),
                            }))
                          }
                        />
                        {r.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUser.isPending}
                  className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {createUser.isPending ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUserId && editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditUserId(null)} />
          <div className="bg-background rounded-xl w-full max-w-lg shadow-2xl relative z-10 border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-semibold">Edit {editingUser.name}</h3>
              <button onClick={() => setEditUserId(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                updateUser.mutate({
                  id: editingUser.id,
                  isActive: fd.get("isActive") === "on",
                  isLocked: fd.get("isLocked") === "on",
                  roleIds: editingUser.roles.map((r) => r.id),
                });
              }}
            >
              <div className="p-6 space-y-4">
                {updateUser.error && <p className="text-sm text-destructive">{updateUser.error.message}</p>}
                <p className="text-sm text-muted-foreground">{editingUser.email}</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={editingUser.isActive} />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isLocked" defaultChecked={editingUser.isLocked} />
                  Locked
                </label>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roles</label>
                  <div className="flex flex-wrap gap-2">
                    {editingUser.roles.map((r) => (
                      <span key={r.id} className="text-xs bg-muted px-2 py-1 rounded-full">{r.name}</span>
                    ))}
                    {editingUser.roles.length === 0 && (
                      <span className="text-xs text-muted-foreground">No roles assigned — edit from Roles page</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setEditUserId(null)}
                  className="px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUser.isPending}
                  className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {updateUser.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
