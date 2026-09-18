import { createContext } from 'react'
import type {
  Language,
  TranslationKey,
  TranslationVariables,
} from './translations'

export type LanguageContextValue = {
  language: Language
  direction: 'ltr' | 'rtl'
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, variables?: TranslationVariables) => string
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)
