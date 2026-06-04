import { HeroSection } from '@/components/frontend-pages/shared/sections';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';
import PageContainer from '@/shared/ui/PageContainer';

// Security copy below is intentionally NOT i18n-driven. The text describes
// concrete operational practices and contact addresses that should not drift
// across translations without explicit review.
const EFFECTIVE_DATE = 'May 6, 2026';
const CONTACT_EMAIL = 'info@orthodoxmetrics.com';

const Security = () => {
  const { t } = useLanguage();

  return (
    <PageContainer title="Security" description="Orthodox Metrics security and trust">
      <PublicSeo
        title="Security"
        description="How Orthodox Metrics secures parish data — secure access, encryption, payment security, data protection, backups, monitoring, and responsible disclosure."
        path="/security"
      />

      <HeroSection
        badge={t('security.hero_badge')}
        title={t('security.hero_title')}
        subtitle={t('security.hero_subtitle')}
      />

      <section className="py-20 om-section-base">
        <div className="max-w-3xl mx-auto px-6 om-legal-prose">
          <p className="font-['Inter'] text-[14px] text-[#6b7280] dark:text-gray-500 mb-2">
            <strong>Effective Date:</strong> {EFFECTIVE_DATE}
          </p>
          <p className="font-['Inter'] text-[14px] text-[#6b7280] dark:text-gray-500 mb-8">
            <strong>Website:</strong> https://orthodoxmetrics.com
          </p>

          <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed mb-10">
            Orthodox Metrics takes security seriously. Our platform is designed to help Orthodox
            churches manage sensitive administrative, parish, sacramental, and document-related
            data in a secure and responsible way.
          </p>

          <Section title="1. Secure Access">
            <p>
              Orthodox Metrics uses authenticated user accounts to control access to the platform.
              Access to church records, administrative tools, and account data is limited to
              authorized users based on their assigned permissions.
            </p>
            <p>
              Users are responsible for protecting their login credentials and ensuring that only
              authorized personnel access their church or organization account.
            </p>
          </Section>

          <Section title="2. Encryption">
            <p>
              We use HTTPS/TLS encryption to protect data transmitted between your browser and our
              platform.
            </p>
            <p>
              Where appropriate, sensitive data is protected using industry-standard security
              practices for storage, transmission, and access control.
            </p>
          </Section>

          <Section title="3. Payment Security">
            <p>
              Payments are processed through Stripe or another trusted third-party payment
              processor. Orthodox Metrics does not intentionally store full credit card numbers on
              its own servers.
            </p>
            <p>
              Payment information is handled by the payment processor according to its own
              security and compliance standards.
            </p>
          </Section>

          <Section title="4. Data Protection">
            <p>
              Orthodox Metrics applies reasonable administrative, technical, and organizational
              safeguards to protect customer data from unauthorized access, misuse, loss, or
              disclosure.
            </p>
            <p>These safeguards may include:</p>
            <ul>
              <li>Account authentication</li>
              <li>Role-based access controls</li>
              <li>Secure server configuration</li>
              <li>Database access restrictions</li>
              <li>Activity logging</li>
              <li>Backup procedures</li>
              <li>Software updates and maintenance</li>
              <li>Separation of customer and administrative access where appropriate</li>
            </ul>
          </Section>

          <Section title="5. Church and Member Records">
            <p>
              Churches may use Orthodox Metrics to manage sensitive records, including parish,
              clergy, member, sacramental, certificate, OCR, and document-processing information.
            </p>
            <p>
              Each church or organization is responsible for determining who is authorized to
              access, edit, export, or manage its records.
            </p>
          </Section>

          <Section title="6. Backups and Availability">
            <p>
              We use backup and recovery practices intended to reduce the risk of data loss and
              support service continuity.
            </p>
            <p>
              No system can guarantee uninterrupted operation, but we work to maintain a reliable
              and secure platform.
            </p>
          </Section>

          <Section title="7. Monitoring and Maintenance">
            <p>
              We may monitor platform activity, system logs, authentication activity, and
              operational health to detect errors, abuse, unauthorized access attempts, or
              security issues.
            </p>
            <p>
              We also perform maintenance, updates, and infrastructure improvements to help keep
              the platform secure and stable.
            </p>
          </Section>

          <Section title="8. Third-Party Providers">
            <p>
              Orthodox Metrics may use trusted third-party providers for hosting, payment
              processing, email delivery, analytics, infrastructure, monitoring, and support.
            </p>
            <p>
              These providers are used only as needed to operate, secure, and improve the service.
            </p>
          </Section>

          <Section title="9. Responsible Disclosure">
            <p>
              If you believe you have discovered a security issue, please contact us immediately.
            </p>
            <p>
              Do not attempt to access, modify, delete, or disclose data that does not belong to
              you. We ask that security reports be made responsibly and in good faith.
            </p>
            <p>Security reports can be sent to:</p>
            <p>
              <strong>Email:</strong>{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[#2d1b4e] dark:text-[#d4af37] font-medium no-underline hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>

          <Section title="10. No Absolute Guarantee">
            <p>
              While we take security seriously and use reasonable safeguards, no internet-based
              service can be guaranteed to be completely secure.
            </p>
            <p>
              Customers should use strong passwords, limit user access to trusted individuals, and
              promptly notify us of any suspected unauthorized access.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>For security questions, contact:</p>
            <address className="not-italic">
              <strong>Orthodox Metrics</strong>
              <br />
              <strong>Email:</strong>{' '}
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

export default Security;
