"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  Heart,
  LogOut,
  MessageCircle,
  User,
} from "@/components/ui/Icon";
import UserAvatar from "@/components/ui/UserAvatar";
import type { AvatarData } from "@/types/user";

type AvatarDropdownProps = {
  avatarData: AvatarData | null;
  onLogout: () => Promise<void> | void;
  "data-ls"?: string;
  className?: string;
};

export default function AvatarDropdown({
  avatarData,
  onLogout,
  "data-ls": dataLs,
  className,
}: AvatarDropdownProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const displayName = avatarData?.displayName ?? null;
  const email = avatarData?.email ?? null;
  const avatarUrl = avatarData?.avatarUrl ?? null;
  const googlePhotoUrl = avatarData?.googlePhotoUrl ?? null;
  const isListingsActive = pathname === "/dashboard/listings";
  const isMessagesActive = pathname === "/dashboard/messages";
  const isSavedActive = pathname === "/dashboard/saved";
  const isProfileActive = pathname === "/dashboard/settings";
  const inactiveIconColor = "#6b7280";
  const activeIconColor = "var(--color-primary)";
  const menuItemBaseClass =
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ease-in-out hover:bg-[rgba(0,102,255,0.06)] active:bg-[rgba(0,102,255,0.1)]";

  return (
  <div className="avatar-dropdown" ref={containerRef} data-ls={dataLs}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={className ? `avatar-dropdown__trigger ${className}` : "avatar-dropdown__trigger"}
      >
        <UserAvatar
          avatarUrl={avatarUrl}
          googlePhotoUrl={googlePhotoUrl}
          displayName={displayName}
          email={email}
          size={40}
          showFallbackIcon={false}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="avatar-dropdown__menu right-0 mt-3 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
        >
          <div className="absolute -top-2 right-3.5 h-4 w-4 rotate-45 bg-white border-l border-t border-slate-200" />
          {(displayName || email) && (
            <div className="px-3 py-2">
              {displayName ? (
                <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
              ) : null}
              {email ? (
                <p className="text-xs text-slate-500 truncate">{email}</p>
              ) : null}
            </div>
          )}
          {(displayName || email) && <div className="my-1 border-t border-slate-200" />}
          <Link
            href="/dashboard/listings"
            className={`${menuItemBaseClass} ${
              isListingsActive ? "bg-blue-50 text-blue-600" : "text-gray-700"
            }`}
          >
            <ClipboardList
              className="h-4.5 w-4.5"
              weight={isListingsActive ? "fill" : "regular"}
              color={isListingsActive ? activeIconColor : inactiveIconColor}
              aria-hidden
            />
            My listings
          </Link>
          <Link
            href="/dashboard/messages"
            className={`${menuItemBaseClass} ${
              isMessagesActive ? "bg-blue-50 text-blue-600" : "text-gray-700"
            }`}
          >
            <MessageCircle
              className="h-4.5 w-4.5"
              weight={isMessagesActive ? "fill" : "regular"}
              color={isMessagesActive ? activeIconColor : inactiveIconColor}
              aria-hidden
            />
            Messages
          </Link>
          <Link
            href="/dashboard/saved"
            className={`${menuItemBaseClass} ${
              isSavedActive ? "bg-blue-50 text-blue-600" : "text-gray-700"
            }`}
          >
            <Heart
              className="h-4.5 w-4.5"
              weight={isSavedActive ? "fill" : "regular"}
              color={isSavedActive ? activeIconColor : inactiveIconColor}
              aria-hidden
            />
            Saved listings
          </Link>
          <Link
            href="/dashboard/settings"
            className={`${menuItemBaseClass} ${
              isProfileActive ? "bg-blue-50 text-blue-600" : "text-gray-700"
            }`}
          >
            <User
              className="h-4.5 w-4.5"
              weight={isProfileActive ? "fill" : "regular"}
              color={isProfileActive ? activeIconColor : inactiveIconColor}
              aria-hidden
            />
            Profile
          </Link>
          <div className="my-1 border-t border-slate-200" />
          <button
            type="button"
            className={`${menuItemBaseClass} avatar-dropdown__logout w-full text-left`}
            onClick={onLogout}
          >
            <LogOut className="h-4.5 w-4.5" weight="regular" aria-hidden />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
