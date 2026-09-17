import { useState, type ReactNode } from 'react'
import type {
  MetricEducationSnapshot,
  MetricId,
} from '../data/metricEducation'
import { gameFeedbackConfig } from '../simulation/config'
import { MetricExplanationPanel } from './MetricExplanationPanel'
import { TechnicalTerm } from './TechnicalTerm'

type TrafficHudProps = {
  activeUsers: number
  requestsPerSecond: number
  requestsPerUserPerSecond: number
  cpuUsage: number
  requestCapacity: number
  latencyMs: number
  customerSatisfaction: number
  badLatencyDurationSeconds: number
  satisfactionReason: string | null
  businessConsequenceReason: string | null
  balance: number
  revenuePerPeriod: number
  infrastructureCost: number
  netCashFlowPerPeriod: number
  costPeriodSeconds: number
  gameTimeSeconds: number
  serviceStarted: boolean
  isPaused: boolean
  isServiceOverloaded: boolean
}

function formatCredits(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

function formatGameTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function TrafficHud(props: TrafficHudProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricId | null>(null)
  const {
    activeUsers,
    requestsPerSecond,
    cpuUsage,
    latencyMs,
    customerSatisfaction,
    satisfactionReason,
    businessConsequenceReason,
    balance,
    revenuePerPeriod,
    infrastructureCost,
    netCashFlowPerPeriod,
    costPeriodSeconds,
    gameTimeSeconds,
  } = props
  const balanceState =
    balance <= gameFeedbackConfig.criticalBalanceWarningCredits
      ? 'critical'
      : balance <= gameFeedbackConfig.lowBalanceWarningCredits
        ? 'low'
        : 'healthy'
  const balanceWarning =
    balanceState === 'critical'
      ? `Bankruptcy danger: only ${formatCredits(balance)} credits remain.`
      : balanceState === 'low'
        ? `Runway warning: balance has fallen to ${formatCredits(balance)} credits.`
        : null
  const snapshot: MetricEducationSnapshot = {
    ...props,
    infrastructureCostPerPeriod: infrastructureCost,
  }
  const metrics: Array<{
    id: MetricId
    labelKey: Parameters<typeof TechnicalTerm>[0]['translationKey']
    value: ReactNode
    state?: string
  }> = [
    { id: 'active-users', labelKey: 'metric.activeUsers', value: activeUsers },
    {
      id: 'requests-per-second',
      labelKey: 'metric.requestsPerSecond',
      value: requestsPerSecond.toFixed(1),
    },
    {
      id: 'cpu-usage',
      labelKey: 'metric.cpuUsage',
      value: `${cpuUsage.toFixed(1)}%`,
    },
    { id: 'latency', labelKey: 'metric.latency', value: `${latencyMs} ms` },
    {
      id: 'satisfaction',
      labelKey: 'metric.satisfaction',
      value: `${customerSatisfaction.toFixed(1)}%`,
    },
    {
      id: 'balance',
      labelKey: 'metric.balance',
      value: `${formatCredits(balance)} cr`,
      state: balanceState,
    },
    {
      id: 'revenue',
      labelKey: 'metric.revenue',
      value: `${formatCredits(revenuePerPeriod)} / ${costPeriodSeconds}s`,
    },
    {
      id: 'infrastructure-cost',
      labelKey: 'metric.infrastructureCost',
      value: `${infrastructureCost} / ${costPeriodSeconds}s`,
    },
    {
      id: 'net-cash-flow',
      labelKey: 'metric.netCashFlow',
      value: `${netCashFlowPerPeriod > 0 ? '+' : ''}${formatCredits(netCashFlowPerPeriod)} / ${costPeriodSeconds}s`,
      state: netCashFlowPerPeriod < 0 ? 'negative' : 'positive',
    },
    {
      id: 'game-time',
      labelKey: 'metric.gameTime',
      value: formatGameTime(gameTimeSeconds),
    },
  ]

  return (
    <div className="traffic-hud-shell">
      <div className="traffic-hud" aria-label="Traffic simulation">
        {metrics.map((metric) => (
          <button
            key={metric.id}
            type="button"
            className="traffic-hud__metric"
            data-metric-id={metric.id}
            data-metric-state={metric.state}
            data-selected={selectedMetric === metric.id}
            aria-expanded={selectedMetric === metric.id}
            onClick={() =>
              setSelectedMetric((current) =>
                current === metric.id ? null : metric.id,
              )
            }
          >
            <span className="traffic-hud__label">
              <TechnicalTerm translationKey={metric.labelKey} />
            </span>
            <strong>{metric.value}</strong>
          </button>
        ))}
      </div>
      {selectedMetric && (
        <MetricExplanationPanel
          metricId={selectedMetric}
          snapshot={snapshot}
          onClose={() => setSelectedMetric(null)}
        />
      )}
      {!selectedMetric &&
        (businessConsequenceReason || satisfactionReason || balanceWarning) && (
          <p className="traffic-hud__notice" role="status">
            {businessConsequenceReason ?? satisfactionReason ?? balanceWarning}
          </p>
        )}
    </div>
  )
}
