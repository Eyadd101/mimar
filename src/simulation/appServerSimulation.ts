import {
  appServerResourceConfig,
  appServerSimulationConfig,
} from './config'

export type AppServerStatus =
  | 'normal'
  | 'elevated'
  | 'high'
  | 'overloaded'

export type AppServerMetrics = {
  requestCapacity: number
  utilizationRatio: number
  cpuUsage: number
  memoryUsage: number
  isOverloaded: boolean
  status: AppServerStatus
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10

/**
 * CPU usage is the share of request capacity currently in use:
 * cpuUsage = (requestsPerSecond / requestCapacity) * 100
 * The displayed percentage is capped at 100; overload remains a separate flag.
 */
export function calculateAppServerMetrics(
  requestsPerSecond: number,
): AppServerMetrics {
  const { requestCapacity } = appServerResourceConfig
  const {
    elevatedCpuThreshold,
    highCpuThreshold,
    baselineMemoryUsage,
    memoryLoadAtCapacity,
  } = appServerSimulationConfig
  const utilizationRatio = requestsPerSecond / requestCapacity
  const isOverloaded = requestsPerSecond > requestCapacity
  const cpuUsage = roundToOneDecimal(
    clamp(utilizationRatio * 100, 0, 100),
  )
  /**
   * Memory has a fixed application footprint plus a load-sensitive portion:
   * memoryUsage = baselineMemoryUsage + utilizationRatio * memoryLoadAtCapacity
   */
  const memoryUsage = roundToOneDecimal(
    clamp(
      baselineMemoryUsage + utilizationRatio * memoryLoadAtCapacity,
      0,
      100,
    ),
  )

  let status: AppServerStatus = 'normal'

  if (isOverloaded) {
    status = 'overloaded'
  } else if (cpuUsage >= highCpuThreshold) {
    status = 'high'
  } else if (cpuUsage >= elevatedCpuThreshold) {
    status = 'elevated'
  }

  return {
    requestCapacity,
    utilizationRatio,
    cpuUsage,
    memoryUsage,
    isOverloaded,
    status,
  }
}
