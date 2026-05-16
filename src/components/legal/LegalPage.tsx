import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  updatedAt?: string;
  intro?: string;
  children: ReactNode;
};

type LegalSectionProps = {
  title: string;
  children: ReactNode;
};

export function LegalPage({ title, updatedAt, intro, children }: LegalPageProps) {
  return (
  <article className="mx-auto w-full max-w-4xl">
  <header className="min-w-0 wrap-break-word rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:px-7 sm:py-8">
  <h1 className="w-full wrap-anywhere text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          {title}
        </h1>
        {updatedAt ? (
          <p className="mt-1.5 w-full wrap-anywhere text-xs text-slate-500 dark:text-slate-400 sm:mt-2 sm:text-sm">Last updated: {updatedAt}</p>
        ) : null}
        {intro ? (
          <p className="mt-3 w-full max-w-full wrap-anywhere text-sm leading-6 text-slate-600 dark:text-slate-300 sm:mt-4 sm:max-w-2xl sm:text-base sm:leading-6">
            {intro}
          </p>
        ) : null}
      </header>

      <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">{children}</div>
    </article>
  );
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="min-w-0 wrap-break-word rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:px-7 sm:py-6">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">{title}</h2>
  <div className="mt-2.5 min-w-0 wrap-break-word space-y-2.5 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:mt-3 sm:space-y-3 sm:text-base sm:leading-6">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
  <ul className="list-disc space-y-1.5 wrap-break-word pl-4 sm:pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
