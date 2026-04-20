"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  UserRound,
} from "@/components/ui/Icon";
import UserAvatar from "@/components/ui/UserAvatar";
import type { AvatarData } from "@/types/user";

type AvatarDropdownProps = {
  avatarData: AvatarData | null;
  onLogout: () => Promise<void> | void;
};

export default function AvatarDropdown({ avatarData, onLogout }: AvatarDropdownProps) {
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-0 border-0 bg-transparent appearance-none"
      >
        <UserAvatar
          avatarUrl={avatarUrl}
          googlePhotoUrl={googlePhotoUrl}
          displayName={displayName}
          email={email}
          size={44}
          className="translate-y-0.5"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-3 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
        >
          <div className="absolute -top-2 right-3.5 h-4 w-4 rotate-45 bg-white border-l border-t border-slate-200" />
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
          >
            <LayoutDashboard
              className="h-4.5 w-4.5 text-gray-700"
              weight="regular"
              aria-hidden
            />
            Dashboard
          </Link>
          <Link
            href="/dashboard/business-profile"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
          >
            <UserRound
              className="h-4.5 w-4.5 text-gray-700"
              weight="regular"
              aria-hidden
            />
            Profile
          </Link>
          <Link
            href="/dashboard/messages"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
          >
            <MessageSquare
              className="h-4.5 w-4.5 text-gray-700"
              weight="regular"
              aria-hidden
            />
            Messages
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
          >
            <Settings
              className="h-4.5 w-4.5 text-gray-700"
              weight="regular"
              aria-hidden
            />
            Settings
          </Link>
          <div className="my-1 border-t border-slate-200" />
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            onClick={onLogout}
          >
            <LogOut
              className="h-4.5 w-4.5 text-gray-700"
              weight="regular"
              aria-hidden
            />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
