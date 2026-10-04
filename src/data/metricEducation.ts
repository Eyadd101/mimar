import {
  appServerSimulationConfig,
  customerSatisfactionConfig,
} from '../simulation/config'
import type {
  TranslationKey,
  TranslationMessage,
} from '../i18n/translations'
import { formatCredits } from './creditPresentation'

export type MetricId =
  | 'active-users'
  | 'requests-per-second'
  | 'cpu-usage'
  | 'latency'
  | 'satisfaction'
  | 'balance'
  | 'revenue'
  | 'infrastructure-cost'
  | 'net-cash-flow'
  | 'game-time'

export type MetricEducationDefinition = {
  id: MetricId
  labelKey: TranslationKey
  meaningKey: TranslationKey
  increaseKeys: readonly TranslationKey[]
  decreaseKeys: readonly TranslationKey[]
}

export type MetricEducationSnapshot = {
  activeUsers: number
  requestsPerSecond: number
  requestsPerUserPerSecond: number
  cpuUsage: number
  requestCapacity: number
  latencyMs: number
  customerSatisfaction: number
  badLatencyDurationSeconds: number
  balance: number
  revenuePerPeriod: number
  infrastructureCostPerPeriod: number
  netCashFlowPerPeriod: number
  incidentCosts: number
  gameTimeSeconds: number
  costPeriodSeconds: number
  serviceStarted: boolean
  isPaused: boolean
  isServiceOverloaded: boolean
}

export const metricEducationDefinitions: Record<
  MetricId,
  MetricEducationDefinition
> = {
  'active-users': {
    id: 'active-users',
    labelKey: 'metric.activeUsers',
    meaningKey: 'education.activeUsers.meaning',
    increaseKeys: [
      'education.activeUsers.increaseGrowth',
      'education.activeUsers.increaseEvents',
    ],
    decreaseKeys: [
      'education.activeUsers.decreaseEventEnd',
      'education.activeUsers.decreaseStage',
    ],
  },
  'requests-per-second': {
    id: 'requests-per-second',
    labelKey: 'metric.requestsPerSecond',
    meaningKey: 'education.requests.meaning',
    increaseKeys: [
      'education.requests.increaseUsers',
      'education.requests.increaseEvent',
    ],
    decreaseKeys: [
      'education.requests.decreaseUsers',
      'education.requests.decreaseEvent',
    ],
  },
  'cpu-usage': {
    id: 'cpu-usage',
    labelKey: 'metric.cpuUsage',
    meaningKey: 'education.cpu.meaning',
    increaseKeys: [
      'education.cpu.increaseRequests',
      'education.cpu.increaseCapacity',
    ],
    decreaseKeys: [
      'education.cpu.decreaseCapacity',
      'education.cpu.decreaseTraffic',
    ],
  },
  latency: {
    id: 'latency',
    labelKey: 'metric.latency',
    meaningKey: 'education.latency.meaning',
    increaseKeys: [
      'education.latency.increaseUtilization',
      'education.latency.increaseCapacity',
    ],
    decreaseKeys: [
      'education.latency.decreaseCapacity',
      'education.latency.decreaseTraffic',
    ],
  },
  satisfaction: {
    id: 'satisfaction',
    labelKey: 'metric.satisfaction',
    meaningKey: 'education.satisfaction.meaning',
    increaseKeys: ['education.satisfaction.increaseRecovery'],
    decreaseKeys: [
      'education.satisfaction.decreaseLatency',
      'education.satisfaction.decreaseOutage',
    ],
  },
  balance: {
    id: 'balance',
    labelKey: 'metric.balance',
    meaningKey: 'education.balance.meaning',
    increaseKeys: ['education.balance.increaseMargin'],
    decreaseKeys: [
      'education.balance.decreaseMargin',
      'education.balance.decreaseActions',
    ],
  },
  revenue: {
    id: 'revenue',
    labelKey: 'metric.revenue',
    meaningKey: 'education.revenue.meaning',
    increaseKeys: [
      'education.revenue.increaseUsers',
      'education.revenue.increaseSatisfaction',
    ],
    decreaseKeys: [
      'education.revenue.decreaseSatisfaction',
      'education.revenue.decreaseUsers',
    ],
  },
  'infrastructure-cost': {
    id: 'infrastructure-cost',
    labelKey: 'metric.infrastructureCost',
    meaningKey: 'education.cost.meaning',
    increaseKeys: [
      'education.cost.increaseTier',
      'education.cost.increaseResources',
    ],
    decreaseKeys: ['education.cost.decreaseResources'],
  },
  'net-cash-flow': {
    id: 'net-cash-flow',
    labelKey: 'metric.netCashFlow',
    meaningKey: 'education.cashFlow.meaning',
    increaseKeys: [
      'education.cashFlow.increaseRevenue',
      'education.cashFlow.increaseCost',
    ],
    decreaseKeys: [
      'education.cashFlow.decreaseSatisfaction',
      'education.cashFlow.decreaseCost',
    ],
  },
  'game-time': {
    id: 'game-time',
    labelKey: 'metric.gameTime',
    meaningKey: 'education.gameTime.meaning',
    increaseKeys: ['education.gameTime.increaseSpeed'],
    decreaseKeys: ['education.gameTime.decreaseReset'],
  },
}

