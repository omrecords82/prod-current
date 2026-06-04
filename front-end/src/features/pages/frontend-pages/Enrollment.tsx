import PublicSeo from '@/components/seo/PublicSeo';
import OmChurchOnboarding from '@/components/om-church-onboarding/v1/App';

/**
 * Public homepage CTA "Enroll Now" lands here.
 *
 * Renders the om-church-onboarding component (sourced from om-workshop)
 * inside a scoped wrapper so its CSS variables and dark-mode toggle do
 * not leak into the rest of the Orthodox Metrics public site.
 */
const Enrollment = () => {
  return (
    <>
      <PublicSeo
        title="Enroll Your Parish"
        description="Enroll your Orthodox parish in Orthodox Metrics — sacramental record digitization, OCR, and modern parish administration."
        path="/enroll"
      />
      <OmChurchOnboarding />
    </>
  );
};

export default Enrollment;
