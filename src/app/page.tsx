import Link from "next/link";
import HeroSearch from "@/components/hero/HeroSearch";
import ListingsGrid from "@/components/listings/ListingsGrid";
import { getListings } from "@/lib/listings/getListings";
import type { ListingCardItem } from "@/components/listings/ListingCard";
import {
  Wrench,
  Handshake,
  Store,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  Home as HomeIcon,
  ArrowUpRight,
} from "@/components/ui/Icon";

export default async function HomePage() {
  const { items: latestRaw } = await getListings({ pageSize: 8, sort: "newest" }).catch(
    () => ({ items: [], nextCursor: null })
  );
  const latest = latestRaw as unknown as ListingCardItem[];

  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative isolate">
        {/* Decorative background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-[640px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(52,87,155,0.18),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-24 -z-10 h-72 w-72 rounded-full bg-[rgba(52,87,155,0.10)] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-72 -z-10 h-64 w-64 rounded-full bg-[rgba(52,87,155,0.08)] blur-3xl"
        />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 pt-10 pb-12 sm:pt-14 sm:pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-20 lg:pb-24">
          {/* Left: copy */}
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
              <Sparkles weight="regular" className="h-3.5 w-3.5 text-[color:var(--color-primary)]" />
              Ireland's friendly local marketplace
            </span>

            <h1 className="mt-4 text-[34px] leading-[1.05] font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[56px]">
              Find local <span className="text-[color:var(--color-primary)]">services</span>,
              get help, and shop nearby.
            </h1>

            <p className="mt-4 max-w-lg text-base text-slate-600 sm:text-lg">
              Discover trusted professionals, post what you need, or browse marketplace
              listings - all in one calm, easy place built for your community.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/services"
                style={{ color: "#ffffff" }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(52,87,155,0.7)] transition hover:bg-[color:var(--color-primary-hover)] hover:text-white focus:text-white active:text-white [&_*]:text-white"
              >
                <span style={{ color: "#ffffff" }} className="text-white">Browse services</span>
                <ArrowUpRight weight="regular" className="h-4 w-4 text-white" />
              </Link>
              <Link
                href="/publish"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Post a listing
              </Link>
            </div>

            {/* Trust pills */}
            <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-slate-500">
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 weight="regular" className="h-4 w-4 text-emerald-500" />
                Free to post
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 weight="regular" className="h-4 w-4 text-emerald-500" />
                Verified members
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 weight="regular" className="h-4 w-4 text-emerald-500" />
                Ireland-wide
              </li>
            </ul>
          </div>

          {/* Right: floating search card */}
          <div className="relative lg:pl-2">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-slate-200/70 bg-white/60 backdrop-blur">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-y-4 py-6 sm:grid-cols-4 sm:gap-4">
          {[
            { icon: HomeIcon, title: "Ireland-wide", text: "Listings from every county" },
            { icon: CheckCircle2, title: "Verified users", text: "Real people, real profiles" },
            { icon: Wrench, title: "Local services", text: "Trusted pros near you" },
            { icon: MessageCircle, title: "Safe messaging", text: "Chat without sharing numbers" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(52,87,155,0.08)] text-[color:var(--color-primary)]">
                  <Icon weight="regular" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="truncate text-xs text-slate-500">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Explore */}
      <section className="mx-auto w-full max-w-6xl py-12 sm:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Explore the marketplace
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Jump straight to the part of the marketplace you need.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {[
            {
              href: "/services",
              title: "Services",
              text: "Find local professionals and freelancers for any job.",
              icon: Wrench,
              cta: "Browse services",
            },
            {
              href: "/requests",
              title: "Get help",
              text: "Post what you need and get offers from people nearby.",
              icon: Handshake,
              cta: "Post a request",
            },
            {
              href: "/marketplace",
              title: "Marketplace",
              text: "Shop local products and support small businesses.",
              icon: Store,
              cta: "Browse marketplace",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_14px_rgba(31,42,68,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_-20px_rgba(31,42,68,0.25)]"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(52,87,155,0.08)] text-[color:var(--color-primary)] transition group-hover:bg-[rgba(52,87,155,0.14)]">
                    <Icon weight="regular" className="h-5 w-5" />
                  </span>
                  <ArrowUpRight weight="regular" className="h-4 w-4 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{card.text}</p>
                </div>
                <span className="mt-1 text-sm font-semibold text-[color:var(--color-primary)]">
                  {card.cta} &rarr;
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Latest listings */}
      <section className="mx-auto w-full max-w-6xl pb-14 sm:pb-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Latest listings
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Fresh from the community across Ireland.
            </p>
          </div>
          <Link
            href="/services"
            className="hidden text-sm font-semibold text-[color:var(--color-primary)] hover:text-[color:var(--color-primary-hover)] sm:inline-flex sm:items-center sm:gap-1"
          >
            See all <ArrowUpRight weight="regular" className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6">
          {latest && latest.length > 0 ? (
            <ListingsGrid items={latest.slice(0, 8)} wrap={false} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-10 text-center text-sm text-slate-500">
              No listings yet — be the first to post one!
            </div>
          )}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/services"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--color-primary)]"
          >
            See all <ArrowUpRight weight="regular" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto w-full max-w-6xl pb-16 sm:pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-[#1f2a44] px-6 py-10 text-white shadow-[0_30px_80px_-40px_rgba(31,42,68,0.6)] sm:px-10 sm:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[rgba(52,87,155,0.45)] blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[rgba(255,255,255,0.06)] blur-3xl"
          />
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Have something to offer?
              </h3>
              <p className="mt-2 text-sm text-white/70 sm:text-base">
                Post a service, list a product, or share a request. It's free and takes a minute.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/publish"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                Post a listing <ArrowUpRight weight="regular" className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                style={{ color: "#ffffff" }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10 hover:text-white focus:text-white active:text-white [&_*]:text-white"
              >
                <span style={{ color: "#ffffff" }} className="text-white">Create account</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
