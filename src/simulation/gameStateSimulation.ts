import {
  campaignStageConfigs,
  getCampaignStage,
  type StageConfig,
} from '../data/stages'
import {
  createInitialCampaignState,
  createNextCampaignState,
  getPrimaryAppServer,
  syncCampaignWithSimulation,
  updateResourcePosition,
  type CampaignState,
} from './campaignSimulation'
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
import {
  advanceStageTrafficEvents,
  createStageTrafficEvents,
  getActiveTrafficMultiplier,
  getCompletedTrafficEventIds,
  type StageTrafficEventRuntime,
} from './trafficEventSimulation'

export type GameStatus = 'playing' | 'stage-won' | 'game-over'
export type GameOverReasonCode = 'bankruptcy' | 'service-failure'

export type GameOverReason = {
  code: GameOverReasonCode
  title: string
  message: string
}

export type StageRuntimeState = {
  status: GameStatus
  simulation: TrafficSimulationState
  zeroSatisfactionDurationSeconds: number
  gameOverReason: GameOverReason | null
  objectiveProgress: StageObjectiveProgress
  stageRating: StageRating | null
  briefingDismissed: boolean
  trafficEvents: StageTrafficEventRuntime
}

export type GameState = {
  campaign: CampaignState
  stageRuntime: StageRuntimeState
  stageStartSnapshot: CampaignState
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
  campaign = createInitialCampaignState(),
): GameState {
  return {
    campaign,
    stageRuntime: createStageRuntime(campaign),
    stageStartSnapshot: campaign,
  }
}

export function getCurrentStage(gameState: GameState) {
  const stage = getCampaignStage(gameState.campaign.currentStageIndex)

  if (!stage) {
    throw new Error('Campaign stage configuration is missing.')
  }

  return stage
}

export function hasNextCampaignStage(gameState: GameState) {
  return (
    gameState.campaign.currentStageIndex + 1 < campaignStageConfigs.length
  )
}

export function advanceGameState(
  currentState: GameState,
  elapsedGameSeconds = 1,
): GameState {
  if (
    currentState.stageRuntime.status !== 'playing' ||
    !currentState.stageRuntime.briefingDismissed
  ) {
    return currentState
  }

  let gameState = currentState

  for (let elapsed = 0; elapsed < elapsedGameSeconds; elapsed += 1) {
    gameState = advanceOneGameSecond(gameState)

    if (gameState.stageRuntime.status !== 'playing') {
      break
    }
  }

  return gameState
}

export function beginServerUpgrade(currentState: GameState): GameState {
  if (currentState.stageRuntime.status !== 'playing') {
    return currentState
  }

  const simulation = startServerUpgrade(
    currentState.stageRuntime.simulation,
  )

  if (simulation === currentState.stageRuntime.simulation) {
    return currentState
  }

  return {
    ...currentState,
    campaign: syncCampaignWithSimulation(currentState.campaign, simulation),
    stageRuntime: { ...currentState.stageRuntime, simulation },
  }
}

export function dismissStageBriefing(currentState: GameState): GameState {
  if (currentState.stageRuntime.briefingDismissed) {
    return currentState
  }

  return {
    ...currentState,
    stageRuntime: {
      ...currentState.stageRuntime,
      briefingDismissed: true,
    },
  }
}

export function moveCampaignResource(
  currentState: GameState,
  resourceId: string,
  position: { x: number; y: number },
): GameState {
  return {
    ...currentState,
    campaign: updateResourcePosition(
      currentState.campaign,
      resourceId,
      position,
    ),
  }
}

export function restartStage(currentState: GameState): GameState {
  return createInitialGameState(currentState.stageStartSnapshot)
}

export function continueToNextStage(currentState: GameState): GameState {
  if (
    currentState.stageRuntime.status !== 'stage-won' ||
    !currentState.stageRuntime.stageRating ||
    !hasNextCampaignStage(currentState)
  ) {
    return currentState
  }

  const stage = getCurrentStage(currentState)
  const campaign = createNextCampaignState(
    currentState.campaign,
    stage.id,
    currentState.stageRuntime.stageRating,
  )

  return createInitialGameState(campaign)
}

function createStageRuntime(campaign: CampaignState): StageRuntimeState {
  const stage = getCampaignStage(campaign.currentStageIndex)
  if (!stage) {
    throw new Error('Campaign stage configuration is missing.')
  }

  const appServer = getPrimaryAppServer(campaign)

  return {
    status: 'playing',
    simulation: createInitialTrafficState({
      tierId: appServer.tierId,
      balance: campaign.balance,
      trafficProfile: stage.trafficProfile,
    }),
    zeroSatisfactionDurationSeconds: 0,
    gameOverReason: null,
    objectiveProgress: createStageObjectiveProgress(stage),
    stageRating: null,
    briefingDismissed: stage.tutorialSteps.length === 0,
    trafficEvents: createStageTrafficEvents(stage, campaign.seed),
  }
}

function advanceOneGameSecond(currentState: GameState): GameState {
  const stage = getCurrentStage(currentState)
  const nextGameTimeSeconds =
    currentState.stageRuntime.simulation.gameTimeSeconds + 1
  const trafficEvents = advanceStageTrafficEvents(
    stage,
    currentState.stageRuntime.trafficEvents,
    nextGameTimeSeconds,
  )
  const simulation = advanceTrafficSimulation(
    currentState.stageRuntime.simulation,
    1,
    stage.trafficProfile,
    getActiveTrafficMultiplier(trafficEvents),
  )
  const campaign = syncCampaignWithSimulation(
    currentState.campaign,
    simulation,
  )
  const zeroSatisfactionDurationSeconds =
    simulation.customerSatisfaction === 0
      ? currentState.stageRuntime.zeroSatisfactionDurationSeconds + 1
      : 0
  const gameOverReason = getGameOverReason(
    stage,
    simulation,
    zeroSatisfactionDurationSeconds,
  )
  const objectiveProgress = advanceStageObjectives(
    stage,
    currentState.stageRuntime.objectiveProgress,
    simulation,
    {
      completedEventIds: getCompletedTrafficEventIds(trafficEvents),
    },
  )
  const stageWon =
    !gameOverReason && isStageComplete(stage, objectiveProgress)
  const stageRating = stageWon
    ? calculateStageRating(stage, simulation, objectiveProgress)
    : null

  return {
    ...currentState,
    campaign,
    stageRuntime: {
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
      briefingDismissed: currentState.stageRuntime.briefingDismissed,
      trafficEvents,
    },
  }
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
