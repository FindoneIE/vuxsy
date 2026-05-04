"use client";

import Image from "next/image";
import { User as UserIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type UserAvatarProps = {
  avatarUrl?: string | null;
  googlePhotoUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
  imageClassName?: string;
  showFallbackIcon?: boolean;
};

const getInitials = (displayName?: string | null, email?: string | null) => {
  const name = displayName?.trim();
  if (name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }
  const fallback = email?.trim()?.charAt(0)?.toUpperCase();
  return fallback ?? "";
};

const getResolvedAvatarUrl = (avatarUrl?: string | null, googlePhotoUrl?: string | null) =>
  avatarUrl || googlePhotoUrl || null;

export default function UserAvatar({
  avatarUrl,
  googlePhotoUrl,
  displayName,
  email,
  size = 44,
  className,
  imageClassName,
  showFallbackIcon = true,
}: UserAvatarProps) {
  const resolvedUrl = getResolvedAvatarUrl(avatarUrl, googlePhotoUrl);
  const initials = getInitials(displayName, email);
  const textSizeClass = size >= 44 ? "text-base" : size >= 36 ? "text-sm" : "text-xs";
  const iconSize = size >= 44 ? 18 : size >= 36 ? 16 : 14;

  if (!resolvedUrl && !initials && !showFallbackIcon) {
    return null;
  }

  return (
    <div
      className={cn(
  "flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700 overflow-hidden aspect-square shrink-0",
        textSizeClass,
        "font-medium",
        className
      )}
      style={{ width: size, height: size }}
    >
      {resolvedUrl ? (
        <Image
          src={resolvedUrl}
          alt={displayName ?? "Profile"}
          width={size}
          height={size}
          className={cn("h-full w-full rounded-full object-cover", imageClassName)}
        />
      ) : initials ? (
        <span className="flex h-full w-full items-center justify-center rounded-full">
          {initials}
        </span>
      ) : showFallbackIcon ? (
        <span className="flex h-full w-full items-center justify-center rounded-full text-slate-600">
          <UserIcon size={iconSize} />
        </span>
      ) : null}
    </div>
  );
}
