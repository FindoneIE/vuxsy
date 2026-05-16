"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { dialogPadding, modalFooterGlassClass } from "@/lib/layout/constants";

const REPORT_REASONS = [
  "Spam or misleading",
  "Scam or fraud",
  "Inappropriate content",
  "Duplicate listing",
  "Wrong category",
  "Offensive or abusive",
  "Other",
] as const;

const RATE_LIMIT_MINUTES = 5;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const formatSupabaseError = (error: {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
} | null) => {
  if (!error) return "Unable to submit report.";
  const parts = [error.message, error.details, error.hint, error.code]
    .filter(Boolean)
    .join(" • ");
  return parts || "Unable to submit report.";
};

type ReportListingModalProps = {
  listingId: string;
  sellerId?: string | null;
  disabled?: boolean;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function ReportListingModal({
  listingId,
  sellerId,
  disabled = false,
  trigger,
  open,
  onOpenChange,
}: ReportListingModalProps) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = typeof open === "boolean";
  const resolvedOpen = isControlled ? open : internalOpen;

  const setResolvedOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  const [reason, setReason] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { addToast } = useToast();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const debugLogs =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEBUG_LOGS === "true";

  const isOwner = Boolean(user?.id && sellerId && user.id === sellerId);
  const canReport = !disabled && !isOwner;

  const resetState = () => {
    setReason("");
    setDetails("");
    setSubmitting(false);
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setResolvedOpen(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setError("Please sign in to report this listing.");
      return;
    }
    if (!canReport) {
      setError("You cannot report your own listing.");
      return;
    }
    if (!UUID_REGEX.test(listingId)) {
      setError("This listing cannot be reported right now.");
      return;
    }
    if (!reason) {
      setError("Please select a reason.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setError("Please sign in to report this listing.");
        setSubmitting(false);
        return;
      }
      const userId = authData.user.id;

      const { data: existingReports, error: existingError } = await supabase
        .from("reports")
        .select("id")
        .eq("listing_id", listingId)
        .eq("user_id", userId)
        .limit(1);

      if (existingError) {
        setError(formatSupabaseError(existingError));
        setSubmitting(false);
        return;
      }

      if (existingReports && existingReports.length > 0) {
        setError("You’ve already reported this listing.");
        setSubmitting(false);
        return;
      }

      const rateLimitThreshold = new Date(
        Date.now() - RATE_LIMIT_MINUTES * 60 * 1000
      ).toISOString();
      const { data: recentReports, error: recentError } = await supabase
        .from("reports")
        .select("id, created_at")
        .eq("user_id", userId)
        .gte("created_at", rateLimitThreshold)
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentError) {
        setError(formatSupabaseError(recentError));
        setSubmitting(false);
        return;
      }

      if (recentReports && recentReports.length > 0) {
        setError("Please wait a few minutes before submitting another report.");
        setSubmitting(false);
        return;
      }

      if (debugLogs) {
        console.log("REPORT SUBMIT PAYLOAD", {
          listingId,
          reason,
          details: details.trim() ? details.trim() : null,
        });
      }

      const { error: insertError } = await supabase.from("reports").insert({
        listing_id: listingId,
        user_id: userId,
        reason,
        details: details.trim() ? details.trim() : null,
      });

      if (insertError) {
        setError(formatSupabaseError(insertError));
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setResolvedOpen(false);
      addToast({
        title: "Report submitted",
        message: "Report submitted",
        type: "success",
      });
    } catch (err) {
      setError(
        formatSupabaseError(
          err && typeof err === "object" && "message" in err
            ? (err as { message?: string; details?: string; hint?: string; code?: string })
            : null
        )
      );
      setSubmitting(false);
      addToast({
        title: "Report failed",
        message: "Please try again",
        type: "error",
      });
    }
  };

  return (
    <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild disabled={!canReport}>
          {trigger}
        </DialogTrigger>
      ) : null}
      <DialogContent
        className="max-h-[calc(100vh-16px)] max-w-115 overflow-hidden"
        overlayClassName="bg-white/40 backdrop-blur-sm"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="pr-8 text-lg font-semibold text-slate-900">
            Report this listing
          </DialogTitle>
          <p className="pr-8 text-sm text-slate-500">
            Help us keep the marketplace safe.
          </p>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className={cn("min-h-0 flex-1 space-y-4 overflow-y-auto bg-white", dialogPadding)}>
            <div className="space-y-2">
              <label htmlFor="report-reason" className="text-sm font-medium text-gray-900">
                Reason
              </label>
              <select
                id="report-reason"
                className={`h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-none outline-none transition focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary)/20 ${
                  reason ? "text-gray-900" : "text-gray-500"
                }`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              >
                <option value="" disabled>
                  Select a reason
                </option>
                {REPORT_REASONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="report-details" className="text-sm font-medium text-gray-900">
                Details
              </label>
              <textarea
                id="report-details"
                className="min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 shadow-none outline-none transition focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary)/20"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Add more information if needed"
              />
              <p className="text-xs text-gray-500">
                Reports are reviewed by our moderation team.
              </p>
            </div>

            {error ? (
              <p className="text-xs text-rose-600" role="status" aria-live="polite">
                {error}
              </p>
            ) : null}
          </div>

          <div className={cn("shrink-0", modalFooterGlassClass, dialogPadding)}>
            <div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-2 sm:gap-3">
              <button
                type="button"
                className="btn btn-outline h-9 w-full border border-transparent bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setResolvedOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary h-9 w-full shadow-none transition hover:brightness-95 disabled:bg-gray-300 disabled:text-gray-500 disabled:opacity-100"
                disabled={!reason || submitting}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border border-white/60 border-t-white" />
                    Submitting…
                  </span>
                ) : (
                  "Submit report"
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
