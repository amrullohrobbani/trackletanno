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
  });

export default i18n;
