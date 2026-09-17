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
  type: 'users' | 'app-server' | 'database' | 'load-balancer'
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
) {
  const source = resources.find((resource) => resource.id === sourceId)

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
    return (
      appServers.find((server) => server.resourceId === sourceId)
        ?.requestsPerSecond ?? 0
    )
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