export function getMetricCurrentReason(
  metricId: MetricId,
  snapshot: MetricEducationSnapshot,
): TranslationMessage {
  if (!snapshot.serviceStarted) {
    return { key: 'reason.waitingPath' }
  }

  switch (metricId) {
    case 'active-users':
      return {
        key: 'reason.activeUsers',
        variables: {
          users: snapshot.activeUsers,
          seconds: snapshot.gameTimeSeconds,
        },
      }
    case 'requests-per-second':
      return {
        key: 'reason.requests',
        variables: {
          users: snapshot.activeUsers,
          rate: snapshot.requestsPerUserPerSecond,
          requests: snapshot.requestsPerSecond.toFixed(1),
        },
      }
    case 'cpu-usage':
      if (snapshot.isServiceOverloaded) {
        return { key: 'reason.cpuOverloaded' }
      }
      return {
        key: 'reason.cpuLoad',
        variables: {
          requests: snapshot.requestsPerSecond.toFixed(1),
          capacity: snapshot.requestCapacity.toFixed(1),
        },
      }
    case 'latency':
      if (snapshot.isServiceOverloaded) {
        return { key: 'reason.latencyOverloaded' }
      }
      return {
        key: 'reason.latencyLoad',
        variables: {
          latency: snapshot.latencyMs,
          cpu: snapshot.cpuUsage.toFixed(1),
        },
      }
    case 'satisfaction':
      return snapshot.badLatencyDurationSeconds >=
        customerSatisfactionConfig.sustainedBadLatencySeconds
        ? { key: 'reason.satisfactionDown' }
        : { key: 'reason.satisfactionStable' }
    case 'balance':
      return snapshot.netCashFlowPerPeriod < 0
        ? { key: 'reason.balanceDown' }
        : { key: 'reason.balanceUp' }
    case 'revenue':
      return {
        key: 'reason.revenue',
        variables: {
          users: snapshot.activeUsers,
          satisfaction: snapshot.customerSatisfaction.toFixed(1),
        },
      }
    case 'infrastructure-cost':
      return {
        key: 'reason.cost',
        variables: {
          cost: formatCredits(snapshot.infrastructureCostPerPeriod),
          seconds: snapshot.costPeriodSeconds,
        },
      }
    case 'net-cash-flow':
      return snapshot.netCashFlowPerPeriod < 0
        ? { key: 'reason.cashFlowDown' }
        : { key: 'reason.cashFlowUp' }
    case 'game-time':
      return snapshot.isPaused
        ? { key: 'reason.timePaused' }
        : { key: 'reason.timeRunning' }
  }
}

export function getCpuTrend(cpuUsage: number) {
  if (cpuUsage >= appServerSimulationConfig.highCpuThreshold) {
    return 'high'
  }
  if (cpuUsage >= appServerSimulationConfig.elevatedCpuThreshold) {
    return 'elevated'
  }
  return 'normal'
}

export type LiveMetricCause = {
  trend: 'up' | 'down'
  message: TranslationMessage
}

export function getLiveMetricCause(
  metricId: MetricId,
  snapshot: MetricEducationSnapshot,
): LiveMetricCause | null {
  if (!snapshot.serviceStarted) {
    return null
  }

  switch (metricId) {
    case 'cpu-usage': {
      const cpuTrend = getCpuTrend(snapshot.cpuUsage)
      if (snapshot.isServiceOverloaded) {
        return {
          trend: 'up',
          message: { key: 'cause.serverOverloaded' },
        }
      }
      if (cpuTrend === 'high' || cpuTrend === 'elevated') {
        return {
          trend: 'up',
          message: { key: 'cause.trafficNearCapacity' },
        }
      }
      return null
    }
    case 'latency':
      return snapshot.latencyMs > customerSatisfactionConfig.badLatencyThresholdMs
        ? {
            trend: 'up',
            message: { key: 'cause.highServerLoad' },
          }
        : null
    case 'satisfaction':
      return snapshot.badLatencyDurationSeconds >=
        customerSatisfactionConfig.sustainedBadLatencySeconds
        ? {
            trend: 'down',
            message: { key: 'cause.latencyStayedHigh' },
          }
        : null
    case 'balance':
      return snapshot.netCashFlowPerPeriod < 0
        ? {
            trend: 'down',
            message: { key: 'cause.costExceedsRevenue' },
          }
        : null
    default:
      return null
  }
}
