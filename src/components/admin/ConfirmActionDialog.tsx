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
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <AdminModalHeader>
          <DialogTitle>{title}</DialogTitle>
        </AdminModalHeader>
        <AdminModalBody>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </AdminModalBody>
        <AdminModalFooter>
          <SecondaryButton onClick={() => setDialogOpen(false)}>Cancel</SecondaryButton>
          <Button
            type="button"
            variant={confirmTone === "danger" ? "destructive" : "default"}
            size="sm"
            className="rounded-md px-3 py-1.5 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98]"
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
