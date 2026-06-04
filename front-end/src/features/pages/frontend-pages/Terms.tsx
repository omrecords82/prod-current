import { HeroSection } from '@/components/frontend-pages/shared/sections';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';
import PageContainer from '@/shared/ui/PageContainer';

// Legal copy below is intentionally NOT i18n-driven. Translating terms of
// service requires per-jurisdiction legal review; until that exists the
// English text here is the source of truth.
const EFFECTIVE_DATE = 'May 6, 2026';
const COMPANY = 'Orthodox Metrics LLC';
const CONTACT_EMAIL = 'info@orthodoxmetrics.com';
const GOVERNING_STATE = 'New Jersey';

const Terms = () => {
  const { t } = useLanguage();

  return (
    <PageContainer title="Terms of Service" description="Orthodox Metrics terms of service">
      <PublicSeo
        title="Terms of Service"
        description="Terms of Service for Orthodox Metrics — accounts, customer data, billing, acceptable use, third parties, IP, liability, and governing law."
        path="/terms"
      />

      <HeroSection
        badge={t('terms.hero_badge')}
        title={t('terms.hero_title')}
        subtitle={t('terms.hero_subtitle')}
      />

      <section className="py-20 om-section-base">
        <div className="max-w-3xl mx-auto px-6 om-legal-prose">
          <p className="font-['Inter'] text-[14px] text-[#6b7280] dark:text-gray-500 mb-2">
            <strong>Effective Date:</strong> {EFFECTIVE_DATE}
          </p>
          <p className="font-['Inter'] text-[14px] text-[#6b7280] dark:text-gray-500 mb-2">
            <strong>Website:</strong> https://orthodoxmetrics.com
          </p>
          <p className="font-['Inter'] text-[14px] text-[#6b7280] dark:text-gray-500 mb-8">
            <strong>Company:</strong> {COMPANY}
          </p>

          <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed mb-10">
            These Terms of Service govern your use of Orthodox Metrics, including our website,
            software platform, tools, and related services.
          </p>

          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using Orthodox Metrics, you agree to these Terms. If you do not
              agree, do not use the service.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              Orthodox Metrics provides software tools for Orthodox churches and church
              administrators, including parish records management, sacramental records,
              certificate tools, OCR-assisted document processing, administrative workflows,
              reporting, and related operational features.
            </p>
          </Section>

          <Section title="3. Accounts and Authorized Users">
            <p>
              You are responsible for maintaining the confidentiality of your account
              credentials. You are responsible for all activity under your account.
            </p>
            <p>
              Churches and organizations are responsible for determining which users are
              authorized to access their data.
            </p>
          </Section>

          <Section title="4. Customer Data">
            <p>You retain ownership of the data you submit to Orthodox Metrics.</p>
            <p>
              You grant us permission to host, process, store, transmit, and display your data
              only as needed to provide, secure, maintain, and improve the service.
            </p>
            <p>
              You are responsible for ensuring that you have the right to submit and manage any
              church, parish, clergy, member, sacramental, document, or administrative data
              entered into the platform.
            </p>
          </Section>

          <Section title="5. Accuracy of Records">
            <p>
              Orthodox Metrics provides software tools to assist with recordkeeping and
              administration. We do not guarantee that records, certificates, OCR output,
              reports, or generated documents are legally, ecclesiastically, or administratively
              correct.
            </p>
            <p>
              You are responsible for reviewing and verifying all records, certificates,
              reports, and documents before relying on them.
            </p>
          </Section>

          <Section title="6. Subscriptions, Billing, and Payments">
            <p>
              Some services may require paid subscriptions or fees. By purchasing a
              subscription, you authorize us and our payment processor to charge applicable
              fees.
            </p>
            <p>
              Fees, billing cycles, cancellation terms, and subscription details may be shown
              during checkout or within your account.
            </p>
            <p>
              Unless otherwise stated, fees are non-refundable except where required by law or
              agreed in writing.
            </p>
          </Section>

          <Section title="7. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for unlawful purposes</li>
              <li>Access data without authorization</li>
              <li>Attempt to disrupt, damage, reverse engineer, or compromise the platform</li>
              <li>Upload malicious code or harmful content</li>
              <li>Misrepresent your identity or authority</li>
              <li>Use the service to violate privacy, security, or data protection obligations</li>
            </ul>
          </Section>

          <Section title="8. Service Availability">
            <p>
              We aim to provide reliable service, but we do not guarantee uninterrupted
              availability. We may modify, suspend, or discontinue parts of the service as
              needed for maintenance, security, upgrades, or operational reasons.
            </p>
          </Section>

          <Section title="9. Third-Party Services">
            <p>
              Orthodox Metrics may integrate with third-party services such as payment
              processors, email providers, hosting providers, analytics tools, or other
              software services. Your use of those services may be subject to their own terms
              and policies.
            </p>
          </Section>

          <Section title="10. Intellectual Property">
            <p>
              Orthodox Metrics, including its software, design, branding, workflows,
              documentation, and platform features, is owned by {COMPANY} or its licensors.
            </p>
            <p>
              You may not copy, modify, distribute, resell, or create derivative works from the
              platform except as expressly permitted.
            </p>
          </Section>

          <Section title="11. Confidentiality">
            <p>
              Users may have access to sensitive church, administrative, or member information.
              You agree to use such information only for authorized purposes and to protect it
              from unauthorized access or disclosure.
            </p>
          </Section>

          <Section title="12. Termination">
            <p>
              We may suspend or terminate access if you violate these Terms, fail to pay
              required fees, misuse the platform, create security risk, or use the service
              unlawfully.
            </p>
            <p>
              You may stop using the service at any time. Data export or deletion may be subject
              to account status, technical limits, backup retention, and legal obligations.
            </p>
          </Section>

          <Section title="13. Disclaimer of Warranties">
            <p>
              The service is provided “as is” and “as available.” To the maximum extent
              permitted by law, we disclaim warranties of merchantability, fitness for a
              particular purpose, non-infringement, accuracy, availability, and error-free
              operation.
            </p>
          </Section>

          <Section title="14. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, {COMPANY} will not be liable for indirect,
              incidental, special, consequential, punitive, or lost-profit damages.
            </p>
            <p>
              Our total liability for any claim related to the service will not exceed the
              amount paid by you to us for the service during the three months before the claim
              arose.
            </p>
          </Section>

          <Section title="15. Indemnification">
            <p>
              You agree to indemnify and hold harmless {COMPANY} from claims, damages,
              liabilities, and expenses arising from your use of the service, your data, your
              violation of these Terms, or your violation of applicable law or third-party
              rights.
            </p>
          </Section>

          <Section title="16. Governing Law">
            <p>
              These Terms are governed by the laws of the State of {GOVERNING_STATE}, without
              regard to conflict-of-law rules.
            </p>
          </Section>

          <Section title="17. Changes to Terms">
            <p>
              We may update these Terms from time to time. Updated versions will be posted on
              this page with a revised effective date.
            </p>
          </Section>

          <Section title="18. Contact">
            <p>For questions about these Terms, contact:</p>
            <address className="not-italic">
              {COMPANY}<br />
              48 Limerick Ln, Phillipsburg NJ 08865<br />
              Email:{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[#2d1b4e] dark:text-[#d4af37] font-medium no-underline hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </address>
          </Section>
        </div>
      </section>
    </PageContainer>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-['Georgia'] text-2xl text-[#2d1b4e] dark:text-white mb-3">{title}</h2>
      <div className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ul>li]:marker:text-[#d4af37]">
        {children}
      </div>
    </section>
  );
}

export default Terms;
