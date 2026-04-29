import i18n from 'i18next';
2: import { initReactI18next } from 'react-i18next';
3: import LanguageDetector from 'i18next-browser-languagedetector';
4: import { en } from './locales/en';
5: import { fr } from './locales/fr';
6: 
7: const resources = {
8:   en,
9:   fr
10: };
11: 
12: i18n
13:   .use(LanguageDetector)
14:   .use(initReactI18next)
15:   .init({
16:     resources,
17:     fallbackLng: 'en',
18:     interpolation: {
19:       escapeValue: false
20:     }
21:   });
22: 
23: export default i18n;
