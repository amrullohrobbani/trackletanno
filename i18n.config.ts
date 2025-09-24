import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation files
import enTranslation from './locales/en/common.json';
import koTranslation from './locales/ko/common.json';

const resources = {
  en: {
    common: enTranslation,
  },
  ko: {
    common: koTranslation,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    
    ns: ['common'],
    defaultNS: 'common',
    
    // Additional configuration for better stability
    load: 'languageOnly', // Load only the language part (en, ko) not the full locale
    preload: ['en', 'ko'], // Preload both languages
    cleanCode: true, // Clean language codes
    
    // React specific options
    react: {
      useSuspense: false, // Disable suspense to prevent SSR issues
    },
    
    // Backend options for better error handling
    saveMissing: false, // Don't save missing keys
    returnEmptyString: false, // Return key instead of empty string for missing translations
    returnNull: false, // Don't return null for missing keys
    
    // Key separator and nesting
    keySeparator: '.', // Use dots for nested keys
    nsSeparator: false, // Disable namespace separator
  });

export default i18n;
