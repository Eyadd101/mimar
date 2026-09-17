import type { StageOneBuildStep } from '../simulation/stageOneOnboardingSimulation'

type GuidedBuildPanelProps = {
  step: StageOneBuildStep
}

export function GuidedBuildPanel({ step }: GuidedBuildPanelProps) {
  return (
    <aside className="guided-build nodrag nopan" aria-live="polite">
      <div className="guided-build__progress">
        <span>Guided build</span>
        <strong>
          {step.stepNumber} / {step.totalSteps}
        </strong>
      </div>
      <h2>{step.title}</h2>
      <p>{step.explanation}</p>
      <small>Traffic and financial pressure begin after the path is complete.</small>
    </aside>
  )
}
