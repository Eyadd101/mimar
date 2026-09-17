import type { SimulationSpeed } from './config'

export function calculateTickGameSeconds(
  requestedSpeed: SimulationSpeed,
  simulationCanAdvance: boolean,
): SimulationSpeed {
  return simulationCanAdvance ? requestedSpeed : 0
}
