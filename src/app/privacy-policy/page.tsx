import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Vuxsy",
  description:
    "Read how Vuxsy collects, uses, and protects your personal data across our marketplace platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updatedAt="May 13, 2026"
  intro="Vuxsy respects your privacy and is committed to protecting your personal data."
    >
      <LegalSection title="Information We Collect">
        <p>We may collect:</p>
        <LegalList
          items={[
            "Name",
            "Email address",
            "Phone number",
            "Listing information",
            "Messages sent through the platform",
            "IP address and browser information",
            "Cookies and analytics data",
          ]}
        />
      </LegalSection>

      <LegalSection title="How We Use Your Information">
        <p>We use your information to:</p>
        <LegalList
          items={[
            "operate the marketplace",
            "manage user accounts",
            "improve platform security",
            "prevent fraud and spam",
            "respond to support requests",
            "improve platform functionality",
          ]}
        />
      </LegalSection>

      <LegalSection title="User Content">
        <p>Users are responsible for the content they publish on Vuxsy.</p>
        <p>
          We may remove listings, messages, accounts, or content that violate our Terms or appear
          fraudulent, misleading, illegal, abusive, or harmful.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Vuxsy uses cookies and similar technologies to improve user experience, analytics,
          security, and functionality.
        </p>
        <p>
          Read our full <Link className="underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:hover:text-slate-100" href="/cookie-policy">Cookie Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Third-Party Services">
        <p>We may use third-party services such as:</p>
        <LegalList
          items={[
            "hosting providers",
            "analytics tools",
            "email providers",
            "payment providers",
          ]}
        />
        <p>These services may process data according to their own privacy policies.</p>
      </LegalSection>

      <LegalSection title="Data Security">
        <p>
          We take reasonable steps to protect user data, but no online platform can guarantee
          complete security.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Vuxsy</p>
        <p>Dundalk, Co Louth, Ireland</p>
        <p>
          <a
            className="break-all underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:hover:text-slate-100"
            href="mailto:support@vuxsy.com"
          >
            support@vuxsy.com
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
