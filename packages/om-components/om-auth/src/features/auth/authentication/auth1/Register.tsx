import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Shield, Globe } from '@/ui/icons';
import PageContainer from '@/shared/ui/PageContainer';
import AuthRegister from '@/features/auth/authentication/authForms/AuthRegister';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import SiteFooter from '@/components/frontend-pages/shared/footer/SiteFooter';
import { useLanguage } from '@/context/LanguageContext';

const FEATURE_ICONS = [BookOpen, Search, Globe, Shield] as const;

const Register = () => {
  const { t } = useLanguage();

  return (
    <PageContainer title="Get Started — Orthodox Metrics" description="Church inquiry and registration">
      <div className="om-page-container">
        <HpHeader />

        {/* Hero Register Section — mirrors Login2 */}
        <section className="om-hero-gradient py-12 md:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              {/* Left: Branding + Features */}
              <div className="pt-4">
                <div className="om-hero-badge mb-4">
                  <span className="om-hero-badge-text">{t('auth.hero_badge')}</span>
                </div>

                <h1 className="font-['Georgia'] text-3xl sm:text-4xl md:text-5xl text-white leading-tight mb-4">
                  Get Started with{' '}
                  <span className="text-[#d4af37]">Orthodox Metrics</span>
                </h1>

                <p className="font-['Inter'] text-base md:text-lg text-[rgba(255,255,255,0.7)] leading-relaxed mb-8 max-w-lg">
                  Tell us about your parish and we'll help you preserve your sacred records with modern, secure technology.
                </p>

                {/* Feature bullets */}
                <div className="hidden md:flex flex-col gap-4">
                  {[1, 2, 3, 4].map((idx) => {
                    const Icon = FEATURE_ICONS[idx - 1];
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[rgba(212,175,55,0.15)] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="text-[#d4af37]" size={20} />
                        </div>
                        <div>
                          <h3 className="font-['Inter'] font-medium text-[15px] text-white">{t(`auth.feat${idx}_title`)}</h3>
                          <p className="font-['Inter'] text-[13px] text-[rgba(255,255,255,0.5)]">{t(`auth.feat${idx}_desc`)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Registration Wizard Card */}
              <div className="flex justify-center">
                <div className="w-full max-w-[520px] bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-2xl p-6 md:p-8 shadow-xl text-[#2d1b4e] dark:text-white">
                  <AuthRegister
                    title="Get Started"
                    subtext={
                      <p className="font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 mb-3">
                        Tell us about your parish and we'll help you get set up
                      </p>
                    }
                    subtitle={
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <span className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400">
                          Already have an Account?
                        </span>
                        <Link
                          to="/auth/login"
                          className="font-['Inter'] text-[15px] font-medium text-[#2d1b4e] dark:text-[#d4af37] no-underline hover:underline"
                        >
                          Sign In
                        </Link>
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </PageContainer>
  );
};

export default Register;
