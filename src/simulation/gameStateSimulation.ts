import { advanceSecurity, secureSettings, type SecurityRisk } from './securitySimulation'
import { advancedResourceConfigs, type AdvancedResourceType, databaseUpgradeConfig } from './expansionConfig'
import {
  campaignStageConfigs,
  getCampaignStage,
  type StageConfig,
} from '../data/stages'
import {
  addAdditionalAppServerResource,
  addAdvancedResource,
  addLoadBalancerResource,
  addStageOneConnection,
  addStageOneResource,
  applyResourceUnlocks,
  createInitialCampaignState,
  createNextCampaignState,
  createTrafficInfrastructure,
  hasLoadBalancer,
  hasOperationalServicePath,
  syncCampaignWithSimulation,
  updateResourcePositions,
  type CampaignResourceType,
  type CampaignState,
} from './campaignSimulation'
import {
  additionalAppServerConfig,
  loadBalancerResourceConfig,
} from './config'
import { canAffordCost, deductCost } from './economySimulation'
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
import {
  advanceStageStatistics,
  createInitialStageStatistics,
  type StageStatistics,
} from './stageStatisticsSimulation'

export type GameStatus = 'playing' | 'stage-won' | 'game-over'
export type GameOverReasonCode = 'bankruptcy' | 'service-failure'

export type GameOverReason = {
  code: GameOverReasonCode
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
  infrastructureDeployment: InfrastructureDeployment | null
  statistics: StageStatistics
  serviceStarted: boolean
}

export type InfrastructureDeployment = {
  kind: 'load-balancer' | 'app-server' | 'database-upgrade' | AdvancedResourceType
  startedAtGameTimeSeconds: number
  completesAtGameTimeSeconds: number
  cost: number
}

export type GameState = {
  campaign: CampaignState
  stageRuntime: StageRuntimeState
  stageStartSnapshot: CampaignState
}

const bankruptcyReason: GameOverReason = {
  code: 'bankruptcy',
}

const serviceFailureReason: GameOverReason = {
  code: 'service-failure',
}

