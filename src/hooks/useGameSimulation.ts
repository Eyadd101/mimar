import { useEffect, useState } from 'react'
import {
  defaultSimulationSpeed,
  trafficSimulationConfig,
  type SimulationSpeed,
} from '../simulation/config'
import {
  advanceTrafficSimulation,
  createInitialTrafficState,
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

  return {
    simulation,
    gameSpeed,
    setGameSpeed,
  }
}
