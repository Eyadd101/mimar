import type { StageOneBuildStep } from '../simulation/stageOneOnboardingSimulation'
import { useLanguage } from '../i18n/useLanguage'
import { getEnglishTranslation } from '../i18n/translations'

type GuidedBuildPanelProps = {
  step: StageOneBuildStep
}

export function GuidedBuildPanel({ step }: GuidedBuildPanelProps) {
  const { language, t } = useLanguage()

  return (
    <aside
      className="guided-build nodrag nopan"
      aria-live="polite"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="guided-build__progress">
        <span>{t('stage.guidedBuild')}</span>
        <strong>
          {step.stepNumber} / {step.totalSteps}
        </strong>
      </div>
      <h2>{t(step.titleKey)}</h2>
      {language === 'ar' && (
        <span className="guided-build__english" lang="en" dir="ltr">
          {getEnglishTranslation(step.titleKey)}
        </span>
      )}
      <p>{t(step.explanationKey)}</p>
      <small>{t('stage.pressureStartsAfterBuild')}</small>
    </aside>
  )
}
