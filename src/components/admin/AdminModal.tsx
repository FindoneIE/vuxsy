"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { DialogContent } from "@/components/ui/dialog";
import { dialogPadding, mobileDialogWidth } from "@/lib/layout/constants";

const adminModalBaseClassName =
  "w-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden p-0 gap-0 ring-0";

type AdminModalProps = {
  children: React.ReactNode;
  className?: string;
  maxWidthClassName?: string;
  showCloseButton?: boolean;
  onOpenAutoFocus?: React.ComponentProps<typeof DialogContent>["onOpenAutoFocus"];
};

export function AdminModal({
  children,
  className,
  maxWidthClassName = "sm:max-w-sm",
  showCloseButton = true,
  onOpenAutoFocus,
}: AdminModalProps) {
  return (
    <DialogContent
      showCloseButton={showCloseButton}
      className={cn(adminModalBaseClassName, mobileDialogWidth, maxWidthClassName, className)}
      onOpenAutoFocus={onOpenAutoFocus}
    >
      {children}
    </DialogContent>
  );
}

type AdminModalSectionProps = React.ComponentProps<"div">;

export function AdminModalHeader({ className, ...props }: AdminModalSectionProps) {
  return (
    <div
      className={cn("border-b border-slate-200", dialogPadding, className)}
      {...props}
    />
  );
}

export function AdminModalBody({ className, ...props }: AdminModalSectionProps) {
  return <div className={cn(dialogPadding, className)} {...props} />;
}

export function AdminModalFooter({ className, ...props }: AdminModalSectionProps) {
  return (
    <div
      className={cn(
        "border-t border-slate-200 bg-white flex justify-end gap-3",
        dialogPadding,
        className
      )}
      {...props}
    />
  );
}
