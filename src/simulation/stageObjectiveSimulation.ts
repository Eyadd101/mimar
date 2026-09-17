import type {
  StageConfig,
  StageObjectiveDefinition,
} from '../data/stages'
import type { TrafficSimulationState } from './trafficSimulation'

export type ObjectiveProgress = {
  completed: boolean
  current: number
  target: number
}

export type StageObjectiveProgress = Record<string, ObjectiveProgress>

type ObjectiveEvaluationContext = {
  completedEventIds?: readonly string[]
}

export function createStageObjectiveProgress(
  stage: StageConfig,
): StageObjectiveProgress {
  return Object.fromEntries(
    getAllObjectives(stage).map((objective) => [
      objective.id,
      createObjectiveProgress(objective),
    ]),
  )
}

export function advanceStageObjectives(
  stage: StageConfig,
  currentProgress: StageObjectiveProgress,
  simulation: TrafficSimulationState,
  context: ObjectiveEvaluationContext = {},
): StageObjectiveProgress {
  return Object.fromEntries(
    getAllObjectives(stage).map((objective) => [
      objective.id,
      evaluateObjective(
        objective,
        currentProgress[objective.id] ?? createObjectiveProgress(objective),
        stage.minimumSurvivalDurationSeconds,
        simulation,
        context,
      ),
    ]),
  )
}

export function isStageComplete(
  stage: StageConfig,
  progress: StageObjectiveProgress,
) {
  return stage.winCondition.requiredObjectiveIds.every(
    (objectiveId) => progress[objectiveId]?.completed,
  )
}

export function getObjectiveProgressLabel(
  objective: StageObjectiveDefinition,
  progress: ObjectiveProgress,
) {
  switch (objective.type) {
    case 'survive-duration':
    case 'maintain-satisfaction':
    case 'maintain-latency':
      return `${Math.floor(progress.current)} / ${progress.target}s`
    case 'finish-satisfaction':
      return `${progress.current.toFixed(1)}% / ${progress.target}%`
    case 'finish-balance':
      return `${progress.current.toFixed(1)} / ${progress.target} cr`
    case 'handle-traffic-event':
      return progress.completed ? 'Handled' : 'Pending'
  }
}

function getAllObjectives(stage: StageConfig) {
  return [stage.primaryObjective, ...stage.secondaryObjectives]
}

function createObjectiveProgress(
  objective: StageObjectiveDefinition,
): ObjectiveProgress {
  switch (objective.type) {
    case 'survive-duration':
    case 'maintain-satisfaction':
    case 'maintain-latency':
      return {
        completed: false,
        current: 0,
        target: objective.durationSeconds,
      }
    case 'finish-satisfaction':
      return {
        completed: false,
        current: 0,
        target: objective.minimumSatisfaction,
      }
    case 'finish-balance':
      return {
        completed: false,
        current: 0,
        target: objective.minimumBalance,
      }
    case 'handle-traffic-event':
      return { completed: false, current: 0, target: 1 }
  }
}

function evaluateObjective(
  objective: StageObjectiveDefinition,
  currentProgress: ObjectiveProgress,
  minimumSurvivalDurationSeconds: number,
  simulation: TrafficSimulationState,
  context: ObjectiveEvaluationContext,
): ObjectiveProgress {
  switch (objective.type) {
    case 'survive-duration': {
      const current = Math.min(
        simulation.gameTimeSeconds,
        objective.durationSeconds,
      )
      return {
        completed: current >= objective.durationSeconds,
        current,
        target: objective.durationSeconds,
      }
    }
    case 'finish-satisfaction':
      return {
        completed:
          simulation.gameTimeSeconds >= minimumSurvivalDurationSeconds &&
          simulation.customerSatisfaction >= objective.minimumSatisfaction,
        current: simulation.customerSatisfaction,
        target: objective.minimumSatisfaction,
      }
    case 'finish-balance':
      return {
        completed:
          simulation.gameTimeSeconds >= minimumSurvivalDurationSeconds &&
          simulation.balance >= objective.minimumBalance,
        current: simulation.balance,
        target: objective.minimumBalance,
      }
    case 'maintain-satisfaction': {
      const current =
        simulation.customerSatisfaction >= objective.minimumSatisfaction
          ? Math.min(currentProgress.current + 1, objective.durationSeconds)
          : 0
      return {
        completed: current >= objective.durationSeconds,
        current,
        target: objective.durationSeconds,
      }
    }
    case 'maintain-latency': {
      const current =
        simulation.applicationLatencyMs <= objective.maximumLatencyMs
          ? Math.min(currentProgress.current + 1, objective.durationSeconds)
          : 0
      return {
        completed: current >= objective.durationSeconds,
        current,
        target: objective.durationSeconds,
      }
    }
    case 'handle-traffic-event': {
      const completed =
        context.completedEventIds?.includes(objective.eventId) ?? false
      return {
        completed,
        current: completed ? 1 : 0,
        target: 1,
      }
    }
  }
}
