"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Flag } from "@/components/ui/Icon";
import ReportListingModal from "@/components/listings/ReportListingModal";

type ReportListingButtonProps = {
  listingId: string;
  sellerId?: string | null;
  className?: string;
};

export default function ReportListingButton({
  listingId,
  sellerId,
  className,
}: ReportListingButtonProps) {
  const { user } = useAuth();
  const isOwner = Boolean(user?.id && sellerId && user.id === sellerId);

  return (
    <ReportListingModal
      listingId={listingId}
      sellerId={sellerId}
      disabled={isOwner}
      trigger={
        <button
          type="button"
          className={className}
          aria-label="Report listing"
          disabled={isOwner}
          title={isOwner ? "You cannot report your own listing" : "Report listing"}
        >
          <Flag className="h-5 w-5" weight="regular" />
        </button>
      }
    />
  );
}
