"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Heart } from "@/components/ui/Icon";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useSavedListings } from "@/components/listings/SavedListingsProvider";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  initialSaved?: boolean | null;
  className?: string;
  title?: string;
  withBackground?: boolean;
  size?: "sm" | "md";
};

export default function SavedListingButton({
  listingId,
  initialSaved,
  className,
  title = "Save",
  withBackground = true,
  size = "md",
}: Props) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { isSaved, toggleSaved, pendingIds } = useSavedListings();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const saved = isSaved(listingId, initialSaved);
  const isPending = pendingIds.has(listingId);
  const resolvedSize = size === "sm" ? 28 : 32;
  const iconClass = size === "sm" ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0";

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      const query = searchParams?.toString();
      const redirectPath = query ? `${pathname}?${query}` : pathname || "/";
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    const result = await toggleSaved(listingId);

    if (result.error) {
      addToast({
        title: "Something went wrong",
        message: "Please try again",
        type: "error",
      });
      return;
    }

    if (result.saved) {
      addToast({
        title: "Saved",
        message: "Added to your saved listings.",
        type: "success",
      });
    } else {
      addToast({
        title: "Removed from saved",
        message: "Listing removed from your saved list.",
        type: "info",
      });
    }
  };

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from saved" : "Save listing"}
      aria-pressed={saved}
      title={title}
      onClick={handleClick}
      disabled={isPending}
      style={{
        width: resolvedSize,
        height: resolvedSize,
        minWidth: resolvedSize,
        minHeight: resolvedSize,
        maxWidth: resolvedSize,
        maxHeight: resolvedSize,
        aspectRatio: "1 / 1",
        padding: 0,
      }}
      className={cn(
        "inline-flex items-center justify-center transition duration-200 ease-out heart-pop",
        withBackground &&
          "bg-white/90! backdrop-blur-sm border border-[#E1E6EF] shadow-[0_4px_12px_rgba(15,23,42,0.08)]",
        "overflow-hidden leading-none",
        "rounded-[9999px]",
        "hover:scale-105 active:scale-95",
        saved
          ? "text-[#991b1b] hover:text-[#ef4444]"
          : "text-[#6b7280] hover:text-[#ef4444]",
        isPending && "opacity-60",
        className,
        "rounded-[9999px]!"
      )}
    >
      <Heart
        className={cn(iconClass, saved ? "text-[#991b1b]" : "text-current")}
        weight={saved ? "fill" : "regular"}
        aria-hidden
      />
    </button>
  );
}
