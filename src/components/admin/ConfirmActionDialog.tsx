"use client";

import * as React from "react";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AdminModal,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
} from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/button";
import SecondaryButton from "@/components/ui/SecondaryButton";
import { modalFooterGlassClass } from "@/lib/layout/constants";

type ConfirmActionDialogProps = {
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmLoadingLabel?: string;
  trigger?: React.ReactNode;
  onConfirm: () => Promise<void>;
  confirmTone?: "default" | "danger";
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function ConfirmActionDialog({
  title,
  description,
  confirmLabel = "Confirm",
  confirmLoadingLabel,
  trigger,
  onConfirm,
  confirmTone = "default",
  disabled = false,
  open,
  onOpenChange,
}: ConfirmActionDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;
  const isDangerTone = confirmTone === "danger";

  const confirmButtonClassName = isDangerTone
    ? "h-9 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-rose-700 shadow-sm transition-colors hover:bg-rose-100 hover:text-rose-800 focus-visible:outline-none focus-visible:border-rose-300 focus-visible:ring-4 focus-visible:ring-rose-200/70 focus-visible:ring-offset-0 active:scale-[0.99]"
    : "h-9 rounded-lg px-3.5 py-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#34579B]/20 focus-visible:ring-offset-0 active:scale-[0.99]";

  const handleConfirm = () => {
    startTransition(async () => {
      await onConfirm();
      setDialogOpen(false);
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? (
        <DialogTrigger asChild disabled={disabled}>
          {trigger}
        </DialogTrigger>
      ) : null}
      <AdminModal
        maxWidthClassName="sm:max-w-sm"
        className="rounded-2xl border border-slate-200/90 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.26)]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <AdminModalHeader className="border-b border-slate-200 bg-slate-50/90 p-4 sm:p-5">
          <DialogTitle className="text-[15px] font-semibold leading-6 text-slate-900">
            {title}
          </DialogTitle>
        </AdminModalHeader>
        <AdminModalBody className="space-y-2 p-4 sm:p-5">
          {description ? (
            <DialogDescription className="text-sm leading-6 text-slate-600">
              {description}
            </DialogDescription>
          ) : null}
        </AdminModalBody>
        <AdminModalFooter
          className={`box-border grid w-full grid-cols-1 gap-2 p-4 sm:grid-cols-2 sm:gap-3 sm:p-5 ${modalFooterGlassClass}`}
        >
          <SecondaryButton
            className="box-border h-9 w-full rounded-lg border border-transparent bg-transparent px-3.5 py-2 text-slate-700 shadow-none hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:border-[#34579B]/35 focus-visible:ring-4 focus-visible:ring-[#34579B]/15"
            onClick={() => setDialogOpen(false)}
          >
            Cancel
          </SecondaryButton>
          <Button
            type="button"
            variant={confirmTone === "danger" ? "destructive" : "default"}
            size="sm"
            className={`box-border w-full ${confirmButtonClassName}`}
            onClick={handleConfirm}
            disabled={isPending}
            autoFocus={false}
          >
            {isPending ? confirmLoadingLabel ?? confirmLabel : confirmLabel}
          </Button>
        </AdminModalFooter>
      </AdminModal>
    </Dialog>
  );
}
