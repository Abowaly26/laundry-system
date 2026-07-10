import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationAR from './locales/ar.json';
import translationEN from './locales/en.json';

const resources = {
  ar: {
    translation: translationAR
  },
  en: {
    translation: translationEN
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar', // Default to Arabic
    interpolation: {
      escapeValue: false // React already escapes by default
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

// Setup dynamic document direction based on language
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = i18n.dir(lng);
  document.documentElement.lang = lng;
  
  if (lng === 'en') {
    document.documentElement.classList.add('ltr');
  } else {
    document.documentElement.classList.remove('ltr');
  }
});

// Initial load
document.documentElement.dir = i18n.dir(i18n.language);
document.documentElement.lang = i18n.language;
if (i18n.language === 'en') document.documentElement.classList.add('ltr');

export default i18n;
