"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { DialogContent } from "@/components/ui/dialog";

const adminModalBaseClassName =
  "w-full max-w-[calc(100%-2rem)] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden p-0 gap-0 ring-0";

const adminModalOverlayClassName =
  "fixed inset-0 bg-slate-900/20 backdrop-blur-sm supports-backdrop-filter:backdrop-blur-sm";

type AdminModalProps = {
  children: React.ReactNode;
  className?: string;
  maxWidthClassName?: string;
  showCloseButton?: boolean;
};

export function AdminModal({
  children,
  className,
  maxWidthClassName = "sm:max-w-sm",
  showCloseButton = true,
}: AdminModalProps) {
  return (
    <DialogContent
      showCloseButton={showCloseButton}
      overlayClassName={adminModalOverlayClassName}
      className={cn(adminModalBaseClassName, maxWidthClassName, className)}
    >
      {children}
    </DialogContent>
  );
}

type AdminModalSectionProps = React.ComponentProps<"div">;

export function AdminModalHeader({ className, ...props }: AdminModalSectionProps) {
  return (
    <div
      className={cn("px-6 py-5 border-b border-slate-200", className)}
      {...props}
    />
  );
}

export function AdminModalBody({ className, ...props }: AdminModalSectionProps) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}

export function AdminModalFooter({ className, ...props }: AdminModalSectionProps) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3",
        className
      )}
      {...props}
    />
  );
}
