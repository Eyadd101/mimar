import { useCallback, useEffect, useState } from 'react'
import {
  defaultSimulationSpeed,
  trafficSimulationConfig,
  type SimulationSpeed,
} from '../simulation/config'
import {
  advanceGameState,
  beginAdditionalAppServerDeployment,
  beginLoadBalancerDeployment,
  beginServerUpgrade,
  continueToNextStage,
  connectStageOneResources,
  createInitialGameState,
  dismissStageBriefing,
  getCurrentStage,
  hasNextCampaignStage,
  moveCampaignResources,
  placeStageOneResource,
  restartCampaign,
  restartStage,
} from '../simulation/gameStateSimulation'
import {
  clearCampaignSave,
  loadCampaignSave,
  saveCampaign,
} from '../simulation/campaignSave'
import { calculateTickGameSeconds } from '../simulation/simulationClock'

export function useGameSimulation() {
  const [campaignSaveResult, setCampaignSaveResult] = useState(loadCampaignSave)
  const [campaignStarted, setCampaignStarted] = useState(false)
  const [gameState, setGameState] = useState(createInitialGameState)
  const [gameSpeed, setGameSpeed] =
    useState<SimulationSpeed>(defaultSimulationSpeed)
  const effectiveGameSpeed = calculateTickGameSeconds(
    gameSpeed,
    campaignStarted &&
      gameState.stageRuntime.status === 'playing' &&
      gameState.stageRuntime.briefingDismissed &&
      gameState.stageRuntime.serviceStarted,
  )

  useEffect(() => {
    if (effectiveGameSpeed === 0) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setGameState((currentState) =>
        advanceGameState(currentState, effectiveGameSpeed),
      )
    }, trafficSimulationConfig.tickIntervalMs)

    return () => window.clearInterval(timerId)
  }, [effectiveGameSpeed])

  useEffect(() => {
    if (campaignStarted) {
      saveCampaign(gameState.campaign)
    }
  }, [campaignStarted, gameState.campaign])

  const startNewCampaign = useCallback(() => {
    clearCampaignSave()
    const initialGameState = restartCampaign()
    setGameState(initialGameState)
    setCampaignSaveResult({ status: 'ready', campaign: initialGameState.campaign })
    setCampaignStarted(true)
    setGameSpeed(defaultSimulationSpeed)
  }, [])

  const continueSavedCampaign = useCallback(() => {
    if (campaignSaveResult.status !== 'ready') {
      return
    }

    setGameState(createInitialGameState(campaignSaveResult.campaign))
    setCampaignStarted(true)
    setGameSpeed(defaultSimulationSpeed)
  }, [campaignSaveResult])

  const upgradeServer = useCallback((resourceId: string) => {
    setGameState((currentState) =>
      beginServerUpgrade(currentState, resourceId),
    )
  }, [])

  const deployLoadBalancer = useCallback(() => {
    setGameState(beginLoadBalancerDeployment)
  }, [])

  const deployAdditionalAppServer = useCallback(() => {
    setGameState(beginAdditionalAppServerDeployment)
  }, [])

  const resetStage = useCallback(() => {
    setGameState(restartStage)
    setGameSpeed(defaultSimulationSpeed)
  }, [])

  const resetCampaign = useCallback(() => {
    setGameState(restartCampaign())
    setGameSpeed(defaultSimulationSpeed)
  }, [])

  const continueCampaign = useCallback(() => {
    setGameState(continueToNextStage)
    setGameSpeed(defaultSimulationSpeed)
  }, [])

  const beginStage = useCallback(() => {
    setGameState(dismissStageBriefing)
  }, [])

  const updateResourcePositions = useCallback(
    (updates: readonly { id: string; position: { x: number; y: number } }[]) => {
      if (updates.length === 0) {
        return
      }

      setGameState((currentState) =>
        moveCampaignResources(currentState, updates),
      )
    },
    [],
  )

  const addResource = useCallback(
    (resourceType: 'users' | 'app-server' | 'database') => {
      setGameState((currentState) =>
        placeStageOneResource(currentState, resourceType),
      )
    },
    [],
  )

  const connectResources = useCallback((sourceId: string, targetId: string) => {
    setGameState((currentState) =>
      connectStageOneResources(currentState, sourceId, targetId),
    )
  }, [])

  const stage = getCurrentStage(gameState)

  return {
    simulation: gameState.stageRuntime.simulation,
    campaignStarted,
    campaignSaveResult,
    campaign: gameState.campaign,
    stageStartCampaign: gameState.stageStartSnapshot,
    gameStatus: gameState.stageRuntime.status,
    gameOverReason: gameState.stageRuntime.gameOverReason,
    stage,
    objectiveProgress: gameState.stageRuntime.objectiveProgress,
    stageRating: gameState.stageRuntime.stageRating,
    trafficEvents: gameState.stageRuntime.trafficEvents,
    infrastructureDeployment:
      gameState.stageRuntime.infrastructureDeployment,
    stageStatistics: gameState.stageRuntime.statistics,
    hasNextStage: hasNextCampaignStage(gameState),
    isStageBriefingOpen: !gameState.stageRuntime.briefingDismissed,
    serviceStarted: gameState.stageRuntime.serviceStarted,
    isSimulationRunning: effectiveGameSpeed > 0,
    gameSpeed,
    setGameSpeed,
    startServerUpgrade: upgradeServer,
    startLoadBalancerDeployment: deployLoadBalancer,
    startAdditionalAppServerDeployment: deployAdditionalAppServer,
    restartStage: resetStage,
    restartCampaign: resetCampaign,
    startNewCampaign,
    continueSavedCampaign,
    continueToNextStage: continueCampaign,
    beginStage,
    updateResourcePositions,
    addResource,
    connectResources,
  }
}
