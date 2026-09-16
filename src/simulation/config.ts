export const trafficSimulationConfig = {
  initialActiveUsers: 20,
  tickIntervalMs: 1_000,
  activeUserGrowthIntervalSeconds: 5,
  activeUsersAddedPerInterval: 1,
  requestsPerUserPerSecond: 0.1,
} as const

export const appServerSimulationConfig = {
  requestCapacity: 6,
  elevatedCpuThreshold: 60,
  highCpuThreshold: 80,
} as const
