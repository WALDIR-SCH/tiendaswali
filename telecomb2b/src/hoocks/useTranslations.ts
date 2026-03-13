// src/hooks/useTranslations.ts
import { useLanguage } from '@/context/LanguageContext';

export function useTranslations() {
  const { t, language, setLanguage } = useLanguage();
  
  return {
    t,
    language,
    setLanguage
  };
}














// // src/hooks/useTranslations.ts
// import { useLanguage } from '@/context/LanguageContext';

// export function useTranslations() {
//   const { t, language, setLanguage } = useLanguage();
  
//   // Traducciones específicas para cada página
//   const pageTranslations = {
//     profile: {
//       title: t('profile'),
//       // ... más traducciones específicas de perfil
//     },
//     catalog: {
//       title: t('catalog'),
//       // ... más traducciones específicas de catálogo
//     }
//     // ... etc
//   };

//   return {
//     t,
//     language,
//     setLanguage,
//     translations: pageTranslations
//   };
// }