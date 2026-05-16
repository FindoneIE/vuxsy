"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "vuxsy-cookie-consent";

type ConsentValue = "accepted" | "declined";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentValue | null;
        if (!saved) {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const handleChoice = (value: ConsentValue) => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
    } catch {
      // no-op
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-live="polite"
      aria-label="Cookie consent banner"
      className="fixed inset-x-0 bottom-0 z-1200 px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/95 sm:p-5">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          We use cookies to improve your experience, analyze traffic, and help keep Vuxsy secure.
          By continuing to use Vuxsy, you agree to our use of cookies. Read our{" "}
          <Link
            href="/cookie-policy"
            className="font-medium text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:text-slate-100 dark:hover:text-white"
          >
            Cookie Policy
          </Link>
          .
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => handleChoice("declined")}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => handleChoice("accepted")}
            className="inline-flex items-center justify-center rounded-xl border border-slate-900 bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Accept
          </button>
        </div>
      </div>
    </aside>
  );
}
