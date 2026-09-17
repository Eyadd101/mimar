import type { StageOneBuildStep } from '../simulation/stageOneOnboardingSimulation'
import { useLanguage } from '../i18n/useLanguage'

type GuidedBuildPanelProps = {
  step: StageOneBuildStep
}

export function GuidedBuildPanel({ step }: GuidedBuildPanelProps) {
  const { language, t } = useLanguage()

  return (
    <aside className="guided-build nodrag nopan" aria-live="polite">
      <div className="guided-build__progress">
        <span>{t('stage.guidedBuild')}</span>
        <strong>
          {step.stepNumber} / {step.totalSteps}
        </strong>
      </div>
      <h2>{language === 'ar' ? step.arabicTitle : step.title}</h2>
      {language === 'ar' && <span className="guided-build__english">{step.title}</span>}
      <p>{language === 'ar' ? step.arabicExplanation : step.explanation}</p>
      <small>{t('stage.pressureStartsAfterBuild')}</small>
    </aside>
  )
}
