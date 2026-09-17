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
  return (
    <div className="traffic-hud-shell">
      <dl className="traffic-hud" aria-label="Traffic simulation">
        <div className="traffic-hud__metric">
          <dt>Active Users</dt>
          <dd>{activeUsers}</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt>Requests/sec</dt>
          <dd>{requestsPerSecond.toFixed(1)}</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt>Latency</dt>
          <dd>{latencyMs} ms</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt>Satisfaction</dt>
          <dd>{customerSatisfaction.toFixed(1)}%</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt>Balance</dt>
          <dd>{formatCredits(balance)} cr</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt>Revenue</dt>
          <dd>{formatCredits(revenuePerPeriod)} / {costPeriodSeconds}s</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt>Infra Cost</dt>
          <dd>{infrastructureCost} / {costPeriodSeconds}s</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt>Net Cash Flow</dt>
          <dd data-cash-flow={netCashFlowPerPeriod < 0 ? 'negative' : 'positive'}>
            {netCashFlowPerPeriod > 0 ? '+' : ''}
            {formatCredits(netCashFlowPerPeriod)} / {costPeriodSeconds}s
          </dd>
        </div>
        <div className="traffic-hud__metric">
          <dt>Game Time</dt>
          <dd>{formatGameTime(gameTimeSeconds)}</dd>
        </div>
      </dl>
      {(businessConsequenceReason || satisfactionReason) && (
        <p className="traffic-hud__notice" role="status">
          {businessConsequenceReason ?? satisfactionReason}
        </p>
      )}
    </div>
  )
}
