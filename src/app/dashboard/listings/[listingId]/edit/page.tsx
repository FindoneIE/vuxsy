"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function ListingEditPage() {
  return (
    <ProtectedRoute>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Edit listing</h1>
        <p className="text-sm text-slate-500">Editing coming soon.</p>
      </div>
    </ProtectedRoute>
  );
}
