import type { TrafficSimulationState } from '../simulation/trafficSimulation'
import type { CampaignResourceType } from '../simulation/campaignSimulation'
export const requestFlowVisualConfig = {
  fullIntensityRequestsPerSecond: 14,
  slowestDurationSeconds: 2.4,
  fastestDurationSeconds: 0.55,
  minimumDashLengthPx: 2,
  maximumDashLengthPx: 7,
  minimumDashGapPx: 7,
  maximumDashGapPx: 22,
  animationTravelPx: 40,
} as const

type RequestFlowResource = {
  id: string
  type: CampaignResourceType
}

type RequestFlowServerRuntime = {
  resourceId: string
  requestsPerSecond: number
}

export function getConnectionRequestRate(
  sourceId: string,
  targetId: string,
  resources: readonly RequestFlowResource[],
  appServers: readonly RequestFlowServerRuntime[],
  totalRequestsPerSecond: number,
  simulation?: TrafficSimulationState,
) {
  const source = resources.find((resource) => resource.id === sourceId)

  const target = resources.find(resource => resource.id === targetId)
  if (simulation?.failedResourceIds.some(id => id === sourceId || id === targetId) || (target?.type === 'database' && simulation?.databaseData.dataLost)) return 0
  if (source?.type === 'cache') return simulation?.database.queryLoad ?? totalRequestsPerSecond
  if (source?.type === 'queue') return simulation?.queue.processingRate ?? 0

  if (source?.type === 'users') {
    return totalRequestsPerSecond
  }

  if (source?.type === 'load-balancer') {
    return (
      appServers.find((server) => server.resourceId === targetId)
        ?.requestsPerSecond ?? 0
    )
  }

  if (source?.type === 'app-server') {
    const serverRate = appServers.find(server => server.resourceId === sourceId)?.requestsPerSecond ?? 0
    const totalWork = appServers.reduce((sum, server) => sum + server.requestsPerSecond, 0)
    const share = totalWork > 0 ? serverRate / totalWork : 0
    if (!simulation) return serverRate
    if (target?.type === 'cache') return (simulation.cache.requestsServed + simulation.database.queryLoad) * share
    if (target?.type === 'database') return simulation.cache.connected ? 0 : simulation.database.queryLoad * share
    if (target?.type === 'queue') return simulation.queue.enqueueRate * share
    if (target?.type === 'object-storage') return simulation.storage.requestRate * share
    return totalRequestsPerSecond * share
  }

  return 0
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

const interpolate = (start: number, end: number, progress: number) =>
  start + (end - start) * progress

export function getRequestFlowVisual(requestsPerSecond: number) {
  const intensity = clamp(
    requestsPerSecond /
      requestFlowVisualConfig.fullIntensityRequestsPerSecond,
    0,
    1,
  )

  return {
    durationSeconds: interpolate(
      requestFlowVisualConfig.slowestDurationSeconds,
      requestFlowVisualConfig.fastestDurationSeconds,
      intensity,
    ),
    dashLengthPx: interpolate(
      requestFlowVisualConfig.minimumDashLengthPx,
      requestFlowVisualConfig.maximumDashLengthPx,
      intensity,
    ),
    dashGapPx: interpolate(
      requestFlowVisualConfig.maximumDashGapPx,
      requestFlowVisualConfig.minimumDashGapPx,
      intensity,
    ),
  }
}
