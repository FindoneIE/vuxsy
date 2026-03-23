"use client";

import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

const allowedTypes = new Set(["service", "request", "marketplace"]);

export default function PublishTypePage() {
  const params = useParams<{ type?: string }>();
  const router = useRouter();

  React.useEffect(() => {
    const type = params?.type;
    if (!type || !allowedTypes.has(type)) {
      router.replace("/publish");
      return;
    }
    router.replace(`/publish?type=${type}`);
  }, [params, router]);

  return (
    <ProtectedRoute>
      <div className="py-10 text-center text-sm text-slate-500">Loading...</div>
    </ProtectedRoute>
  );
}