export function createInitialGameState(
  campaign = createInitialCampaignState(),
): GameState {
  const stage = getCampaignStage(campaign.currentStageIndex)
  if (!stage) {
    throw new Error('Campaign stage configuration is missing.')
  }
  let preparedCampaign = applyResourceUnlocks(
    campaign,
    stage.unlocksResourceTypes,
  )

  if (stage.initialSecurity && !preparedCampaign.unlockedControls?.includes('security')) {
    preparedCampaign = { ...preparedCampaign, infrastructure: { ...preparedCampaign.infrastructure, resources: preparedCampaign.infrastructure.resources.map(resource => resource.type === 'database' ? { ...resource, security: { ...stage.initialSecurity! } } : resource) } }
  }
  if (stage.unlocksControls?.length) preparedCampaign = { ...preparedCampaign, unlockedControls: [...new Set([...(preparedCampaign.unlockedControls ?? []), ...stage.unlocksControls])] }
  return {
    campaign: preparedCampaign,
    stageRuntime: createStageRuntime(preparedCampaign),
    stageStartSnapshot: preparedCampaign,
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
    !currentState.stageRuntime.briefingDismissed ||
    !currentState.stageRuntime.serviceStarted
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

export function beginServerUpgrade(
  currentState: GameState,
  resourceId: string,
): GameState {
  if (
    currentState.stageRuntime.status !== 'playing' ||
    !currentState.stageRuntime.serviceStarted
  ) {
    return currentState
  }

  const simulation = startServerUpgrade(
    currentState.stageRuntime.simulation,
    resourceId,
  )

  if (simulation === currentState.stageRuntime.simulation) {
    return currentState
  }

  return applyImmediateFailure({
    ...currentState,
    campaign: syncCampaignWithSimulation(currentState.campaign, simulation),
    stageRuntime: { ...currentState.stageRuntime, simulation },
  })
}

export function configureDatabaseSecurity(state: GameState, key: SecurityRisk, exposed: boolean): GameState {
  if (state.stageRuntime.status !== 'playing' || !state.campaign.unlockedControls?.includes('security')) return state
  const resources = state.campaign.infrastructure.resources.map(resource => resource.type === 'database' ? { ...resource, security: { ...(resource.security ?? secureSettings), [key]: exposed } } : resource)
  const settings = resources.find(resource => resource.type === 'database')?.security ?? secureSettings
  return { ...state, campaign: { ...state.campaign, infrastructure: { ...state.campaign.infrastructure, resources } }, stageRuntime: { ...state.stageRuntime, simulation: { ...state.stageRuntime.simulation, security: advanceSecurity(state.stageRuntime.simulation.security, settings, 0).state } } }
}

export function beginAdvancedResourceDeployment(state: GameState, type: AdvancedResourceType): GameState {
  const definition = advancedResourceConfigs[type]
  if (!state.campaign.unlockedResourceTypes.includes(type) || state.campaign.infrastructure.resources.some(resource => resource.type === type)) return state
  return beginInfrastructureDeployment(state, type, definition.deploymentCost, definition.deploymentDurationSeconds)
}

export function beginDatabaseUpgrade(state: GameState): GameState {
  if (state.campaign.currentStageIndex < 4 || !state.campaign.infrastructure.resources.some(resource => resource.type === 'database' && resource.databaseTierId !== 'medium')) return state
  return beginInfrastructureDeployment(state, 'database-upgrade', databaseUpgradeConfig.deploymentCost, databaseUpgradeConfig.deploymentDurationSeconds)
}

export function beginLoadBalancerDeployment(
  currentState: GameState,
): GameState {
  return beginInfrastructureDeployment(
    currentState,
    'load-balancer',
    loadBalancerResourceConfig.deploymentCost,
    loadBalancerResourceConfig.deploymentDurationSeconds,
  )
}

export function beginAdditionalAppServerDeployment(
  currentState: GameState,
): GameState {
  if (!hasLoadBalancer(currentState.campaign)) {
    return currentState
  }

  return beginInfrastructureDeployment(
    currentState,
    'app-server',
    additionalAppServerConfig.deploymentCost,
    additionalAppServerConfig.deploymentDurationSeconds,
  )
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

export function moveCampaignResources(
  currentState: GameState,
  updates: readonly { id: string; position: { x: number; y: number } }[],
): GameState {
  const campaign = updateResourcePositions(currentState.campaign, updates)

  if (campaign === currentState.campaign) {
    return currentState
  }

  return {
    ...currentState,
    campaign,
  }
}

export function placeStageOneResource(
  currentState: GameState,
  resourceType: Extract<
    CampaignResourceType,
    'users' | 'app-server' | 'database'
  >,
): GameState {
  if (
    currentState.stageRuntime.status !== 'playing' ||
    currentState.stageRuntime.serviceStarted
  ) {
    return currentState
  }

  const campaign = addStageOneResource(currentState.campaign, resourceType)
  if (campaign === currentState.campaign) {
    return currentState
  }

  const stage = getCurrentStage(currentState)
  const simulation = createInitialTrafficState({
    infrastructure: createTrafficInfrastructure(campaign),
    balance: currentState.stageRuntime.simulation.balance,
    trafficProfile: stage.trafficProfile,
    serviceActive: false,
  })

  return {
    ...currentState,
    campaign,
    stageRuntime: {
      ...currentState.stageRuntime,
      simulation,
      statistics: createInitialStageStatistics(simulation),
    },
  }
}

export function connectStageOneResources(
  currentState: GameState,
  sourceId: string,
  targetId: string,
): GameState {
  if (
    currentState.stageRuntime.status !== 'playing' ||
    currentState.stageRuntime.serviceStarted
  ) {
    return currentState
  }

  const campaign = addStageOneConnection(
    currentState.campaign,
    sourceId,
    targetId,
  )
  if (campaign === currentState.campaign) {
    return currentState
  }

  const stage = getCurrentStage(currentState)
  const serviceStarted = hasOperationalServicePath(campaign)
  const simulation = createInitialTrafficState({
    infrastructure: createTrafficInfrastructure(campaign),
    balance: currentState.stageRuntime.simulation.balance,
    trafficProfile: stage.trafficProfile,
    serviceActive: serviceStarted,
  })

  return {
    ...currentState,
    campaign,
    stageRuntime: {
      ...currentState.stageRuntime,
      simulation,
      serviceStarted,
      statistics: createInitialStageStatistics(simulation),
    },
  }
}

export function calculateInfrastructureDeploymentProgress(
  deployment: InfrastructureDeployment,
  gameTimeSeconds: number,
) {
  const duration =
    deployment.completesAtGameTimeSeconds -
    deployment.startedAtGameTimeSeconds

  return Math.min(
    Math.max(
      (gameTimeSeconds - deployment.startedAtGameTimeSeconds) / duration,
      0,
    ),
    1,
  )
}

export function restartStage(currentState: GameState): GameState {
  return createInitialGameState(currentState.stageStartSnapshot)
}

export function restartCampaign(): GameState {
  return createInitialGameState()
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

  const simulation = createInitialTrafficState({
    infrastructure: createTrafficInfrastructure(campaign),
    balance: campaign.balance,
    trafficProfile: stage.trafficProfile,
    serviceActive:
      campaign.currentStageIndex > 0 || hasOperationalServicePath(campaign),
  })

  const serviceStarted =
    campaign.currentStageIndex > 0 || hasOperationalServicePath(campaign)

  return {
    status: 'playing',
    simulation,
    zeroSatisfactionDurationSeconds: 0,
    gameOverReason: null,
    objectiveProgress: createStageObjectiveProgress(stage),
    stageRating: null,
    briefingDismissed: stage.tutorialSteps.length === 0,
    trafficEvents: createStageTrafficEvents(stage, campaign.seed),
    infrastructureDeployment: null,
    statistics: createInitialStageStatistics(simulation),
    serviceStarted,
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
  const deploymentResult = advanceInfrastructureDeployment(
    currentState.campaign,
    currentState.stageRuntime.infrastructureDeployment,
    nextGameTimeSeconds,
  )
  const simulation = advanceTrafficSimulation(
    currentState.stageRuntime.simulation,
    1,
    stage.trafficProfile,
    getActiveTrafficMultiplier(trafficEvents),
    createTrafficInfrastructure(deploymentResult.campaign),
  )
  const campaign = syncCampaignWithSimulation(
    deploymentResult.campaign,
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
  const statistics = advanceStageStatistics(
    currentState.stageRuntime.statistics,
    simulation,
  )

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
      infrastructureDeployment: deploymentResult.deployment,
      statistics,
      serviceStarted: currentState.stageRuntime.serviceStarted,
    },
  }
}

function beginInfrastructureDeployment(
  currentState: GameState,
  kind: InfrastructureDeployment['kind'],
  cost: number,
  durationSeconds: number,
) {
  const simulation = currentState.stageRuntime.simulation
  const resourceAlreadyExists =
    kind in advancedResourceConfigs ? currentState.campaign.infrastructure.resources.some(resource => resource.type === kind) : kind === 'database-upgrade'
      ? currentState.campaign.infrastructure.resources.some(resource => resource.type === 'database' && resource.databaseTierId === 'medium')
      : kind === 'load-balancer'
      ? hasLoadBalancer(currentState.campaign)
      : currentState.campaign.infrastructure.resources.some(
          (resource) => resource.id === additionalAppServerConfig.id,
        )
  const resourceIsUnlocked =
    kind in advancedResourceConfigs || kind === 'database-upgrade' || kind === 'app-server' ||
    currentState.campaign.unlockedResourceTypes.includes('load-balancer')

  if (
    currentState.stageRuntime.status !== 'playing' ||
    currentState.stageRuntime.infrastructureDeployment ||
    resourceAlreadyExists ||
    !resourceIsUnlocked ||
    !canAffordCost(simulation.balance, cost)
  ) {
    return currentState
  }

  const nextSimulation = {
    ...simulation,
    balance: deductCost(simulation.balance, cost),
  }

  return applyImmediateFailure({
    ...currentState,
    campaign: syncCampaignWithSimulation(
      currentState.campaign,
      nextSimulation,
    ),
    stageRuntime: {
      ...currentState.stageRuntime,
      simulation: nextSimulation,
      infrastructureDeployment: {
        kind,
        cost,
        startedAtGameTimeSeconds: simulation.gameTimeSeconds,
        completesAtGameTimeSeconds:
          simulation.gameTimeSeconds + durationSeconds,
      },
    },
  })
}

function advanceInfrastructureDeployment(
  campaign: CampaignState,
  deployment: InfrastructureDeployment | null,
  gameTimeSeconds: number,
) {
  if (
    !deployment ||
    gameTimeSeconds < deployment.completesAtGameTimeSeconds
  ) {
    return { campaign, deployment }
  }

  return {
    campaign:
      deployment.kind in advancedResourceConfigs ? addAdvancedResource(campaign, deployment.kind as AdvancedResourceType) : deployment.kind === 'database-upgrade'
        ? { ...campaign, infrastructure: { ...campaign.infrastructure, resources: campaign.infrastructure.resources.map(resource => resource.type === 'database' ? { ...resource, databaseTierId: 'medium' as const } : resource) } }
        : deployment.kind === 'load-balancer'
        ? addLoadBalancerResource(campaign)
        : addAdditionalAppServerResource(campaign),
    deployment: null,
  }
}

function applyImmediateFailure(currentState: GameState): GameState {
  const reason = getGameOverReason(
    getCurrentStage(currentState),
    currentState.stageRuntime.simulation,
    currentState.stageRuntime.zeroSatisfactionDurationSeconds,
  )

  return reason
    ? {
        ...currentState,
        stageRuntime: {
          ...currentState.stageRuntime,
          status: 'game-over',
          gameOverReason: reason,
        },
      }
    : currentState
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
