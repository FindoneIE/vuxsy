"use client";

import * as React from "react";
import { useToast } from "@/components/ui/ToastProvider";

type AdminReportActionFormProps = {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  className?: string;
  confirmMessage?: string;
  successToast?: {
    title: string;
    message: string;
  };
  errorToast?: {
    title?: string;
    message?: string;
  };
};

export default function AdminReportActionForm({
  action,
  children,
  className,
  confirmMessage,
  successToast,
  errorToast,
}: AdminReportActionFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const { addToast } = useToast();

  return (
    <form
      className={className}
      action={(formData) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          return;
        }
        startTransition(async () => {
          try {
            await action(formData);
            window.dispatchEvent(new CustomEvent("admin-reports-updated"));
            if (successToast) {
              addToast({
                title: successToast.title,
                message: successToast.message,
                type: "success",
              });
            }
          } catch (error) {
            addToast({
              title: errorToast?.title ?? "Action failed",
              message: errorToast?.message ?? "Action failed",
              type: "error",
            });
            console.error("ADMIN ACTION ERROR", error);
          }
        });
      }}
    >
      <fieldset disabled={isPending} className="contents">
        {children}
      </fieldset>
      {isPending ? null : null}
    </form>
  );
}
