import {
  appServerSimulationConfig,
  latencySimulationConfig,
  serverTierConfigs,
  type ServerTierId,
} from './config'

export type AppServerStatus =
  | 'normal'
  | 'elevated'
  | 'high'
  | 'overloaded'

export type AppServerMetrics = {
  tierId: ServerTierId
  tierName: string
  costPerPeriod: number
  requestCapacity: number
  utilizationRatio: number
  cpuUsage: number
  memoryUsage: number
  latencyMs: number
  isOverloaded: boolean
  status: AppServerStatus
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10

/**
 * Latency adds a small linear load cost, a quadratic penalty from 70% to
 * 100% utilization, and a steep linear penalty for traffic above capacity.
 */
export function calculateLatencyMs(utilizationRatio: number) {
  const {
    baseLatencyMs,
    loadLatencyAtCapacityMs,
    nearCapacityStartRatio,
    nearCapacityPenaltyMs,
    overloadPenaltyMsPerUtilization,
  } = latencySimulationConfig
  const boundedUtilization = clamp(utilizationRatio, 0, 1)
  const nearCapacityFactor = clamp(
    (utilizationRatio - nearCapacityStartRatio) /
      (1 - nearCapacityStartRatio),
    0,
    1,
  )
  const overloadRatio = Math.max(utilizationRatio - 1, 0)

  return Math.round(
    baseLatencyMs +
      loadLatencyAtCapacityMs * boundedUtilization +
      nearCapacityPenaltyMs * nearCapacityFactor ** 2 +
      overloadPenaltyMsPerUtilization * overloadRatio,
  )
}

/**
 * CPU usage is the share of request capacity currently in use:
 * cpuUsage = (requestsPerSecond / requestCapacity) * 100
 * The displayed percentage is capped at 100; overload remains a separate flag.
 */
export function calculateAppServerMetrics(
  requestsPerSecond: number,
  tierId: ServerTierId,
): AppServerMetrics {
  const tier = serverTierConfigs[tierId]
  const { requestCapacity } = tier
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
  const latencyMs = calculateLatencyMs(utilizationRatio)

  let status: AppServerStatus = 'normal'

  if (isOverloaded) {
    status = 'overloaded'
  } else if (cpuUsage >= highCpuThreshold) {
    status = 'high'
  } else if (cpuUsage >= elevatedCpuThreshold) {
    status = 'elevated'
  }

  return {
    tierId,
    tierName: tier.name,
    costPerPeriod: tier.costPerPeriod,
    requestCapacity,
    utilizationRatio,
    cpuUsage,
    memoryUsage,
    latencyMs,
    isOverloaded,
    status,
  }
}
