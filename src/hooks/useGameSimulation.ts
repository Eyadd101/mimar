import type { BackupSettings } from '../simulation/backupSimulation'
import type { SecurityRisk } from '../simulation/securitySimulation'
import type { AdvancedResourceType } from '../simulation/expansionConfig'
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
  beginDatabaseUpgrade,
  beginDatabaseDownsize,
  configureDatabaseSecurity,
  configureDatabaseBackups,
  beginDatabaseRestore,
  beginAdvancedResourceDeployment,
  continueToNextStage,
  connectInfrastructure,
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
  saveGameCheckpoint,
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
      saveGameCheckpoint(gameState, gameSpeed)
    }
  }, [campaignStarted, gameState, gameSpeed])

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

    setGameState(campaignSaveResult.gameState ?? createInitialGameState(campaignSaveResult.campaign))
    setCampaignStarted(true)
    setGameSpeed(campaignSaveResult.gameSpeed ?? defaultSimulationSpeed)
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
      connectInfrastructure(currentState, sourceId, targetId),
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
    startAdvancedDeployment: (type: AdvancedResourceType) => setGameState(state => beginAdvancedResourceDeployment(state, type)),
    startDatabaseRestore: () => setGameState(beginDatabaseRestore),
    configureBackups: (settings: BackupSettings) => setGameState(state => configureDatabaseBackups(state, settings)),
    configureSecurity: (key: SecurityRisk, exposed: boolean) => setGameState(state => configureDatabaseSecurity(state, key, exposed)),
    startDatabaseDownsize: () => setGameState(beginDatabaseDownsize),
    startDatabaseUpgrade: () => setGameState(beginDatabaseUpgrade),
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
