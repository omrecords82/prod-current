import React, { useState } from 'react';
import axios from 'axios';
import { ArrowRight, Mail, Phone, Users } from '@/ui/icons';
import { HeroSection } from '@/components/frontend-pages/shared/sections';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import PageContainer from '@/shared/ui/PageContainer';
import PublicSeo from '@/components/seo/PublicSeo';

/**
 * Public homepage CTA "Enroll Now" lands here.
 *
 * Pre-launch funnel: collect 4 fields → POST /api/enroll → email to founder.
 * Intentionally NOT wired to omai_crm_inquiries / omai_crm_appointments
 * (the existing CRM contact path) — we want the lowest-friction sign-up
 * surface while we have zero clients. Promote to CRM-backed once leads
 * arrive.
 */
const Enrollment = () => {
  const [form, setForm] = useState({
    parishName: '',
    contactName: '',
    email: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (feedback) setFeedback(null);
    };

  const validate = (): string | null => {
    if (!form.parishName.trim()) return 'Please enter your parish name.';
    if (!form.contactName.trim()) return 'Please enter your name.';
    if (!form.email.trim()) return 'Please enter an email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFeedback({ type: 'error', text: err });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await axios.post('/api/enroll', form);
      if (res.data?.success === false) {
        throw new Error(res.data?.message || 'Submission failed.');
      }
      setFeedback({
        type: 'success',
        text: res.data?.message || "Thank you! We'll be in touch shortly.",
      });
      setForm({ parishName: '', contactName: '', email: '', phone: '' });
    } catch (error: any) {
      setFeedback({
        type: 'error',
        text:
          error?.response?.data?.message ||
          error?.message ||
          'Could not submit your enrollment. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title="Enroll" description="Enroll your parish in Orthodox Metrics">
      <PublicSeo
        title="Enroll Your Parish"
        description="Enroll your Orthodox parish in Orthodox Metrics — sacramental record digitization, OCR, and modern parish administration."
        path="/frontend-pages/enroll"
      />

      <HeroSection
        badge="Enroll Now"
        title="Bring your parish into Orthodox Metrics"
        subtitle="Tell us a little about your parish. We'll reach out to walk you through onboarding, records digitization, and what setup looks like for your community."
        editKeyPrefix="enroll.hero"
      />

      <section className="py-20 om-section-base">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <h2 className="font-['Georgia'] text-3xl text-[#2d1b4e] dark:text-white mb-2">Parish enrollment</h2>
              <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 mb-8">
                Four fields. No credit card. We follow up by email within one business day.
              </p>

              {feedback && (
                <div
                  className={`mb-6 px-4 py-3 rounded-lg border font-['Inter'] text-[15px] ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{feedback.text}</span>
                    <button
                      onClick={() => setFeedback(null)}
                      className="ml-4 text-current opacity-60 hover:opacity-100 bg-transparent border-0 cursor-pointer text-lg leading-none"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <FormField
                  label="Parish name"
                  id="parishName"
                  placeholder="e.g. SS Peter & Paul Orthodox Church"
                  value={form.parishName}
                  onChange={handleChange('parishName')}
                  required
                />

                <FormField
                  label="Your name"
                  id="contactName"
                  placeholder="Father / Presbytera / lay administrator"
                  value={form.contactName}
                  onChange={handleChange('contactName')}
                  required
                />

                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField
                    label="Email"
                    id="email"
                    type="email"
                    placeholder="you@parish.org"
                    value={form.email}
                    onChange={handleChange('email')}
                    required
                  />
                  <FormField
                    label="Phone (optional)"
                    id="phone"
                    placeholder="(555) 123-4567"
                    value={form.phone}
                    onChange={handleChange('phone')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors disabled:opacity-50 cursor-pointer border-0"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending…
                    </>
                  ) : (
                    <>
                      Enroll my parish
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* What happens next */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-800 dark:via-gray-750 dark:to-gray-700 rounded-2xl p-8 text-white h-full">
                <h3 className="font-['Georgia'] text-2xl mb-3">What happens next</h3>
                <p className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] mb-8 leading-relaxed">
                  We're keeping onboarding personal during early access — no auto-emails, no
                  drip campaigns. You'll hear from a real person.
                </p>

                <ol className="space-y-5 text-[14px] font-['Inter']">
                  <StepItem
                    n="1"
                    title="We email you"
                    body="Within one business day, with next steps and a few quick questions."
                  />
                  <StepItem
                    n="2"
                    title="Quick call"
                    body="15 minutes — your records, your jurisdiction, what's most painful today."
                  />
                  <StepItem
                    n="3"
                    title="Sandbox set up"
                    body="We provision your parish in a private sandbox so you can try it before any commitment."
                  />
                </ol>

                <div className="mt-10 pt-8 border-t border-white/10 space-y-3">
                  <ContactRow icon={Mail} value="info@orthodoxmetrics.com" />
                  <ContactRow icon={Users} value="One-on-one onboarding only" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ScrollToTop />
    </PageContainer>
  );
};

interface FormFieldProps {
  label: string;
  id: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}

const FormField = ({ label, id, placeholder, value, onChange, type = 'text', required }: FormFieldProps) => (
  <div>
    <label htmlFor={id} className="block font-['Inter'] text-[14px] font-medium text-[#2d1b4e] dark:text-white mb-2">
      {label}
      {required && <span className="text-red-500"> *</span>}
    </label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#2d1b4e] dark:text-white font-['Inter'] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2d1b4e] dark:focus:ring-[#d4af37] focus:border-transparent transition-colors"
    />
  </div>
);

const StepItem = ({ n, title, body }: { n: string; title: string; body: string }) => (
  <li className="flex gap-4">
    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#d4af37] text-[#2d1b4e] flex items-center justify-center font-['Inter'] font-semibold text-[13px]">
      {n}
    </div>
    <div>
      <div className="font-['Inter'] font-medium text-white">{title}</div>
      <div className="font-['Inter'] text-[rgba(255,255,255,0.65)] mt-0.5 leading-relaxed">{body}</div>
    </div>
  </li>
);

const ContactRow = ({ icon: Icon, value }: { icon: any; value: string }) => (
  <div className="flex items-center gap-3 text-[13px] font-['Inter'] text-[rgba(255,255,255,0.85)]">
    <Icon size={16} className="text-[#d4af37]" />
    <span>{value}</span>
  </div>
);

export default Enrollment;
