import type { Metadata } from "next";
import ReportListingForm from "@/components/report/ReportListingForm";

export const metadata: Metadata = {
  title: "Report Listing | Vuxsy",
  description:
    "Report suspicious or policy-violating listings on Vuxsy so our moderation team can review them.",
};

export default function ReportListingPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
  <div className="min-w-0 wrap-break-word rounded-lg border border-slate-200 bg-white px-4 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:px-7 sm:py-8">
    <h1 className="wrap-break-word text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Report Listing
        </h1>
        <p className="mt-3 wrap-break-word text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
          If a listing appears fraudulent, misleading, abusive, or illegal, report it here.
        </p>
      </div>

      <ReportListingForm />
    </section>
  );
}
