import { appServerSimulationConfig } from './config'

export type AppServerStatus =
  | 'normal'
  | 'elevated'
  | 'high'
  | 'overloaded'

export type AppServerMetrics = {
  requestCapacity: number
  cpuUsage: number
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
  const { requestCapacity, elevatedCpuThreshold, highCpuThreshold } =
    appServerSimulationConfig
  const isOverloaded = requestsPerSecond > requestCapacity
  const cpuUsage = roundToOneDecimal(
    clamp((requestsPerSecond / requestCapacity) * 100, 0, 100),
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
    cpuUsage,
    isOverloaded,
    status,
  }
}
