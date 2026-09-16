type TrafficHudProps = {
  activeUsers: number
  requestsPerSecond: number
  latencyMs: number
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
  gameTimeSeconds,
}: TrafficHudProps) {
  return (
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
        <dt>Game Time</dt>
        <dd>{formatGameTime(gameTimeSeconds)}</dd>
      </div>
    </dl>
  )
}
