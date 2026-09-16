export const trafficSimulationConfig = {
  initialActiveUsers: 20,
  tickIntervalMs: 1_000,
  activeUserGrowthIntervalSeconds: 5,
  activeUsersAddedPerInterval: 1,
  requestsPerUserPerSecond: 0.1,
} as const

export const appServerSimulationConfig = {
  elevatedCpuThreshold: 60,
  highCpuThreshold: 80,
} as const

export const appServerResourceConfig = {
  name: 'App Server',
  type: 'App Server',
  awsReference: 'EC2',
  tierName: 'Small Server',
  requestCapacity: 6,
  costPerPeriod: 8,
  costPeriodSeconds: 60,
} as const
