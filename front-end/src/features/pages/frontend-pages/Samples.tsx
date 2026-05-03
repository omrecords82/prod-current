import { Link } from 'react-router-dom';
import { Calendar, User, MapPin, BookOpen } from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { HeroSection, SectionHeader, CTASection } from '@/components/frontend-pages/shared/sections';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';
import {
  getBaptismSample,
  getMarriageSample,
  getMultiLangSamples,
  getSearchDemoResults,
} from '@/components/frontend-pages/shared/sampleDataAdapter';

const baptism = getBaptismSample();
const marriage = getMarriageSample();
const multiLang = getMultiLangSamples();
const searchResults = getSearchDemoResults();

const Samples = () => {
  const { t } = useLanguage();

  return (
    <>
      <PublicSeo
        title="Sample Records"
        description="See real-shape baptism, marriage, and funeral sample records — formatted across English, Greek, Russian, Romanian, and Georgian."
        path="/samples"
      />
      {/* Hero */}
      <HeroSection
        badge={t('samples.hero_badge')}
        title={t('samples.hero_title')}
        subtitle={t('samples.hero_subtitle')}
        editKeyPrefix="samples.hero"
      />

      {/* Introduction */}
      <section className="py-16 om-section-base">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <EditableText contentKey="samples.intro" as="p" className="om-text-body mb-6" multiline>
            {t('samples.intro_text')}
          </EditableText>
          <div className="om-badge-secondary inline-block">
            <span className="om-text-primary text-[14px]">
              {t('samples.compliance_badge')}
            </span>
          </div>
        </div>
      </section>

      {/* Baptism Record */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Certificate View */}
            <div>
              <div className="om-badge-primary mb-6">
                <BookOpen className="om-feature-icon" size={18} />
                <span className="om-text-primary text-[14px]">{t('samples.baptism_badge')}</span>
              </div>
              <EditableText contentKey="samples.baptism.title" as="h2" className="om-heading-primary mb-6">{t('samples.baptism_title')}</EditableText>
              <EditableText contentKey="samples.baptism.desc" as="p" className="om-text-body mb-8" multiline>
                {t('samples.baptism_desc')}
              </EditableText>

              <div className="om-card-elevated p-8">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8">
                  <div className="border-l-4 border-[#d4af37] pl-6 mb-6">
                    <p className="font-['Georgia'] text-2xl om-text-primary mb-2">{t('samples.baptism_cert_title')}</p>
                    <p className="font-['Inter'] text-[14px] om-text-secondary italic">
                      {baptism.parish} &bull; {baptism.city}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <CertField label={t('samples.baptism_label_child_name')} value={baptism.childName} />
                    <div className="grid grid-cols-2 gap-4">
                      <CertField label={t('samples.baptism_label_dob')} value={baptism.dateOfBirth} />
                      <CertField label={t('samples.baptism_label_date_baptism')} value={baptism.dateOfBaptism} />
                    </div>
                    <CertField label={t('samples.baptism_label_parents')} value={baptism.parents} />
                    <CertField label={t('samples.baptism_label_godparents')} value={baptism.godparents} />
                    <CertField label={t('samples.baptism_label_celebrant')} value={baptism.celebrant} />
                    <div className="mt-6 pt-6 om-divider">
                      <p className="font-['Inter'] text-[12px] om-text-tertiary">
                        {t('samples.baptism_cert_record_no')} B-2023-042 &bull; {t('samples.baptism_cert_entered')}: {baptism.dateOfBaptism}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Digitised Data */}
            <div>
              <div className="om-badge-secondary mb-6">
                <span className="om-text-primary text-[14px]">{t('samples.baptism_digital_badge')}</span>
              </div>
              <EditableText contentKey="samples.baptism.digital.title" as="h3" className="om-heading-secondary mb-6">{t('samples.baptism_digital_title')}</EditableText>
              <EditableText contentKey="samples.baptism.digital.desc" as="p" className="om-text-body mb-8" multiline>
                {t('samples.baptism_digital_desc')}
              </EditableText>
              <div className="space-y-4">
                <DataCard title={t('samples.baptism_card1_title')} icon={<User className="om-feature-icon" size={20} />}>
                  <DataField label={t('samples.baptism_digital_full_name')} value={baptism.childName} badgeLabel={t('samples.badge_searchable')} />
                  <DataField label={t('samples.baptism_digital_birth_date')} value={baptism.dateOfBirth} badgeLabel={t('samples.badge_searchable')} />
                  <DataField label={t('samples.baptism_digital_baptism_date')} value={baptism.dateOfBaptism} badgeLabel={t('samples.badge_searchable')} />
                </DataCard>
                <DataCard title={t('samples.baptism_card2_title')} icon={<User className="om-feature-icon" size={20} />}>
                  <DataField label={t('samples.baptism_digital_parents')} value={baptism.parents} badgeLabel={t('samples.badge_searchable')} />
                  <DataField label={t('samples.baptism_digital_godparents')} value={baptism.godparents} badgeLabel={t('samples.badge_searchable')} />
                </DataCard>
                <DataCard title={t('samples.baptism_card3_title')} icon={<MapPin className="om-feature-icon" size={20} />}>
                  <DataField label={t('samples.baptism_digital_parish')} value={baptism.parish} badgeLabel={t('samples.badge_searchable')} />
                  <DataField label={t('samples.baptism_digital_city')} value={baptism.city} badgeLabel={t('samples.badge_searchable')} />
                  <DataField label={t('samples.baptism_digital_celebrant')} value={baptism.celebrant} badgeLabel={t('samples.badge_searchable')} />
                </DataCard>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marriage Record */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader badge={t('samples.marriage_badge')} title={t('samples.marriage_title')} subtitle={t('samples.marriage_subtitle')} editKeyPrefix="samples.marriage" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="om-card p-8">
              <h3 className="om-heading-tertiary mb-6">{t('samples.marriage_traditional')}</h3>
              <div className="space-y-4">
                <CertField label={t('samples.marriage_label_groom')} value={marriage.groomName} />
                <CertField label={t('samples.marriage_label_bride')} value={marriage.brideName} />
                <CertField label={t('samples.marriage_label_date')} value={marriage.dateMarried} />
                <CertField label={t('samples.marriage_label_witnesses')} value={marriage.witnesses} />
                <CertField label={t('samples.marriage_label_officiant')} value={marriage.officiant} />
              </div>
            </div>
            <div className="om-card p-8">
              <h3 className="om-heading-tertiary mb-6">{t('samples.marriage_searchable')}</h3>
              <div className="space-y-4">
                <IndexedField label={t('samples.marriage_search_groom')} value={marriage.groomName} badgeLabel={t('samples.badge_indexed')} />
                <IndexedField label={t('samples.marriage_search_bride')} value={marriage.brideName} badgeLabel={t('samples.badge_indexed')} />
                <IndexedField label={t('samples.marriage_search_date')} value={marriage.dateMarried} badgeLabel={t('samples.badge_indexed')} />
                <IndexedField label={t('samples.marriage_search_priest')} value={marriage.officiant} badgeLabel={t('samples.badge_indexed')} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Language */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader badge={t('samples.multilang_badge')} title={t('samples.multilang_title')} subtitle={t('samples.multilang_subtitle')} editKeyPrefix="samples.multilang" />
          <div className="grid md:grid-cols-3 gap-8">
            {multiLang.map((lang) => (
              <div key={lang.language} className="om-card p-6">
                <div className="mb-4">
                  <span className="om-badge-accent">{lang.language} ({lang.languageNative})</span>
                </div>
                <h3 className="font-['Georgia'] text-xl om-text-primary mb-4">{lang.sacrament}</h3>
                <div className="space-y-3">
                  <LangField label={lang.language === 'Greek' ? 'Όνομα' : lang.language === 'Russian' ? 'Имя' : 'الاسم'} value={lang.name} rtl={lang.language === 'Arabic'} />
                  <LangField label={lang.language === 'Greek' ? 'Ημερομηνία' : lang.language === 'Russian' ? 'Дата' : 'التاريخ'} value={lang.date} rtl={lang.language === 'Arabic'} />
                  <LangField label={lang.language === 'Greek' ? 'Ιερέας' : lang.language === 'Russian' ? 'Священник' : 'الكاهن'} value={lang.priest} rtl={lang.language === 'Arabic'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search Demo */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader badge={t('samples.search_badge')} title={t('samples.search_title')} subtitle={t('samples.search_subtitle')} editKeyPrefix="samples.search" />
          <div className="om-card p-8 max-w-4xl mx-auto">
            <div className="mb-8">
              <label className="block font-['Inter'] font-medium text-[14px] om-text-primary mb-2">{t('samples.search_label')}</label>
              <input type="text" placeholder={t('samples.search_placeholder')} className="om-input" readOnly />
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block font-['Inter'] font-medium text-[14px] om-text-primary mb-2">{t('samples.search_type_label')}</label>
                <select className="om-select" defaultValue="">
                  <option value="">{t('samples.search_type_all')}</option>
                  <option>{t('samples.search_type_baptisms')}</option>
                  <option>{t('samples.search_type_marriages')}</option>
                  <option>{t('samples.search_type_funerals')}</option>
                </select>
              </div>
              <div>
                <label className="block font-['Inter'] font-medium text-[14px] om-text-primary mb-2">{t('samples.search_date_from')}</label>
                <input type="date" className="om-input" readOnly />
              </div>
              <div>
                <label className="block font-['Inter'] font-medium text-[14px] om-text-primary mb-2">{t('samples.search_date_to')}</label>
                <input type="date" className="om-input" readOnly />
              </div>
            </div>
            <div className="flex gap-4">
              <button className="om-btn-primary flex-1">{t('samples.search_btn')}</button>
              <button className="om-btn-outline">{t('samples.search_btn_advanced')}</button>
            </div>
            <div className="mt-8 pt-8 om-divider">
              <p className="font-['Inter'] text-[14px] om-text-secondary mb-4">{t('samples.search_showing').replace('{count}', String(searchResults.length))}</p>
              <div className="space-y-3">
                {searchResults.map((result, idx) => (
                  <div key={idx} className="om-card-compact p-4 hover:border-[#d4af37] dark:hover:border-[#d4af37] transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-['Inter'] font-medium text-[15px] om-text-primary">{result.name}</p>
                      <span className="text-[12px] bg-[#d4af37] text-[#2d1b4e] px-2 py-1 rounded">{result.type}</span>
                    </div>
                    <p className="font-['Inter'] text-[13px] om-text-secondary">{result.date} &bull; {result.parish}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explorer CTA */}
      <section className="py-16 om-section-elevated">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            badge={t('samples.explorer_badge')}
            title={t('samples.explorer_title')}
            subtitle={t('samples.explorer_subtitle')}
            editKeyPrefix="samples.explorer"
          />
          <Link to={PUBLIC_ROUTES.SAMPLES_EXPLORER} className="om-btn-primary inline-flex items-center gap-2">
            {t('samples.explorer_btn')}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <CTASection title={t('samples.cta_title')} subtitle={t('samples.cta_subtitle')} editKeyPrefix="samples.cta">
        <Link to={PUBLIC_ROUTES.CONTACT} className="om-btn-accent">{t('samples.cta_btn_demo')}</Link>
        <Link to={PUBLIC_ROUTES.PRICING} className="om-btn-secondary">{t('samples.cta_btn_pricing')}</Link>
      </CTASection>
    </>
  );
};

export default Samples;

// ── Local sub-components ──

function CertField({ label, value }: { label: string; value: string }) {
  return (
    <div className="pb-3 om-divider">
      <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">{label}</p>
      <p className="font-['Inter'] text-[15px] om-text-primary">{value}</p>
    </div>
  );
}

function DataCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="om-card p-6">
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h4 className="om-heading-tertiary text-lg">{title}</h4>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DataField({ label, value, badgeLabel }: { label: string; value: string; badgeLabel?: string }) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="font-['Inter'] text-[13px] om-text-tertiary mb-1">{label}</p>
        <p className="font-['Inter'] text-[15px] om-text-primary">{value}</p>
      </div>
      {badgeLabel && (
        <span className="text-[11px] bg-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded whitespace-nowrap">{badgeLabel}</span>
      )}
    </div>
  );
}

function IndexedField({ label, value, badgeLabel }: { label: string; value: string; badgeLabel?: string }) {
  return (
    <div className="om-card-subtle p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-['Inter'] text-[14px] om-text-secondary">{label}</span>
        {badgeLabel && <span className="om-badge-accent whitespace-nowrap">{badgeLabel}</span>}
      </div>
      <p className="font-['Inter'] text-[15px] om-text-primary">{value}</p>
    </div>
  );
}

function LangField({ label, value, rtl = false }: { label: string; value: string; rtl?: boolean }) {
  return (
    <div>
      <p className="font-['Inter'] text-[13px] om-text-tertiary">{label}</p>
      <p className="font-['Inter'] text-[15px] om-text-primary" dir={rtl ? 'rtl' : undefined}>{value}</p>
    </div>
  );
}
