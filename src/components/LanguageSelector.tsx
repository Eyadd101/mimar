import { useLanguage } from '../i18n/useLanguage'

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <label className="language-selector">
      <span>{t('language.selector')}</span>
      <select
        value={language}
        onChange={(event) =>
          setLanguage(event.target.value === 'ar' ? 'ar' : 'en')
        }
      >
        <option value="en">English</option>
        <option value="ar">العربية</option>
      </select>
    </label>
  )
}
