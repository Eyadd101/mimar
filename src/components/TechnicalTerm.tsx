import { getEnglishTranslation, type TranslationKey } from '../i18n/translations'
import { useLanguage } from '../i18n/useLanguage'

type TechnicalTermProps = {
  translationKey: TranslationKey
}

export function TechnicalTerm({ translationKey }: TechnicalTermProps) {
  const { language, t } = useLanguage()

  return (
    <span className="technical-term">
      <span>{t(translationKey)}</span>
      {language === 'ar' && (
        <small lang="en" dir="ltr">
          {getEnglishTranslation(translationKey)}
        </small>
      )}
    </span>
  )
}
