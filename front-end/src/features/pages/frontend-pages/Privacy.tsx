import { HeroSection } from '@/components/frontend-pages/shared/sections';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';
import PageContainer from '@/shared/ui/PageContainer';

// Legal copy below is intentionally NOT i18n-driven. Translating a privacy
// policy requires per-jurisdiction legal review; until that exists the
// English text here is the source of truth.
const EFFECTIVE_DATE = 'May 6, 2026';
const COMPANY = 'Orthodox Metrics LLC';
const CONTACT_EMAIL = 'info@orthodoxmetrics.com';

const Privacy = () => {
  const { t } = useLanguage();

  return (
    <PageContainer title="Privacy Policy" description="Orthodox Metrics privacy policy">
      <PublicSeo
        title="Privacy Policy"
        description="Privacy Policy for Orthodox Metrics — what we collect, how we use it, payment processing, church/member data, sharing, retention, and your choices."
        path="/privacy"
      />

      <HeroSection
        badge={t('privacy.hero_badge')}
        title={t('privacy.hero_title')}
        subtitle={t('privacy.hero_subtitle')}
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
            Orthodox Metrics respects your privacy. This Privacy Policy explains how we collect,
            use, store, and protect information when you use our website, software platform, and
            related services.
          </p>

          <Section title="1. Information We Collect">
            <p>We may collect the following types of information:</p>
            <ul>
              <li>Name, email address, phone number, organization name, and account details</li>
              <li>Church, parish, clergy, administrator, and member information entered into the platform</li>
              <li>Sacramental, administrative, certificate, record, OCR, and document-processing data submitted by authorized users</li>
              <li>Billing and subscription information</li>
              <li>Technical data such as IP address, browser type, device information, log data, and usage activity</li>
              <li>Communications you send to us through forms, email, support requests, or account interactions</li>
            </ul>
          </Section>

          <Section title="2. Payment Information">
            <p>
              We use Stripe or another third-party payment processor to process payments. We do
              not intentionally store full credit card numbers on our own servers. Payment
              information is handled by our payment processor according to its own privacy and
              security practices.
            </p>
          </Section>

          <Section title="3. How We Use Information">
            <p>We use collected information to:</p>
            <ul>
              <li>Provide and operate the Orthodox Metrics platform</li>
              <li>Manage user accounts, churches, subscriptions, billing, and support</li>
              <li>Process and organize church records, certificates, documents, and administrative workflows</li>
              <li>Improve security, reliability, performance, and user experience</li>
              <li>Communicate with users about accounts, support, updates, and service notices</li>
              <li>Comply with legal, security, tax, and operational obligations</li>
            </ul>
          </Section>

          <Section title="4. Church and Member Data">
            <p>
              Churches and authorized administrators are responsible for the accuracy,
              authorization, and lawful use of data they enter into Orthodox Metrics. We process
              this information only to provide the platform and related services.
            </p>
          </Section>

          <Section title="5. Sharing of Information">
            <p>We do not sell personal information.</p>
            <p>We may share information with:</p>
            <ul>
              <li>Payment processors</li>
              <li>Hosting, infrastructure, email, analytics, and support providers</li>
              <li>Authorized church administrators or account users</li>
              <li>Legal, regulatory, or security authorities when required</li>
              <li>Successors in the event of a merger, acquisition, restructuring, or sale of assets</li>
            </ul>
          </Section>

          <Section title="6. Cookies and Analytics">
            <p>
              We may use cookies, session storage, analytics tools, and similar technologies to
              keep users signed in, improve the website, understand platform usage, and maintain
              security.
            </p>
          </Section>

          <Section title="7. Data Security">
            <p>
              We use reasonable administrative, technical, and organizational safeguards to
              protect information. No system is completely secure, and we cannot guarantee
              absolute security.
            </p>
          </Section>

          <Section title="8. Data Retention">
            <p>
              We retain information for as long as needed to provide services, comply with legal
              obligations, resolve disputes, maintain backups, and enforce agreements. Churches
              may request deletion or export of their data subject to account status, legal
              requirements, and technical limitations.
            </p>
          </Section>

          <Section title="9. Your Choices">
            <p>
              You may contact us to request access, correction, export, or deletion of personal
              information, where legally and technically applicable.
            </p>
          </Section>

          <Section title="10. Children’s Privacy">
            <p>
              Orthodox Metrics is intended for use by churches, clergy, administrators, and
              authorized adult users. We do not knowingly collect information directly from
              children under 13 without appropriate authorization.
            </p>
          </Section>

          <Section title="11. Third-Party Links">
            <p>
              Our website or platform may link to third-party websites or services. We are not
              responsible for the privacy practices of those third parties.
            </p>
          </Section>

          <Section title="12. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Updated versions will be
              posted on this page with a revised effective date.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>For privacy questions, contact:</p>
            <address className="not-italic">
              {COMPANY}<br />
              48 Limerick Ln<br />
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

export default Privacy;
