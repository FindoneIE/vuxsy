import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Cookie Policy | Vuxsy",
  description:
    "Learn how Vuxsy uses cookies to improve platform experience, analytics, and security.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updatedAt="May 13, 2026"
      intro="We use cookies to improve your experience, analyze traffic, and help keep Vuxsy secure."
    >
      <LegalSection title="How We Use Cookies">
        <p>
          By continuing to use Vuxsy, you agree to our use of cookies for platform functionality,
          security, and analytics.
        </p>
      </LegalSection>

      <LegalSection title="Your Choices">
        <p>You can choose your cookie preference from the cookie banner:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Accept</li>
          <li>Decline</li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
