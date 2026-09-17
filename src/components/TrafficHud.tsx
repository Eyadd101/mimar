type TrafficHudProps = {
  activeUsers: number
  requestsPerSecond: number
  latencyMs: number
  customerSatisfaction: number
  satisfactionReason: string | null
  businessConsequenceReason: string | null
  balance: number
  revenuePerPeriod: number
  infrastructureCost: number
  netCashFlowPerPeriod: number
  costPeriodSeconds: number
  gameTimeSeconds: number
}

function formatCredits(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

function formatGameTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function TrafficHud({
  activeUsers,
  requestsPerSecond,
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
}: TrafficHudProps) {
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

  return (
    <div className="traffic-hud-shell">
      <dl className="traffic-hud" aria-label="Traffic simulation">
        <div className="traffic-hud__metric">
          <dt><TechnicalTerm translationKey="metric.activeUsers" /></dt>
          <dd>{activeUsers}</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt><TechnicalTerm translationKey="metric.requestsPerSecond" /></dt>
          <dd>{requestsPerSecond.toFixed(1)}</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt><TechnicalTerm translationKey="metric.latency" /></dt>
          <dd>{latencyMs} ms</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt><TechnicalTerm translationKey="metric.satisfaction" /></dt>
          <dd>{customerSatisfaction.toFixed(1)}%</dd>
        </div>
        <div className="traffic-hud__metric" data-balance-state={balanceState}>
          <dt><TechnicalTerm translationKey="metric.balance" /></dt>
          <dd>{formatCredits(balance)} cr</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt><TechnicalTerm translationKey="metric.revenue" /></dt>
          <dd>{formatCredits(revenuePerPeriod)} / {costPeriodSeconds}s</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt><TechnicalTerm translationKey="metric.infrastructureCost" /></dt>
          <dd>{infrastructureCost} / {costPeriodSeconds}s</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt><TechnicalTerm translationKey="metric.netCashFlow" /></dt>
          <dd data-cash-flow={netCashFlowPerPeriod < 0 ? 'negative' : 'positive'}>
            {netCashFlowPerPeriod > 0 ? '+' : ''}
            {formatCredits(netCashFlowPerPeriod)} / {costPeriodSeconds}s
          </dd>
        </div>
        <div className="traffic-hud__metric">
          <dt><TechnicalTerm translationKey="metric.gameTime" /></dt>
          <dd>{formatGameTime(gameTimeSeconds)}</dd>
        </div>
      </dl>
      {(businessConsequenceReason || satisfactionReason || balanceWarning) && (
        <p className="traffic-hud__notice" role="status">
          {businessConsequenceReason ?? satisfactionReason ?? balanceWarning}
        </p>
      )}
    </div>
  )
}
import { gameFeedbackConfig } from '../simulation/config'
import { TechnicalTerm } from './TechnicalTerm'
