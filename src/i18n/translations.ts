export type Language = 'en' | 'ar'

export const languagePreferenceKey = 'cloud-game-language'

const english = {
  'language.english': 'English',
  'language.arabic': 'العربية',
  'language.selector': 'Interface language',
  'app.caption': 'Infrastructure playground',
  'resource.users': 'Users',
  'resource.appServer': 'App Server',
  'resource.database': 'Database',
  'resource.loadBalancer': 'Load Balancer',
  'metric.latency': 'Latency',
  'metric.cpuUsage': 'CPU Usage',
  'metric.requestsPerSecond': 'Requests/sec',
  'node.entryPoint': 'Entry point',
  'node.compute': 'Compute',
  'node.storage': 'Storage',
  'node.trafficRouting': 'Traffic routing',
} as const

export type TranslationKey = keyof typeof english

const arabic: Record<TranslationKey, string> = {
  'language.english': 'English',
  'language.arabic': 'العربية',
  'language.selector': 'لغة الواجهة',
  'app.caption': 'ساحة البنية التحتية',
  'resource.users': 'المستخدمون',
  'resource.appServer': 'خادم التطبيق',
  'resource.database': 'قاعدة البيانات',
  'resource.loadBalancer': 'موازن الأحمال',
  'metric.latency': 'زمن الاستجابة',
  'metric.cpuUsage': 'استخدام المعالج',
  'metric.requestsPerSecond': 'الطلبات في الثانية',
  'node.entryPoint': 'نقطة الدخول',
  'node.compute': 'الحوسبة',
  'node.storage': 'التخزين',
  'node.trafficRouting': 'توجيه حركة البيانات',
}

export const translations: Record<
  Language,
  Record<TranslationKey, string>
> = {
  en: english,
  ar: arabic,
}

type LanguageStorageReader = Pick<Storage, 'getItem'>
type LanguageStorageWriter = Pick<Storage, 'setItem'>

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ar'
}

export function readLanguagePreference(
  storage: LanguageStorageReader | null,
): Language {
  if (!storage) {
    return 'en'
  }

  try {
    const storedLanguage = storage.getItem(languagePreferenceKey)
    return isLanguage(storedLanguage) ? storedLanguage : 'en'
  } catch {
    return 'en'
  }
}

export function writeLanguagePreference(
  language: Language,
  storage: LanguageStorageWriter | null,
) {
  if (!storage) {
    return false
  }

  try {
    storage.setItem(languagePreferenceKey, language)
    return true
  } catch {
    return false
  }
}

export function getEnglishTranslation(key: TranslationKey) {
  return translations.en[key]
}
