import type {
  GameOverReason,
  GameStatus,
} from '../simulation/gameStateSimulation'
import type { TrafficSimulationState } from '../simulation/trafficSimulation'

type GameStateOverlayProps = {
  status: GameStatus
  reason: GameOverReason | null
  simulation: TrafficSimulationState
  onRestartStage: () => void
}

export function GameStateOverlay({
  status,
  reason,
  simulation,
  onRestartStage,
}: GameStateOverlayProps) {
  if (status === 'playing') {
    return null
  }

  const stageWon = status === 'stage-won'

  return (
    <div className="game-state-overlay" role="dialog" aria-modal="true">
      <section className="game-state-card">
        <p className="game-state-card__eyebrow">
          {stageWon ? 'Stage complete' : 'Game over'}
        </p>
        <h2>{stageWon ? 'Stage Won' : reason?.title}</h2>
        <p className="game-state-card__message">
          {stageWon
            ? 'The primary objective has been completed.'
            : reason?.message}
        </p>

        <dl className="game-state-card__metrics">
          <div>
            <dt>Game time</dt>
            <dd>{simulation.gameTimeSeconds}s</dd>
          </div>
          <div>
            <dt>Balance</dt>
            <dd>{simulation.balance} cr</dd>
          </div>
          <div>
            <dt>Satisfaction</dt>
            <dd>{simulation.customerSatisfaction.toFixed(1)}%</dd>
          </div>
          <div>
            <dt>Latency</dt>
            <dd>{simulation.appServer.latencyMs} ms</dd>
          </div>
        </dl>

        {!stageWon && (
          <button type="button" onClick={onRestartStage}>
            Restart Stage
          </button>
        )}
      </section>
    </div>
  )
}
