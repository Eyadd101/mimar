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
    costPerPeriod: 10,
  },
  medium: {
    name: 'Medium Server',
    requestCapacity: 14,
    costPerPeriod: 24,
  },
} as const

export type ServerTierId = keyof typeof serverTierConfigs

export const appServerResourceConfig = {
  name: 'App Server',
  type: 'App Server',
  awsReference: 'EC2',
  initialTierId: 'small' satisfies ServerTierId,
  costPeriodSeconds: 30,
} as const

export const serverUpgradeConfig = {
  targetTierId: 'medium' satisfies ServerTierId,
  upgradeCost: 100,
  stageFourUpgradeCost: 120,
  deploymentDurationSeconds: 30,
} as const

export function getServerUpgradeCost(stageSequence: number): number {
  return stageSequence === 4
    ? serverUpgradeConfig.stageFourUpgradeCost
    : serverUpgradeConfig.upgradeCost
}

export const loadBalancerResourceConfig = {
  name: 'Load Balancer',
  type: 'Load Balancer',
  awsReference: 'ALB',
  costPerPeriod: 6,
  deploymentCost: 45,
  deploymentDurationSeconds: 20,
} as const

export const additionalAppServerConfig = {
  id: 'server-b',
  name: 'App Server B',
  initialTierId: 'small' satisfies ServerTierId,
  deploymentCost: 70,
  deploymentDurationSeconds: 30,
} as const

export const economyConfig = {
  initialBalance: 160,
  revenuePerActiveUserPerPeriod: 0.6,
  maximumRevenuePerPeriod: 70,
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
  satisfactionDecreasePerSecond: 0.35,
} as const

export const customerSentimentConfig = {
  veryHappyMinimum: 90,
  happyMinimum: 75,
  neutralMinimum: 50,
  unhappyMinimum: 25,
} as const

export const businessConsequenceConfig = {
  severeOutageLatencyMs: 1_000,
  sustainedOutageSeconds: 20,
  severeOutagePenalty: 25,
} as const

export const gameStateConfig = {
  zeroSatisfactionGracePeriodSeconds: 15,
} as const

export const gameFeedbackConfig = {
  lowBalanceWarningCredits: 60,
  criticalBalanceWarningCredits: 30,
} as const

export const campaignProgressionConfig = {
  balanceCarryoverRatio: 0.8,
  minimumNextStageBalance: 100,
  // Stage four introduces two paid resources; its floor includes a recovery
  // buffer so a first-time player can make one reasonable mistake.
  minimumBalanceByStage: [160, 100, 110, 400, 150, 120, 120, 120, 120, 120],
  defaultCampaignSeed: 47_291,
} as const
