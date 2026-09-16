export const trafficSimulationConfig = {
  initialActiveUsers: 20,
  tickIntervalMs: 1_000,
  activeUserGrowthIntervalSeconds: 5,
  activeUsersAddedPerInterval: 1,
  requestsPerUserPerSecond: 0.1,
} as const

export const simulationSpeedOptions = [0, 1, 2, 4] as const
export type SimulationSpeed = (typeof simulationSpeedOptions)[number]
export const defaultSimulationSpeed: SimulationSpeed = 1

export const appServerSimulationConfig = {
  elevatedCpuThreshold: 60,
  highCpuThreshold: 80,
  baselineMemoryUsage: 30,
  memoryLoadAtCapacity: 55,
} as const

export const serverTierConfigs = {
  small: {
    name: 'Small Server',
    requestCapacity: 6,
    costPerPeriod: 8,
  },
  medium: {
    name: 'Medium Server',
    requestCapacity: 14,
    costPerPeriod: 18,
  },
} as const

export type ServerTierId = keyof typeof serverTierConfigs

export const appServerResourceConfig = {
  name: 'App Server',
  type: 'App Server',
  awsReference: 'EC2',
  initialTierId: 'small' satisfies ServerTierId,
  costPeriodSeconds: 60,
} as const

export const serverUpgradeConfig = {
  targetTierId: 'medium' satisfies ServerTierId,
  upgradeCost: 180,
  deploymentDurationSeconds: 30,
} as const

export const economyConfig = {
  initialBalance: 500,
} as const

export const latencySimulationConfig = {
  baseLatencyMs: 80,
  loadLatencyAtCapacityMs: 40,
  nearCapacityStartRatio: 0.7,
  nearCapacityPenaltyMs: 280,
  overloadPenaltyMsPerUtilization: 1_200,
} as const

export const customerSatisfactionConfig = {
  initialSatisfaction: 100,
  badLatencyThresholdMs: 400,
  sustainedBadLatencySeconds: 10,
  satisfactionDecreasePerSecond: 0.25,
} as const
