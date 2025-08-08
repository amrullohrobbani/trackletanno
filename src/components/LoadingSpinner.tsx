'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LoadingSpinner() {
  const { t } = useLanguage();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-white font-medium">{t('ui.loading')}</div>
        <div className="text-gray-400 text-sm mt-1">{t('ui.processingData')}</div>
      </div>
    </div>
  );
}
