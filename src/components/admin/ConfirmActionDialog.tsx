"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmActionDialogProps = {
  title: string;
  description?: string;
  confirmLabel?: string;
  trigger: React.ReactNode;
  onConfirm: () => Promise<void>;
  confirmTone?: "default" | "danger";
  disabled?: boolean;
};

export default function ConfirmActionDialog({
  title,
  description,
  confirmLabel = "Confirm",
  trigger,
  onConfirm,
  confirmTone = "default",
  disabled = false,
}: ConfirmActionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await onConfirm();
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={confirmTone === "danger" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
