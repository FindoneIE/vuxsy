import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safety Tips | Vuxsy",
  description:
    "Learn practical marketplace safety tips for buying, selling, and messaging on Vuxsy.",
};

const safetyTips = [
  "Meet in a public, well-lit place whenever possible.",
  "Verify listing details and ask clarifying questions before agreeing to a transaction.",
  "Avoid sharing sensitive personal or financial details in messages.",
  "Use secure payment methods and be cautious of requests for unusual payment options.",
  "Report suspicious listings or messages immediately.",
];

export default function SafetyPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
  <div className="min-w-0 wrap-break-word rounded-lg border border-slate-200 bg-white px-4 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:px-7 sm:py-8">
    <h1 className="wrap-break-word text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Safety Tips
        </h1>
  <p className="mt-3 wrap-break-word text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
          Vuxsy is committed to helping users stay safe while using the marketplace.
        </p>
      </div>

  <section className="mt-4 min-w-0 wrap-break-word rounded-lg border border-slate-200 bg-white px-4 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:px-7 sm:py-6">
    <ul className="list-disc space-y-2 wrap-break-word pl-5 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
          {safetyTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
  <p className="mt-4 wrap-break-word text-sm text-slate-600 dark:text-slate-300">
          If something seems suspicious, stop the interaction and email us at{" "}
          <a
            href="mailto:support@vuxsy.com"
            className="break-all underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:hover:text-slate-100"
          >
            support@vuxsy.com
          </a>
          .
        </p>
      </section>
    </section>
  );
}
