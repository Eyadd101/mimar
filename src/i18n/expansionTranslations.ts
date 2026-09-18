export const expansionEnglish = {
  'advanced.database': 'Managed Database',
  'advanced.databasePurpose': 'Stores application data. Requests create queries; slow queries add to customer response time.',
  'advanced.queryLoad': 'Query Load',
  'advanced.connections': 'Active Connections',
  'advanced.queryLatency': 'Query Latency',
  'advanced.queryCapacity': 'Query Capacity',
  'advanced.connectionCapacity': 'Connection Capacity',
} as const
export const expansionArabic: Record<keyof typeof expansionEnglish, string> = {
  'advanced.database': 'قاعدة البيانات المُدارة',
  'advanced.databasePurpose': 'تحفظ بيانات التطبيق. الطلبات تولّد استعلامات، وبطؤها يزيد زمن استجابة الخدمة.',
  'advanced.queryLoad': 'حمل الاستعلامات',
  'advanced.connections': 'الاتصالات النشطة',
  'advanced.queryLatency': 'زمن الاستعلام',
  'advanced.queryCapacity': 'سعة الاستعلامات',
  'advanced.connectionCapacity': 'سعة الاتصالات',
}
