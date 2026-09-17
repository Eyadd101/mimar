import { prototypeStageConfig, type StageConfig } from '../data/stages'
import {
  advanceStageObjectives,
  createStageObjectiveProgress,
  isStageComplete,
  type StageObjectiveProgress,
} from './stageObjectiveSimulation'
import {
  calculateStageRating,
  type StageRating,
} from './starRatingSimulation'
import {
  advanceTrafficSimulation,
  createInitialTrafficState,
  startServerUpgrade,
  type TrafficSimulationState,
} from './trafficSimulation'

export type GameStatus = 'playing' | 'stage-won' | 'game-over'
export type GameOverReasonCode = 'bankruptcy' | 'service-failure'

export type GameOverReason = {
  code: GameOverReasonCode
  title: string
  message: string
}

export type GameState = {
  status: GameStatus
  simulation: TrafficSimulationState
  stageStartSnapshot: TrafficSimulationState
  zeroSatisfactionDurationSeconds: number
  gameOverReason: GameOverReason | null
  stage: StageConfig
  objectiveProgress: StageObjectiveProgress
  stageRating: StageRating | null
}

const bankruptcyReason: GameOverReason = {
  code: 'bankruptcy',
  title: 'Bankruptcy',
  message: 'Your company can no longer pay its infrastructure costs.',
}

const serviceFailureReason: GameOverReason = {
  code: 'service-failure',
  title: 'Service Failure',
  message: 'Customer satisfaction remained at 0% for too long.',
}

export function createInitialGameState(
  stageStartSnapshot = createInitialTrafficState(),
  stage = prototypeStageConfig,
): GameState {
  return {
    status: 'playing',
    simulation: stageStartSnapshot,
    stageStartSnapshot,
    zeroSatisfactionDurationSeconds: 0,
    gameOverReason: null,
    stage,
    objectiveProgress: createStageObjectiveProgress(stage),
    stageRating: null,
  }
}

export function advanceGameState(
  currentState: GameState,
  elapsedGameSeconds = 1,
): GameState {
  if (currentState.status !== 'playing') {
    return currentState
  }

  let gameState = currentState

  for (let elapsed = 0; elapsed < elapsedGameSeconds; elapsed += 1) {
    const simulation = advanceTrafficSimulation(gameState.simulation, 1)
    const zeroSatisfactionDurationSeconds =
      simulation.customerSatisfaction === 0
        ? gameState.zeroSatisfactionDurationSeconds + 1
        : 0
    const gameOverReason = getGameOverReason(
      gameState.stage,
      simulation,
      zeroSatisfactionDurationSeconds,
    )
    const objectiveProgress = advanceStageObjectives(
      gameState.stage,
      gameState.objectiveProgress,
      simulation,
    )
    const stageWon =
      !gameOverReason &&
      isStageComplete(gameState.stage, objectiveProgress)
    const stageRating = stageWon
      ? calculateStageRating(
          gameState.stage,
          simulation,
          objectiveProgress,
        )
      : null

    gameState = {
      ...gameState,
      simulation,
      zeroSatisfactionDurationSeconds,
      status: gameOverReason
        ? 'game-over'
        : stageWon
          ? 'stage-won'
          : 'playing',
      gameOverReason,
      objectiveProgress,
      stageRating,
    }

    if (gameOverReason || stageWon) {
      break
    }
  }

  return gameState
}

export function beginServerUpgrade(currentState: GameState): GameState {
  if (currentState.status !== 'playing') {
    return currentState
  }

  const simulation = startServerUpgrade(currentState.simulation)

  return simulation === currentState.simulation
    ? currentState
    : { ...currentState, simulation }
}

export function restartStage(currentState: GameState): GameState {
  return createInitialGameState(
    currentState.stageStartSnapshot,
    currentState.stage,
  )
}

function getGameOverReason(
  stage: StageConfig,
  simulation: TrafficSimulationState,
  zeroSatisfactionDurationSeconds: number,
) {
  const bankruptcyEnabled = stage.failureConditions.some(
    (condition) => condition.type === 'balance-zero',
  )
  if (bankruptcyEnabled && simulation.balance === 0) {
    return bankruptcyReason
  }

  const satisfactionFailure = stage.failureConditions.find(
    (condition) => condition.type === 'satisfaction-zero-grace',
  )
  if (
    satisfactionFailure?.type === 'satisfaction-zero-grace' &&
    zeroSatisfactionDurationSeconds >= satisfactionFailure.gracePeriodSeconds
  ) {
    return serviceFailureReason
  }

  return null
}
