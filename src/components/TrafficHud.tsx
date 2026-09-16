type TrafficHudProps = {
  activeUsers: number
  requestsPerSecond: number
  latencyMs: number
  customerSatisfaction: number
  satisfactionReason: string | null
  balance: number
  infrastructureCost: number
  costPeriodSeconds: number
  gameTimeSeconds: number
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
  balance,
  infrastructureCost,
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
          <dd>{balance} cr</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt>Infra Cost</dt>
          <dd>{infrastructureCost} / {costPeriodSeconds}s</dd>
        </div>
        <div className="traffic-hud__metric">
          <dt>Game Time</dt>
          <dd>{formatGameTime(gameTimeSeconds)}</dd>
        </div>
      </dl>
      {satisfactionReason && (
        <p className="traffic-hud__notice" role="status">
          {satisfactionReason}
        </p>
      )}
    </div>
  )
}
