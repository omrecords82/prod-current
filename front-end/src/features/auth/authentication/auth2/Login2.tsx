import SiteFooter from '@/components/frontend-pages/shared/footer/SiteFooter';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import { Card, LoginFeatureCarousel } from '@/design-system';
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

        <section className="om-hero-gradient om-login-hero">
          <div className="om-login-hero-inner max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-10 lg:gap-12 items-stretch">
              <LoginFeatureCarousel />

              <div className="flex items-center justify-center">
                <Card className="w-full max-w-[450px] !shadow-[var(--om-shadow-elevated)]">
                  <h2 className="font-om-display om-text-h4 text-center mb-1">
                    {t('auth.card_heading')}
                  </h2>
                  <p className="font-om-body om-text-small om-text-secondary text-center mb-4">
                    {t('auth.card_subheading')}
                  </p>

                  <AuthLogin
                    subtitle={
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <span className="font-om-body om-text-body om-text-secondary">
                          {t('auth.new_to_om')}
                        </span>
                        <Link
                          to="/get-started"
                          className="font-om-body om-text-body font-semibold text-[var(--om-gold)] no-underline hover:underline"
                        >
                          {t('auth.create_account')}
                        </Link>
                      </div>
                    }
                  />
                </Card>
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
