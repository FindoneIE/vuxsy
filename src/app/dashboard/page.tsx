"use client";

import Link from "next/link";
import { ClipboardList, MessageCircle, Settings } from "@/components/ui/Icon";
import { useAuth } from "@/components/auth/AuthProvider";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="py-6 sm:py-8">
  <div className="mx-auto flex w-full max-w-250 flex-col gap-6 sm:gap-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Signed in as {user?.email}</p>
          <p className="text-sm text-slate-500">
            Welcome back! Here&apos;s a quick snapshot of your account.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-2.5 text-slate-400">
              <ClipboardList className="size-4.5 sm:size-5" />
              <h2 className="text-base font-semibold text-slate-900">My listings</h2>
            </div>
            <p className="mt-3 text-sm text-slate-500">You have no listings yet.</p>
            <Link
              href="/publish"
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Create your first listing
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-2.5 text-slate-400">
              <MessageCircle className="size-4.5 sm:size-5" weight="regular" />
              <h2 className="text-base font-semibold text-slate-900">Messages</h2>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Keep up with buyers and sellers in one place.
            </p>
            <Link
              href="/dashboard/messages"
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View messages
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-2.5 text-slate-400">
              <Settings className="size-4.5 sm:size-5" />
              <h2 className="text-base font-semibold text-slate-900">Account settings</h2>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Update your profile, preferences, and security.
            </p>
            <Link
              href="/dashboard/settings"
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Manage settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
