import { useCallback, useEffect, useState } from 'react'
import {
  defaultSimulationSpeed,
  trafficSimulationConfig,
  type SimulationSpeed,
} from '../simulation/config'
import {
  advanceTrafficSimulation,
  createInitialTrafficState,
  startServerUpgrade,
} from '../simulation/trafficSimulation'

export function useGameSimulation() {
  const [simulation, setSimulation] = useState(createInitialTrafficState)
  const [gameSpeed, setGameSpeed] =
    useState<SimulationSpeed>(defaultSimulationSpeed)

  useEffect(() => {
    if (gameSpeed === 0) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setSimulation((currentState) =>
        advanceTrafficSimulation(currentState, gameSpeed),
      )
    }, trafficSimulationConfig.tickIntervalMs)

    return () => window.clearInterval(timerId)
  }, [gameSpeed])

  const beginServerUpgrade = useCallback(() => {
    setSimulation(startServerUpgrade)
  }, [])

  return {
    simulation,
    gameSpeed,
    setGameSpeed,
    startServerUpgrade: beginServerUpgrade,
  }
}
