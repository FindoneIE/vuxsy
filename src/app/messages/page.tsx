"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <div className="py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
        <p className="mt-2 text-sm text-slate-500">Your conversations will appear here.</p>
      </div>
    </ProtectedRoute>
  );
}
