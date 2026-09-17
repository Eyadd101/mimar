import { useCallback, useEffect, useState } from 'react'
import {
  defaultSimulationSpeed,
  trafficSimulationConfig,
  type SimulationSpeed,
} from '../simulation/config'
import {
  advanceGameState,
  beginServerUpgrade,
  createInitialGameState,
  restartStage,
} from '../simulation/gameStateSimulation'

export function useGameSimulation() {
  const [gameState, setGameState] = useState(createInitialGameState)
  const [gameSpeed, setGameSpeed] =
    useState<SimulationSpeed>(defaultSimulationSpeed)
  const effectiveGameSpeed =
    gameState.status === 'playing' ? gameSpeed : 0

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

  return {
    simulation: gameState.simulation,
    gameStatus: gameState.status,
    gameOverReason: gameState.gameOverReason,
    stage: gameState.stage,
    objectiveProgress: gameState.objectiveProgress,
    stageRating: gameState.stageRating,
    gameSpeed: effectiveGameSpeed,
    setGameSpeed,
    startServerUpgrade: upgradeServer,
    restartStage: resetStage,
  }
}
