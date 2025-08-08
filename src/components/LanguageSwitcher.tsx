'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-400">{t('ui.language')}:</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="en">{t('ui.english')}</option>
        <option value="ko">{t('ui.korean')}</option>
      </select>
    </div>
  );
}
