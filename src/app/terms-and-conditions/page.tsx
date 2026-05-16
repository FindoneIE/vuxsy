import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms & Conditions | Vuxsy",
  description:
    "Read Vuxsy marketplace platform terms governing user listings, communications, and responsibilities.",
};

export default function TermsAndConditionsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updatedAt="May 13, 2026"
      intro="By using Vuxsy, you agree to these Terms."
    >
      <LegalSection title="Marketplace Platform">
        <p>
          Vuxsy is an online marketplace platform that allows users to post listings, offer
          services, and communicate with other users.
        </p>
        <p>Vuxsy is not a party to transactions between users.</p>
      </LegalSection>

      <LegalSection title="User Responsibility">
        <p>Users are fully responsible for:</p>
        <LegalList
          items={[
            "listings they publish",
            "descriptions and photos",
            "communication with buyers or sellers",
            "legality of items or services",
            "transaction arrangements",
          ]}
        />
      </LegalSection>

      <LegalSection title="Prohibited Content">
        <p>The following is prohibited:</p>
        <LegalList
          items={[
            "fake or misleading listings",
            "scams or fraud",
            "illegal products or services",
            "stolen goods",
            "abusive or hateful content",
            "spam",
            "impersonation",
            "copyrighted material without permission",
          ]}
        />
      </LegalSection>

      <LegalSection title="Content Removal">
        <p>
          Vuxsy reserves the right to remove any listing, account, message, or content at any time
          without notice if it violates these Terms or may harm the platform or users.
        </p>
      </LegalSection>

      <LegalSection title="No Guarantees">
        <p>Vuxsy does not guarantee:</p>
        <LegalList
          items={[
            "successful transactions",
            "quality of products or services",
            "identity of users",
            "accuracy of listings",
          ]}
        />
        <p>Users use the platform at their own risk.</p>
      </LegalSection>

      <LegalSection title="Limitation of Liability">
        <p>Vuxsy shall not be liable for:</p>
        <LegalList
          items={[
            "user disputes",
            "losses or damages",
            "scams or fraudulent activity",
            "third-party actions",
          ]}
        />
      </LegalSection>

      <LegalSection title="Account Suspension">
        <p>We may suspend or permanently remove accounts that violate platform rules.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>We may update these Terms at any time.</p>
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
