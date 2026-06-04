import { BookOpen, Search, Shield } from 'lucide-react';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import { useLanguage } from '@/context/LanguageContext';

/** "What We Do" panel — used in homepage highlight carousel */
export function WhatWeDoPanel() {
  const { t } = useLanguage();

  return (
    <>
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] dark:bg-gray-800 px-4 py-2 rounded-full mb-4">
          <EditableText contentKey="intro.badge" as="span" className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">
            {t('home.intro_badge')}
          </EditableText>
        </div>
        <EditableText contentKey="intro.title" as="h2" className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-4">
          {t('home.intro_title')}
        </EditableText>
        <EditableText contentKey="intro.subtitle" as="p" className="font-['Inter'] text-xl text-[#4a5565] dark:text-gray-400 max-w-2xl mx-auto" multiline>
          {t('home.intro_subtitle')}
        </EditableText>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-[#d4af37] dark:to-[#c29d2f] rounded-xl flex items-center justify-center mb-6">
            <BookOpen className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />
          </div>
          <EditableText contentKey="intro.card1.title" as="h3" className="font-['Inter'] font-medium text-2xl text-[#2d1b4e] dark:text-white mb-3">
            {t('home.intro_card1_title')}
          </EditableText>
          <EditableText contentKey="intro.card1.desc" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed" multiline>
            {t('home.intro_card1_desc')}
          </EditableText>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-[#d4af37] rounded-xl flex items-center justify-center mb-6">
            <Search className="text-[#2d1b4e]" size={32} />
          </div>
          <EditableText contentKey="intro.card2.title" as="h3" className="font-['Inter'] font-medium text-2xl text-[#2d1b4e] dark:text-white mb-3">
            {t('home.intro_card2_title')}
          </EditableText>
          <EditableText contentKey="intro.card2.desc" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed" multiline>
            {t('home.intro_card2_desc')}
          </EditableText>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-[#d4af37] dark:to-[#c29d2f] rounded-xl flex items-center justify-center mb-6">
            <Shield className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} />
          </div>
          <EditableText contentKey="intro.card3.title" as="h3" className="font-['Inter'] font-medium text-2xl text-[#2d1b4e] dark:text-white mb-3">
            {t('home.intro_card3_title')}
          </EditableText>
          <EditableText contentKey="intro.card3.desc" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed" multiline>
            {t('home.intro_card3_desc')}
          </EditableText>
        </div>
      </div>
    </>
  );
}

export default WhatWeDoPanel;
