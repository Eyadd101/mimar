import { useId, useState } from 'react'
import type { StageConfig } from '../data/stages'
import { useLanguage } from '../i18n/useLanguage'

type StageBriefingOverlayProps = {
  stage: StageConfig
  onBeginStage: () => void
}

export function StageBriefingOverlay({
  stage,
  onBeginStage,
}: StageBriefingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const { direction, t } = useLanguage()
  const titleId = useId()
  const descriptionId = useId()
  const step = stage.tutorialSteps[stepIndex]

  if (!step) {
    return null
  }

  const finalStep = stepIndex === stage.tutorialSteps.length - 1

  return (
    <div
      className="stage-briefing-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <section className="stage-briefing-card" dir={direction}>
        <p className="stage-briefing-card__eyebrow">
          {t('stage.label')} {stage.sequence} · {t(stage.nameKey)}
        </p>
        <h2 id={titleId}>{t(step.titleKey)}</h2>
        <p id={descriptionId}>{t(step.messageKey)}</p>
        <div className="stage-briefing-card__footer">
          <span>
            {stepIndex + 1} / {stage.tutorialSteps.length}
          </span>
          <button
            type="button"
            autoFocus
            onClick={() =>
              finalStep ? onBeginStage() : setStepIndex(stepIndex + 1)
            }
          >
            {finalStep ? t('stage.begin') : t('common.next')}
          </button>
        </div>
      </section>
    </div>
  )
}
