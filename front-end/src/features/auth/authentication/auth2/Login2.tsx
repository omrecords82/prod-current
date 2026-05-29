import SiteFooter from '@/components/frontend-pages/shared/footer/SiteFooter';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import { useLanguage } from '@/context/LanguageContext';
import AuthLogin from '@/features/auth/authentication/authForms/AuthLogin';
import PageContainer from '@/shared/ui/PageContainer';
import { Link } from 'react-router-dom';

const Login2 = () => {
  const { t } = useLanguage();

  return (
    <PageContainer title="Login" description="this is Login page">
      <div className="om-page-container">
        <HpHeader />

        {/* Hero Login Section */}
        <section className="om-hero-gradient py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left: Branding Image */}
              <div className="flex items-center justify-center">
                <img src="/images/misc/left-side-light.png" alt="Orthodox Metrics" className="max-w-[320px] md:max-w-[400px] w-full h-auto object-contain" />
              </div>

              {/* Right: Login Card */}
              <div className="flex justify-center">
                <div className="w-full max-w-[450px] bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-2xl p-8 shadow-xl text-[#2d1b4e] dark:text-white">
                  <h2 className="font-['Georgia'] text-2xl text-[#2d1b4e] dark:text-white text-center mb-1">
                    {t('auth.card_heading')}
                  </h2>
                  <p className="font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 text-center mb-4">
                    {t('auth.card_subheading')}
                  </p>

                  <AuthLogin
                    subtitle={
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <span className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400">
                          {t('auth.new_to_om')}
                        </span>
                        <Link
                          to="/get-started"
                          className="font-['Inter'] text-[15px] font-medium text-[#2d1b4e] dark:text-[#d4af37] no-underline hover:underline"
                        >
                          {t('auth.create_account')}
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

export default Login2;
