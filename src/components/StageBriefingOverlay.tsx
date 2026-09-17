import { useState } from 'react'
import type { StageConfig } from '../data/stages'

type StageBriefingOverlayProps = {
  stage: StageConfig
  onBeginStage: () => void
}

export function StageBriefingOverlay({
  stage,
  onBeginStage,
}: StageBriefingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = stage.tutorialSteps[stepIndex]

  if (!step) {
    return null
  }

  const finalStep = stepIndex === stage.tutorialSteps.length - 1

  return (
    <div className="stage-briefing-overlay" role="dialog" aria-modal="true">
      <section className="stage-briefing-card">
        <p className="stage-briefing-card__eyebrow">
          Stage {stage.sequence} · {stage.name}
        </p>
        <h2>{step.title}</h2>
        <p>{step.message}</p>
        <div className="stage-briefing-card__footer">
          <span>
            {stepIndex + 1} / {stage.tutorialSteps.length}
          </span>
          <button
            type="button"
            onClick={() =>
              finalStep ? onBeginStage() : setStepIndex(stepIndex + 1)
            }
          >
            {finalStep ? 'Begin Stage' : 'Next'}
          </button>
        </div>
      </section>
    </div>
  )
}
