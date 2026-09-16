import { useEffect, useState } from 'react'
import { trafficSimulationConfig } from '../simulation/config'
import {
  advanceTrafficSimulation,
  createInitialTrafficState,
} from '../simulation/trafficSimulation'

export function useTrafficSimulation() {
  const [simulation, setSimulation] = useState(createInitialTrafficState)

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setSimulation(advanceTrafficSimulation)
    }, trafficSimulationConfig.tickIntervalMs)

    return () => window.clearInterval(timerId)
  }, [])

  return simulation
}
