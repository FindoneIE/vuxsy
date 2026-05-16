import { redirect } from "next/navigation";

// Server-side redirect. Previously this was a client component that called
// router.replace() inside useEffect, which forced a blank first paint and
// a footer jump on the way through. Performing the redirect server-side
// means the browser never renders this route at all.
export const dynamic = "force-dynamic";

const allowedTypes = new Set(["service", "request", "marketplace"]);

type PublishTypePageProps = {
  params: Promise<{ type?: string }>;
};

export default async function PublishTypePage({ params }: PublishTypePageProps) {
  const { type } = await params;
  if (type && allowedTypes.has(type)) {
    redirect(`/publish?type=${type}`);
  }
  redirect("/publish");
}
