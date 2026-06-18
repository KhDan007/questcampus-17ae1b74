import { createFileRoute, Link } from "@tanstack/react-router";
import { FooterV2 } from "@/components/landing2/FooterV2";
import { LivingBackground } from "@/components/landing2/LivingBackground";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/tos")({
  head: () => ({
    meta: [
      { title: "Terms of Service — QuestCampus" },
      {
        name: "description",
        content:
          "Read the Terms of Service for QuestCampus. Understand your rights and obligations when using our admissions platform.",
      },
      {
        property: "og:title",
        content: "Terms of Service — QuestCampus",
      },
      {
        property: "og:description",
        content:
          "Read the Terms of Service for QuestCampus. Understand your rights and obligations when using our admissions platform.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  return (
    <>
      <LivingBackground />
      <main
        id="main-content"
        className="relative mx-auto min-h-screen w-full max-w-(--container-content) px-5 pb-24 pt-28 sm:px-8 lg:px-12"
      >
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 font-[var(--font-label)] text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <article className="mx-auto max-w-3xl">
          <h1 className="font-display text-display-lg-mobile text-on-surface sm:text-display-lg">
            Terms of Service
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Last updated: June 18, 2026
          </p>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              1. Agreement to Terms
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              By accessing or using QuestCampus ("we," "our," or "us"), you agree to be bound by
              these Terms of Service. If you do not agree, you may not use our platform. These
              terms apply to all visitors, users, and others who access or use QuestCampus.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              2. Description of Service
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              QuestCampus is an online platform designed to help students research, shortlist, and
              apply to universities worldwide. Our services include:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-body-md text-on-surface-variant">
              <li>University search and discovery across 11,000+ institutions</li>
              <li>AI-powered university matching based on academic profile and preferences</li>
              <li>Essay writing assistance and editing tools</li>
              <li>Application building and document organization tools</li>
              <li>Application tracking and deadline management (upcoming)</li>
              <li>Auto-Apply agent functionality (upcoming)</li>
            </ul>
            <p className="mt-3 text-body-md text-on-surface-variant">
              Features marked as "upcoming" are in development and will be released according to
              our roadmap. Availability is not guaranteed on any specific timeline.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              3. Eligibility
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              You must be at least 16 years old to use QuestCampus. By creating an account, you
              represent that you meet this age requirement and that all information you provide is
              accurate, complete, and current at all times.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              4. User Accounts
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              When you create an account, you are responsible for maintaining the confidentiality
              of your account credentials and for all activities that occur under your account. You
              agree to notify us immediately of any unauthorized use of your account. We reserve
              the right to terminate or suspend accounts that violate these terms.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              5. Subscriptions and Payments
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              QuestCampus offers both free and paid subscription tiers. Paid subscriptions are billed
              in advance on a monthly basis. Current pricing is $15 per month, with waitlist members
              eligible for a discounted rate of $10.50 per month.
            </p>
            <p className="mt-3 text-body-md text-on-surface-variant">
              All payments are processed through our secure payment partners. You authorize us to
              charge your selected payment method for all subscription fees. Subscriptions
              automatically renew unless cancelled at least 24 hours before the end of the current
              billing period.
            </p>
            <p className="mt-3 text-body-md text-on-surface-variant">
              You may cancel your subscription at any time through your account settings. Upon
              cancellation, you will continue to have access to paid features until the end of your
              current billing period. No partial refunds are provided.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              6. User Content
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              You retain ownership of any content you submit to QuestCampus, including essays,
              application materials, and profile information. By submitting content, you grant us a
              worldwide, non-exclusive, royalty-free license to use, store, and process that content
              solely for the purpose of providing and improving our services.
            </p>
            <p className="mt-3 text-body-md text-on-surface-variant">
              You represent that you have the right to submit any content you upload and that it does
              not violate the rights of any third party. We do not claim ownership of your
              application materials or essays.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              7. Acceptable Use
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              You agree not to use QuestCampus for any unlawful purpose or in any way that could
              damage, disable, overburden, or impair our service. Prohibited activities include:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-body-md text-on-surface-variant">
              <li>Attempting to gain unauthorized access to any part of the platform</li>
              <li>Using automated systems or software to extract data from the platform</li>
              <li>Submitting false or misleading information in your profile or applications</li>
              <li>Interfering with other users' accounts or data</li>
              <li>Uploading malicious code, viruses, or harmful content</li>
              <li>Using the platform to harass, abuse, or harm others</li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              8. Intellectual Property
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              QuestCampus and its original content, features, and functionality are and will remain
              the exclusive property of QuestCampus and its licensors. The service is protected by
              copyright, trademark, and other laws. Our trademarks and trade dress may not be used
              in connection with any product or service without prior written consent.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              9. Third-Party Links and Content
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              Our platform may contain links to third-party websites or services that are not owned
              or controlled by QuestCampus. We have no control over, and assume no responsibility
              for, the content, privacy policies, or practices of any third-party websites. You
              access such websites at your own risk.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              10. Termination
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              We may terminate or suspend your account and access to QuestCampus immediately, without
              prior notice or liability, for any reason, including if you breach these Terms. Upon
              termination, your right to use the service will cease immediately. Provisions that
              by their nature should survive termination shall survive.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              11. Disclaimer of Warranties
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              QuestCampus is provided on an "as is" and "as available" basis. We make no warranties,
              expressed or implied, regarding the reliability, accuracy, or completeness of any
              information on the platform. University data, rankings, and admission statistics are
              sourced from third parties and may not always reflect the most current information.
            </p>
            <p className="mt-3 text-body-md text-on-surface-variant">
              We do not guarantee admission to any university. Our matching and recommendation
              tools are advisory only and should not replace independent research or professional
              counseling.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              12. Limitation of Liability
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              In no event shall QuestCampus, its directors, employees, partners, or affiliates be
              liable for any indirect, incidental, special, consequential, or punitive damages,
              including without limitation, loss of profits, data, use, goodwill, or other intangible
              losses, resulting from your access to or use of or inability to access or use the
              service.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              13. Governing Law
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              These Terms shall be governed by and construed in accordance with the laws of the
              jurisdiction in which QuestCampus operates, without regard to its conflict of law
              provisions. Any disputes arising under these terms shall be subject to the exclusive
              jurisdiction of the courts in that jurisdiction.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              14. Changes to Terms
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              We reserve the right to modify or replace these Terms at any time. We will provide
              notice of significant changes by posting the updated terms on this page and updating
              the "Last updated" date. Your continued use of the platform after any changes
              constitutes acceptance of the revised terms.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-headline-md text-on-surface">
              15. Contact Us
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="mt-3 text-body-md text-on-surface-variant">
              <strong className="text-on-surface">Email:</strong>{" "}
              <a
                href="mailto:support@questcampus.space"
                className="text-primary hover:underline"
              >
                support@questcampus.space
              </a>
            </p>
          </section>
        </article>
      </main>
      <FooterV2 />
    </>
  );
}
