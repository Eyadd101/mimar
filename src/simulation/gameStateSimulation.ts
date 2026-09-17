import { gameStateConfig } from './config'
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
): GameState {
  return {
    status: 'playing',
    simulation: stageStartSnapshot,
    stageStartSnapshot,
    zeroSatisfactionDurationSeconds: 0,
    gameOverReason: null,
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
      simulation,
      zeroSatisfactionDurationSeconds,
    )

    gameState = {
      ...gameState,
      simulation,
      zeroSatisfactionDurationSeconds,
      status: gameOverReason ? 'game-over' : 'playing',
      gameOverReason,
    }

    if (gameOverReason) {
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
  return createInitialGameState(currentState.stageStartSnapshot)
}

export function markStageWon(currentState: GameState): GameState {
  return currentState.status === 'playing'
    ? { ...currentState, status: 'stage-won' }
    : currentState
}

function getGameOverReason(
  simulation: TrafficSimulationState,
  zeroSatisfactionDurationSeconds: number,
) {
  if (simulation.balance === 0) {
    return bankruptcyReason
  }

  if (
    zeroSatisfactionDurationSeconds >=
    gameStateConfig.zeroSatisfactionGracePeriodSeconds
  ) {
    return serviceFailureReason
  }

  return null
}
