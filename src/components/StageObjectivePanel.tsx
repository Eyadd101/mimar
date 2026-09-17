import type { StageConfig } from '../data/stages'
import {
  getObjectiveProgressLabel,
  type StageObjectiveProgress,
} from '../simulation/stageObjectiveSimulation'
import { useLanguage } from '../i18n/useLanguage'
import type { StageLearningStepProgress } from '../simulation/stageLearningSimulation'

type StageObjectivePanelProps = {
  stage: StageConfig
  progress: StageObjectiveProgress
  learningProgress: StageLearningStepProgress[]
  serviceStarted: boolean
}

export function StageObjectivePanel({
  stage,
  progress,
  learningProgress,
  serviceStarted,
}: StageObjectivePanelProps) {
  const { language, t } = useLanguage()
  const primaryProgress = progress[stage.primaryObjective.id]
  const primaryProgressPercent = primaryProgress
    ? Math.min(Math.round((primaryProgress.current / primaryProgress.target) * 100), 100)
    : 0

  return (
    <aside className="stage-objectives nodrag nopan" aria-label="Stage objectives">
      <div className="stage-objectives__heading">
        <span>{t('stage.label')} {stage.sequence}</span>
        <strong>{stage.name}</strong>
      </div>
      <p className="stage-objectives__briefing">{stage.storyBriefing}</p>
      {stage.learningSteps.length > 0 && (
        <div className="stage-learning">
          <div className="stage-learning__heading">
            <span>{t('stage.learningPath')}</span>
            <strong>
              {learningProgress.filter((step) => step.completed).length} /{' '}
              {stage.learningSteps.length}
            </strong>
          </div>
          <ol data-service-started={serviceStarted}>
            {stage.learningSteps.map((step, index) => {
              const stepProgress = learningProgress.find(
                (item) => item.id === step.id,
              )
              return (
                <li key={step.id} data-complete={stepProgress?.completed}>
                  <span aria-hidden="true">
                    {stepProgress?.completed ? '✓' : index + 1}
                  </span>
                  <p>{language === 'ar' ? step.arabicTitle : step.title}</p>
                </li>
              )
            })}
          </ol>
        </div>
      )}
      <div className="stage-objectives__progress">
        <div>
          <span>{t('stage.winProgress')}</span>
          <strong>{primaryProgressPercent}%</strong>
        </div>
        <div
          role="progressbar"
          aria-label="Primary objective progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={primaryProgressPercent}
        >
          <span style={{ width: `${primaryProgressPercent}%` }} />
        </div>
      </div>
      <ObjectiveRow
        label={t('stage.primary')}
        objective={stage.primaryObjective}
        progress={progress[stage.primaryObjective.id]}
      />
      {stage.secondaryObjectives.map((objective) => (
        <ObjectiveRow
          key={objective.id}
          label={t('stage.optional')}
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
