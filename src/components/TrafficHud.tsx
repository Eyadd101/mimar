import type { TrafficSimulationState } from '../simulation/trafficSimulation'

function formatGameTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function TrafficHud({
  activeUsers,
  requestsPerSecond,
  gameTimeSeconds,
}: TrafficSimulationState) {
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
        <dt>Game Time</dt>
        <dd>{formatGameTime(gameTimeSeconds)}</dd>
      </div>
    </dl>
  )
}
