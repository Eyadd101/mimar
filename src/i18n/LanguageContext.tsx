import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  readLanguagePreference,
  translations,
  writeLanguagePreference,
  type Language,
} from './translations'
import {
  LanguageContext,
  type LanguageContextValue,
} from './languageContextValue'

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    readLanguagePreference(getBrowserStorage()),
  )

  useEffect(() => {
    writeLanguagePreference(language, getBrowserStorage())
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  const contextValue = useMemo<LanguageContextValue>(
    () => ({
      language,
      direction: language === 'ar' ? 'rtl' : 'ltr',
      setLanguage,
      t: (key) => translations[language][key],
    }),
    [language],
  )

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}
