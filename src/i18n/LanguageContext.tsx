import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  readLanguagePreference,
  translate,
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
    document.title = translate(language, 'app.pageTitle')
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute(
      'content',
      translate(language, 'app.metaDescription'),
    )
    // The graph uses a stable left-to-right coordinate system. Individual
    // Arabic text surfaces opt into RTL without mirroring the application.
    document.documentElement.dir = 'ltr'
  }, [language])

  const contextValue = useMemo<LanguageContextValue>(
    () => ({
      language,
      direction: language === 'ar' ? 'rtl' : 'ltr',
      setLanguage,
      t: (key, variables) => translate(language, key, variables),
    }),
    [language],
  )

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}
