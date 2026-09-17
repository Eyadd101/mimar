import type {
  GameOverReason,
  GameStatus,
} from '../simulation/gameStateSimulation'
import type { TrafficSimulationState } from '../simulation/trafficSimulation'
import type { StageRating } from '../simulation/starRatingSimulation'

type GameStateOverlayProps = {
  status: GameStatus
  reason: GameOverReason | null
  simulation: TrafficSimulationState
  stageName: string
  stageRating: StageRating | null
  onRestartStage: () => void
}

export function GameStateOverlay({
  status,
  reason,
  simulation,
  stageName,
  stageRating,
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
        <h2>{stageWon ? stageName : reason?.title}</h2>
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

        {stageWon && stageRating && (
          <div className="stage-rating" aria-label={`${stageRating.stars} stars earned`}>
            <div className="stage-rating__stars" aria-hidden="true">
              {[1, 2, 3].map((star) => (
                <span key={star} data-earned={star <= stageRating.stars}>★</span>
              ))}
            </div>
            <p>{stageRating.stars} / 3 stars</p>
            <ul>
              {stageRating.explanations.map((item) => (
                <li key={item.star} data-earned={item.earned}>
                  <span aria-hidden="true">{item.earned ? '✓' : '×'}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.explanation}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!stageWon && (
          <button type="button" onClick={onRestartStage}>
            Restart Stage
          </button>
        )}
      </section>
    </div>
  )
}
