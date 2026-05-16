import SignupForm from "@/components/auth/SignupForm";

// Server component. Reads `redirect` from searchParams on the server so the
// form renders fully on first paint with no useSearchParams() call and
// therefore no <Suspense fallback={null}> wrapper. Removes the previous
// white-flash / footer jump on the /signup route.
export const dynamic = "force-dynamic";

type SignupPageProps = {
  searchParams?: Promise<{ redirect?: string | string[] }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const sp = (await searchParams) ?? {};
  const raw = Array.isArray(sp.redirect) ? sp.redirect[0] : sp.redirect;
  const redirect = typeof raw === "string" && raw.startsWith("/") ? raw : "/dashboard/listings";

  return <SignupForm redirect={redirect} />;
}
