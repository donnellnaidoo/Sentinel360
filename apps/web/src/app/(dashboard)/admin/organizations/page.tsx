"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

const ORG_TYPES = ["security_company", "police_department", "community_group"] as const;

const typeLabels: Record<string, string> = {
  security_company: "Security Company",
  police_department: "Police Department",
  community_group: "Community Group",
};

const typeColors: Record<string, string> = {
  security_company: "bg-blue-100 text-blue-800",
  police_department: "bg-green-100 text-green-800",
  community_group: "bg-purple-100 text-purple-800",
};

export default function AdminOrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: ORG_TYPES[0] as string, contactEmail: "" });

  const { data: organizations, isLoading } = useQuery(trpc.organizations.list.queryOptions());

  const filteredOrgs = useMemo(() => {
    if (!organizations) return [];
    if (!searchQuery) return organizations;
    const q = searchQuery.toLowerCase();
    return organizations.filter(
      (o) => o.name.toLowerCase().includes(q) || o.type.toLowerCase().includes(q),
    );
  }, [organizations, searchQuery]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.organizations.list.queryKey() });

  const createOrg = useMutation(
    trpc.organizations.create.mutationOptions({
      onSuccess: () => {
        invalidate();
        setShowAddModal(false);
        setForm({ name: "", type: ORG_TYPES[0], contactEmail: "" });
      },
    }),
  );

  const deactivateOrg = useMutation(trpc.organizations.deactivate.mutationOptions({ onSuccess: invalidate }));

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Organizations</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage security companies, police departments, and community groups.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add_business</span>
          Add Organization
        </button>
      </div>

      <div className="relative mb-4">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">search</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search organizations..."
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading organizations...</p>}
      {!isLoading && filteredOrgs.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No organizations found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOrgs.map((org) => (
          <div key={org.id} className="border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{org.name}</h3>
                <span className={`inline-block mt-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${typeColors[org.type] ?? "bg-gray-100 text-gray-800"}`}>
                  {typeLabels[org.type] ?? org.type}
                </span>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${org.isActive ? "bg-green-500" : "bg-red-400"}`} />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{org.contactEmail ?? "No contact email"}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                disabled={!org.isActive || deactivateOrg.isPending}
                onClick={() => {
                  if (confirm(`Deactivate ${org.name}?`)) deactivateOrg.mutate({ id: org.id });
                }}
                className="text-xs text-destructive hover:underline font-medium disabled:opacity-40"
              >
                {org.isActive ? "Deactivate" : "Inactive"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="bg-background rounded-xl w-full max-w-lg shadow-2xl relative z-10 border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-semibold">Add Organization</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createOrg.mutate({
                  name: form.name,
                  type: form.type as never,
                  contactEmail: form.contactEmail || undefined,
                });
              }}
            >
              <div className="p-6 space-y-4">
                {createOrg.error && <p className="text-sm text-destructive">{createOrg.error.message}</p>}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organization Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {ORG_TYPES.map((t) => (
                      <option key={t} value={t}>{typeLabels[t]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Email</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                    className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/30">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOrg.isPending}
                  className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {createOrg.isPending ? "Creating..." : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
