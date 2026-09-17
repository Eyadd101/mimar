import { useCallback, useEffect, useState } from 'react'
import {
  defaultSimulationSpeed,
  trafficSimulationConfig,
  type SimulationSpeed,
} from '../simulation/config'
import {
  advanceGameState,
  beginServerUpgrade,
  continueToNextStage,
  createInitialGameState,
  dismissStageBriefing,
  getCurrentStage,
  hasNextCampaignStage,
  moveCampaignResource,
  restartStage,
} from '../simulation/gameStateSimulation'

export function useGameSimulation() {
  const [gameState, setGameState] = useState(createInitialGameState)
  const [gameSpeed, setGameSpeed] =
    useState<SimulationSpeed>(defaultSimulationSpeed)
  const effectiveGameSpeed =
    gameState.stageRuntime.status === 'playing' &&
    gameState.stageRuntime.briefingDismissed
      ? gameSpeed
      : 0

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

  const upgradeServer = useCallback(() => {
    setGameState(beginServerUpgrade)
  }, [])

  const resetStage = useCallback(() => {
    setGameState(restartStage)
    setGameSpeed(defaultSimulationSpeed)
  }, [])

  const continueCampaign = useCallback(() => {
    setGameState(continueToNextStage)
    setGameSpeed(defaultSimulationSpeed)
  }, [])

  const beginStage = useCallback(() => {
    setGameState(dismissStageBriefing)
  }, [])

  const updateResourcePosition = useCallback(
    (resourceId: string, position: { x: number; y: number }) => {
      setGameState((currentState) =>
        moveCampaignResource(currentState, resourceId, position),
      )
    },
    [],
  )

  const stage = getCurrentStage(gameState)

  return {
    simulation: gameState.stageRuntime.simulation,
    campaign: gameState.campaign,
    stageStartCampaign: gameState.stageStartSnapshot,
    gameStatus: gameState.stageRuntime.status,
    gameOverReason: gameState.stageRuntime.gameOverReason,
    stage,
    objectiveProgress: gameState.stageRuntime.objectiveProgress,
    stageRating: gameState.stageRuntime.stageRating,
    trafficEvents: gameState.stageRuntime.trafficEvents,
    hasNextStage: hasNextCampaignStage(gameState),
    isStageBriefingOpen: !gameState.stageRuntime.briefingDismissed,
    gameSpeed: effectiveGameSpeed,
    setGameSpeed,
    startServerUpgrade: upgradeServer,
    restartStage: resetStage,
    continueToNextStage: continueCampaign,
    beginStage,
    updateResourcePosition,
  }
}
