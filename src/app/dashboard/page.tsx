"use client";

import { useAuth } from "@/components/auth/AuthProvider";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="py-6 sm:py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Signed in as {user?.email}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3">
        {["My listings", "Messages", "Account settings"].map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
          >
            <h2 className="text-base font-semibold text-slate-900">{label}</h2>
            <p className="mt-2 text-sm text-slate-500">Coming soon</p>
          </div>
        ))}
      </div>
    </div>
  );
}
