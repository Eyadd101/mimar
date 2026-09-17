import type { StageConfig } from '../data/stages'
import {
  getObjectiveProgressLabel,
  type StageObjectiveProgress,
} from '../simulation/stageObjectiveSimulation'

type StageObjectivePanelProps = {
  stage: StageConfig
  progress: StageObjectiveProgress
}

export function StageObjectivePanel({
  stage,
  progress,
}: StageObjectivePanelProps) {
  return (
    <aside className="stage-objectives nodrag nopan" aria-label="Stage objectives">
      <div className="stage-objectives__heading">
        <span>Stage {stage.sequence}</span>
        <strong>{stage.name}</strong>
      </div>
      <p className="stage-objectives__briefing">{stage.storyBriefing}</p>
      <ObjectiveRow
        label="Primary"
        objective={stage.primaryObjective}
        progress={progress[stage.primaryObjective.id]}
      />
      {stage.secondaryObjectives.map((objective) => (
        <ObjectiveRow
          key={objective.id}
          label="Optional"
          objective={objective}
          progress={progress[objective.id]}
        />
      ))}
    </aside>
  )
}

type ObjectiveRowProps = {
  label: string
  objective: StageConfig['primaryObjective']
  progress: StageObjectiveProgress[string] | undefined
}

function ObjectiveRow({ label, objective, progress }: ObjectiveRowProps) {
  if (!progress) {
    return null
  }

  return (
    <div className="stage-objectives__item" data-complete={progress.completed}>
      <span className="stage-objectives__check" aria-hidden="true">
        {progress.completed ? '✓' : '·'}
      </span>
      <div>
        <small>{label}</small>
        <p>{objective.title}</p>
        <span>{getObjectiveProgressLabel(objective, progress)}</span>
      </div>
    </div>
  )
}
