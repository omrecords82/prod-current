import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Church, ScrollText, Users } from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { HeroSection, CTASection } from '@/components/frontend-pages/shared/sections';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';

/** Map English category labels → i18n keys for badge translation */
const CAT_KEY_MAP: Record<string, string> = {
  Guide: 'blog.cat_guide',
  'Case Study': 'blog.cat_case_study',
  Technology: 'blog.cat_technology',
  Features: 'blog.cat_features',
  Security: 'blog.cat_security',
  Updates: 'blog.cat_updates',
};

const BlogPage = () => {
  const { t, lang } = useLanguage();
  const showContentNotice = lang !== 'en';

  return (
    <>
      <PublicSeo
        title="Blog"
        description="Guides, case studies, and notes on parish records, OCR digitization, and modernizing Orthodox church administration."
        path="/frontend-pages/blog"
      />
      {/* Hero */}
      <HeroSection
        badge={t('blog.hero_badge')}
        title={t('blog.hero_title')}
        subtitle={t('blog.hero_subtitle')}
        editKeyPrefix="blog.hero"
      />

      {/* Featured Post */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-gray-800 dark:to-gray-700 rounded-2xl p-12 text-white">
              <BookOpen className="text-[#d4af37] mb-6" size={48} />
              <h3 className="font-['Georgia'] text-2xl mb-4">
                {t('blog.featured_title')}
              </h3>
              <p className="font-['Inter'] text-[15px] text-[rgba(255,255,255,0.8)] leading-relaxed">
                {t('blog.featured_desc')}
              </p>
            </div>
            <div>
              <div className="om-badge-primary mb-4">
                <span className="om-text-primary text-[14px]">{t('blog.featured_badge')}</span>
              </div>
              <EditableText contentKey="blog.featured.title" as="h2" className="om-heading-primary mb-4">
                {t('blog.featured_title')}
              </EditableText>
              <EditableText contentKey="blog.featured.desc" as="p" className="om-text-body mb-6" multiline>
                {t('blog.featured_desc')}
              </EditableText>
              <ul className="space-y-3 mb-8">
                {[1, 2, 3, 4].map((n) => (
                  <li key={n} className="flex items-center gap-3">
                    <span className="om-bullet" />
                    <span className="font-['Inter'] text-[15px] om-text-secondary">{t(`blog.featured_point${n}`)}</span>
                  </li>
                ))}
              </ul>
              <Link to={PUBLIC_ROUTES.TOUR} className="om-btn-primary inline-flex items-center gap-2">
                {t('blog.featured_btn')} <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Articles */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <EditableText contentKey="blog.recent.title" as="h2" className="om-heading-primary mb-4">{t('blog.recent_title')}</EditableText>
            <EditableText contentKey="blog.recent.subtitle" as="p" className="om-text-body">{t('blog.recent_subtitle')}</EditableText>
          </div>
          {showContentNotice && (
            <p className="text-center font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 italic mb-8">
              {t('blog.content_english_only')}
            </p>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BLOG_POSTS.map((post) => (
              <BlogCard key={post.title} {...post} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <EditableText contentKey="blog.topics.title" as="h2" className="om-heading-primary mb-4">{t('blog.topics_title')}</EditableText>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {TOPIC_ICONS.map((icon, i) => {
              const n = i + 1;
              return (
                <div key={n} className="om-card p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="om-icon-container-primary mx-auto mb-4">
                    {icon}
                  </div>
                  <h3 className="font-['Inter'] font-medium text-lg text-[#2d1b4e] dark:text-white mb-2">{t(`blog.topic${n}_title`)}</h3>
                  <p className="font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{t(`blog.topic${n}_desc`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <EditableText contentKey="blog.newsletter.title" as="h2" className="om-heading-primary mb-4">{t('blog.newsletter_title')}</EditableText>
          <EditableText contentKey="blog.newsletter.desc" as="p" className="om-text-body mb-8" multiline>
            {t('blog.newsletter_desc')}
          </EditableText>
          <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <input
              type="email"
              placeholder={t('blog.newsletter_placeholder')}
              className="om-input flex-1"
              readOnly
            />
            <button className="om-btn-primary whitespace-nowrap">{t('blog.newsletter_btn')}</button>
          </div>
          <p className="font-['Inter'] text-[13px] om-text-tertiary mt-4">
            {t('blog.newsletter_privacy')}
          </p>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title={t('blog.cta_title')}
        subtitle={t('blog.cta_subtitle')}
        editKeyPrefix="blog.cta"
      >
        <Link to={PUBLIC_ROUTES.CONTACT} className="om-btn-accent">{t('blog.cta_btn_start')}</Link>
        <Link to={PUBLIC_ROUTES.SAMPLES} className="om-btn-secondary">{t('blog.cta_btn_samples')}</Link>
      </CTASection>
    </>
  );
};

export default BlogPage;

// ── Local sub-components ──

function BlogCard({ title, excerpt, category, date, t }: { title: string; excerpt: string; category: string; date: string; t: (key: string) => string }) {
  const translatedCat = CAT_KEY_MAP[category] ? t(CAT_KEY_MAP[category]) : category;
  return (
    <div className="om-card overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-48 bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
        <BookOpen className="text-[#d4af37]" size={48} />
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="om-badge-accent">{translatedCat}</span>
          <span className="font-['Inter'] text-[13px] om-text-tertiary">{date}</span>
        </div>
        <h3 className="font-['Inter'] font-medium text-lg text-[#2d1b4e] dark:text-white mb-2 line-clamp-2">{title}</h3>
        <p className="font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 leading-relaxed line-clamp-3">{excerpt}</p>
      </div>
    </div>
  );
}

// ── Static data ──
// Article titles/excerpts intentionally stay in English (editorial content boundary).
// Category badges are translated via CAT_KEY_MAP + t().

const BLOG_POSTS = [
  {
    title: 'Getting Started: Digitizing Your First 100 Records',
    excerpt: 'A practical, step-by-step guide to beginning your parish digitization journey. Learn best practices for scanning, data entry, and quality assurance.',
    category: 'Guide',
    date: 'March 2026',
  },
  {
    title: 'How St. Nicholas Parish Preserved 80 Years of History',
    excerpt: 'A case study of how one parish transformed thousands of handwritten records into a searchable digital archive in just three months.',
    category: 'Case Study',
    date: 'February 2026',
  },
  {
    title: 'Understanding OCR for Handwritten Church Records',
    excerpt: 'Our OCR technology can read handwritten records in multiple scripts. Learn how it works and what to expect from automated text extraction.',
    category: 'Technology',
    date: 'February 2026',
  },
  {
    title: 'Multi-Language Records: Supporting Your Diverse Parish',
    excerpt: 'How Orthodox Metrics handles Greek, Russian, Arabic, Romanian, and other languages in a single unified system.',
    category: 'Features',
    date: 'January 2026',
  },
  {
    title: 'Data Security Best Practices for Parish Records',
    excerpt: 'Understanding encryption, access controls, and backup strategies to keep your parish data safe and compliant.',
    category: 'Security',
    date: 'January 2026',
  },
  {
    title: 'New Feature: Advanced Search & Reporting',
    excerpt: 'Announcing powerful new search filters, date-range queries, and exportable reports for parish administrators.',
    category: 'Updates',
    date: 'December 2025',
  },
];

const TOPIC_ICONS = [
  <ScrollText className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />,
  <Church className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />,
  <BookOpen className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />,
  <Users className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />,
];
