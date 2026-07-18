"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ProfileAvatar } from "@Sentinel360/ui/components/profile-avatar";

import { queryClient, trpc } from "@/lib/trpc/client";

export default function ProfilePage() {
  const { data: me, isLoading } = useQuery(trpc.users.me.queryOptions());
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (me) {
      setFirstName(me.firstName ?? "");
      setLastName(me.lastName ?? "");
      setPhoneNumber(me.phoneNumber ?? "");
    }
  }, [me]);

  const updateMe = useMutation(
    trpc.users.updateMe.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.users.me.queryKey() }),
    }),
  );

  if (isLoading || !me) {
    return <p className="text-sm text-muted-foreground">Loading profile...</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your account details.</p>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <ProfileAvatar alt={me.name} size="lg" fallback={me.name} src={me.image ?? undefined} />
        <div>
          <p className="text-lg font-semibold">{me.name}</p>
          <p className="text-sm text-muted-foreground">{me.email}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMe.mutate({ firstName, lastName, phoneNumber });
        }}
        className="space-y-4 bg-card border border-border/30 rounded-lg p-6"
      >
        {updateMe.isSuccess && <p className="text-sm text-emerald-600">Profile updated.</p>}
        {updateMe.isError && <p className="text-sm text-destructive">{updateMe.error.message}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</label>
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={updateMe.isPending}
          className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {updateMe.isPending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
