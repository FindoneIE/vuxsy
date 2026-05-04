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

type ReportReason = {
  value: string;
  description: string;
  requiresDetails?: boolean;
};

const REPORT_REASONS: ReportReason[] = [
  {
    value: "Spam or misleading",
    description: "Fake or incorrect information",
  },
  {
    value: "Scam or fraud",
    description: "Requests for payment outside the platform",
    requiresDetails: true,
  },
  {
    value: "Inappropriate content",
    description: "Violates content guidelines",
  },
  {
    value: "Duplicate listing",
    description: "Same listing posted multiple times",
  },
  {
    value: "Wrong category",
    description: "Incorrect category selected",
  },
  {
    value: "Offensive or abusive",
    description: "Hate, harassment, or abuse",
  },
  {
    value: "Other",
    description: "Something else not listed",
    requiresDetails: true,
  },
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
  trigger: React.ReactNode;
};

export default function ReportListingModal({
  listingId,
  sellerId,
  disabled = false,
  trigger,
}: ReportListingModalProps) {
  const modalContainerClassName =
    "pointer-events-auto z-60 flex w-[calc(100vw-24px)] max-w-140 flex-col rounded-lg border border-[#D8DEE8] bg-white overflow-hidden shadow-[0_18px_48px_rgba(15,23,42,0.18)] ring-0 max-h-[calc(100vh-24px)] sm:w-140 sm:max-w-140 sm:max-h-[calc(100vh-48px)] p-0";
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
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
    setOpen(nextOpen);
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
      setOpen(false);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild disabled={!canReport}>
        {trigger}
      </DialogTrigger>
      <DialogContent
        className={modalContainerClassName}
        overlayClassName="bg-[rgba(15,23,42,0.35)] backdrop-blur-[4px]"
      >
        <DialogHeader className="shrink-0 border-b border-[#E1E6EF] bg-[#F4F6FA] px-6 py-5">
          <DialogTitle className="text-xl font-semibold text-slate-900">
            Report this listing
          </DialogTitle>
          <p className="text-sm text-slate-500">
            Help us keep the marketplace safe and trustworthy.
          </p>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6 pt-5">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-slate-700">
                Reason
              </legend>
              <div className="space-y-3">
                {REPORT_REASONS.map((option) => {
                  const selected = reason === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border px-4 py-4 transition sm:gap-3 sm:px-5 sm:py-4 ${
                        selected
                          ? "border-[#34579B] bg-[#EAF1FB]"
                          : "border-[#D8DEE8] bg-white hover:border-[#34579B] hover:bg-[#F4F6FA]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        className="mt-1 h-5 w-5 text-primary accent-primary focus:ring-primary/40"
                        value={option.value}
                        checked={selected}
                        onChange={(event) => setReason(event.target.value)}
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm font-semibold text-slate-900">
                          {option.value}
                        </div>
                        <div className="text-xs text-slate-500">
                          {option.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {reason &&
            REPORT_REASONS.find((option) => option.value === reason)?.requiresDetails ? (
              <div className="space-y-2">
                <label htmlFor="report-details" className="text-sm font-semibold text-slate-700">
                  Additional details (optional)
                </label>
                <textarea
                  id="report-details"
                  className="min-h-28 w-full rounded-lg border border-[#D8DEE8] bg-white px-4 py-3 text-sm text-slate-900 shadow-none outline-none transition focus:border-[#34579B] focus:ring-2 focus:ring-[#34579B]/15"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Share any extra context that helps us review faster"
                />
              </div>
            ) : null}

            <p className="text-xs text-slate-500">
              Reports are reviewed by our moderation team. False reports may lead to
              account restriction.
            </p>

            {error ? (
              <p className="text-xs text-rose-600" role="status" aria-live="polite">
                {error}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-[#E1E6EF] bg-white px-6 py-4">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary shadow-none transition hover:brightness-95 disabled:bg-[#9AA4B2] disabled:text-white disabled:opacity-70"
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
