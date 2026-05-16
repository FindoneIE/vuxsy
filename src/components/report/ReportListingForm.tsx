"use client";

import { FormEvent, useState } from "react";

export default function ReportListingForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <form
      onSubmit={handleSubmit}
  className="mt-4 min-w-0 wrap-break-word rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="listing-url">
            Listing URL
          </label>
          <input
            id="listing-url"
            name="listingUrl"
            type="url"
            required
            placeholder="https://vuxsy.com/marketplace/..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/40"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="reason">
            Reason
          </label>
          <select
            id="reason"
            name="reason"
            required
            defaultValue=""
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/40"
          >
            <option value="" disabled>
              Select a reason
            </option>
            <option value="fraud">Fraud or scam</option>
            <option value="misleading">Misleading information</option>
            <option value="illegal">Illegal product or service</option>
            <option value="abusive">Abusive or harmful content</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="details">
            Additional details
          </label>
          <textarea
            id="details"
            name="details"
            rows={5}
            placeholder="Share useful context for our moderation team."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/40"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300/60 sm:w-auto dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          Submit report
        </button>
      </div>

      {submitted ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm wrap-break-word text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
          Thanks. Your report has been noted. For urgent issues, email support@vuxsy.com.
        </p>
      ) : null}
    </form>
  );
}
