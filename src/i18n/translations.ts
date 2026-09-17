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
  'metric.activeUsers': 'Active Users',
  'metric.satisfaction': 'Customer Satisfaction',
  'metric.balance': 'Balance',
  'metric.revenue': 'Revenue',
  'metric.infrastructureCost': 'Infrastructure Cost',
  'metric.netCashFlow': 'Net Cash Flow',
  'metric.memoryUsage': 'Memory Usage',
  'metric.requestCapacity': 'Request Capacity',
  'metric.currentTraffic': 'Current Traffic',
  'metric.currentTier': 'Current Tier',
  'metric.status': 'Status',
  'metric.gameTime': 'Game Time',
  'campaign.new': 'New Campaign',
  'campaign.continue': 'Continue Campaign',
  'campaign.title': 'Build your startup infrastructure',
  'campaign.description': 'Observe demand, diagnose failures, and evolve one infrastructure across a connected campaign.',
  'campaign.saveUnavailable': 'Saved campaign unavailable',
  'campaign.saveReset': 'Start a new campaign to reset it.',
  'stage.label': 'Stage',
  'stage.primary': 'Primary',
  'stage.optional': 'Optional',
  'stage.winProgress': 'Win progress',
  'status.normal': 'Normal',
  'status.elevated': 'Elevated',
  'status.high': 'High',
  'status.overloaded': 'Overloaded',
  'action.upgrade': 'Upgrade',
  'action.pause': 'Pause',
  'action.hint': 'Hint',
  'action.continueNextStage': 'Continue to Next Stage',
  'game.gameOver': 'Game Over',
  'game.stageComplete': 'Stage Complete',
  'resource.details': 'Resource details',
  'resource.name': 'Resource name',
  'resource.genericType': 'Generic type',
  'resource.awsReference': 'AWS reference',
  'resource.costPerPeriod': 'Cost / period',
  'resource.moreDetailsLater': 'More resource details will be added in a later step.',
  'resource.upgradeMedium': 'Upgrade to Medium Server',
  'resource.mediumActive': 'Medium Server is active.',
  'resource.insufficientBalance': 'Insufficient balance',
  'resource.availableBalance': 'Available balance',
  'resource.deploymentRemaining': 'game seconds remaining',
  'resource.anotherUpgrade': 'Another upgrade is deploying',
  'resource.connectedServers': 'Connected servers',
  'resource.distribution': 'Distribution',
  'resource.evenSplit': 'Even split',
  'hint.system': 'System hint',
  'common.close': 'Close',
  'common.next': 'Next',
  'stage.begin': 'Begin Stage',
  'palette.title': 'Resource palette',
  'palette.available': 'Available resources',
  'palette.add': 'Add to canvas',
  'palette.added': 'Added',
  'palette.followGuide': 'Follow the guide',
  'education.meaning': 'What it means',
  'education.increases': 'Can increase because',
  'education.decreases': 'Can decrease because',
  'education.currentReason': 'Current reason',
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
  'metric.activeUsers': 'المستخدمون النشطون',
  'metric.satisfaction': 'رضا العملاء',
  'metric.balance': 'الرصيد',
  'metric.revenue': 'الإيرادات',
  'metric.infrastructureCost': 'تكلفة البنية التحتية',
  'metric.netCashFlow': 'صافي التدفق النقدي',
  'metric.memoryUsage': 'استخدام الذاكرة',
  'metric.requestCapacity': 'سعة الطلبات',
  'metric.currentTraffic': 'حركة الطلبات الحالية',
  'metric.currentTier': 'الفئة الحالية',
  'metric.status': 'الحالة',
  'metric.gameTime': 'وقت اللعبة',
  'campaign.new': 'حملة جديدة',
  'campaign.continue': 'متابعة الحملة',
  'campaign.title': 'ابنِ البنية التحتية لشركتك الناشئة',
  'campaign.description': 'راقب الطلب، وشخّص الأعطال، وطوّر بنية تحتية واحدة خلال حملة مترابطة.',
  'campaign.saveUnavailable': 'الحملة المحفوظة غير متاحة',
  'campaign.saveReset': 'ابدأ حملة جديدة لإعادة ضبطها.',
  'stage.label': 'المرحلة',
  'stage.primary': 'أساسي',
  'stage.optional': 'اختياري',
  'stage.winProgress': 'تقدم الفوز',
  'status.normal': 'طبيعي',
  'status.elevated': 'مرتفع',
  'status.high': 'عالٍ',
  'status.overloaded': 'حمل زائد',
  'action.upgrade': 'ترقية',
  'action.pause': 'إيقاف مؤقت',
  'action.hint': 'تلميح',
  'action.continueNextStage': 'المتابعة إلى المرحلة التالية',
  'game.gameOver': 'انتهت اللعبة',
  'game.stageComplete': 'اكتملت المرحلة',
  'resource.details': 'تفاصيل المورد',
  'resource.name': 'اسم المورد',
  'resource.genericType': 'النوع العام',
  'resource.awsReference': 'مرجع AWS',
  'resource.costPerPeriod': 'التكلفة / الفترة',
  'resource.moreDetailsLater': 'ستُضاف تفاصيل أخرى عن المورد في خطوة لاحقة.',
  'resource.upgradeMedium': 'الترقية إلى خادم متوسط',
  'resource.mediumActive': 'الخادم المتوسط يعمل الآن.',
  'resource.insufficientBalance': 'الرصيد غير كافٍ',
  'resource.availableBalance': 'الرصيد المتاح',
  'resource.deploymentRemaining': 'ثانية لعب متبقية',
  'resource.anotherUpgrade': 'هناك ترقية أخرى قيد النشر',
  'resource.connectedServers': 'الخوادم المتصلة',
  'resource.distribution': 'التوزيع',
  'resource.evenSplit': 'توزيع متساوٍ',
  'hint.system': 'تلميح النظام',
  'common.close': 'إغلاق',
  'common.next': 'التالي',
  'stage.begin': 'ابدأ المرحلة',
  'palette.title': 'مكتبة الموارد',
  'palette.available': 'الموارد المتاحة',
  'palette.add': 'أضف إلى اللوحة',
  'palette.added': 'تمت الإضافة',
  'palette.followGuide': 'اتبع الدليل',
  'education.meaning': 'ماذا يعني',
  'education.increases': 'قد يرتفع بسبب',
  'education.decreases': 'قد ينخفض بسبب',
  'education.currentReason': 'السبب الحالي',
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
