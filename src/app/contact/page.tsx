import type { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact | Vuxsy",
  description:
    "Contact Vuxsy marketplace support for account, listing, and platform questions.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
  <div className="min-w-0 wrap-break-word rounded-lg border border-slate-200 bg-white px-4 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:px-7 sm:py-8">
    <h1 className="wrap-break-word text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Contact Vuxsy
        </h1>
  <p className="mt-3 max-w-2xl wrap-break-word text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
          We’re here to help with listings, account issues, and marketplace safety questions.
        </p>
      </div>

  <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[1.4fr,1fr]">
        <ContactForm />

  <aside className="min-w-0 wrap-break-word rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Support details</h2>
          <dl className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <dt className="font-medium text-slate-800 dark:text-slate-200">Email</dt>
              <dd className="mt-1">
                <a
                  href="mailto:support@vuxsy.com"
                  className="break-all underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  support@vuxsy.com
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-800 dark:text-slate-200">Location</dt>
              <dd className="mt-1">Dundalk, Co Louth, Ireland</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
