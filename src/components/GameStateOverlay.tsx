import type {
  GameOverReason,
  GameStatus,
} from '../simulation/gameStateSimulation'
import type { TrafficSimulationState } from '../simulation/trafficSimulation'
import type { StageRating } from '../simulation/starRatingSimulation'
import type { CampaignState } from '../simulation/campaignSimulation'
import { getInfrastructureSummary } from '../simulation/campaignSimulation'
import type { StageConfig } from '../data/stages'
import {
  calculateAverageLatency,
  type StageStatistics,
} from '../simulation/stageStatisticsSimulation'

type GameStateOverlayProps = {
  status: GameStatus
  reason: GameOverReason | null
  simulation: TrafficSimulationState
  stage: StageConfig
  stageRating: StageRating | null
  stageStatistics: StageStatistics
  campaign: CampaignState
  hasNextStage: boolean
  onRestartStage: () => void
  onContinueToNextStage: () => void
}

export function GameStateOverlay({
  status,
  reason,
  simulation,
  stage,
  stageRating,
  stageStatistics,
  campaign,
  hasNextStage,
  onRestartStage,
  onContinueToNextStage,
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
        <h2>{stageWon ? stage.name : reason?.title}</h2>
        <p className="game-state-card__message">
          {stageWon
            ? 'The primary objective has been completed.'
            : reason?.message}
        </p>

        <dl className="game-state-card__metrics">
          {stageWon ? (
            <>
              <ResultMetric label="Peak users" value={stageStatistics.peakActiveUsers} />
              <ResultMetric
                label="Average latency"
                value={`${calculateAverageLatency(stageStatistics)} ms`}
              />
              <ResultMetric
                label="Lowest satisfaction"
                value={`${stageStatistics.lowestSatisfaction.toFixed(1)}%`}
              />
              <ResultMetric
                label="Infrastructure cost"
                value={`${stageStatistics.totalInfrastructureCost} cr`}
              />
              <ResultMetric
                label="Remaining balance"
                value={`${simulation.balance.toFixed(1)} cr`}
              />
              <ResultMetric label="Game time" value={`${simulation.gameTimeSeconds}s`} />
            </>
          ) : (
            <>
              <ResultMetric label="Game time" value={`${simulation.gameTimeSeconds}s`} />
              <ResultMetric label="Balance" value={`${simulation.balance} cr`} />
              <ResultMetric
                label="Satisfaction"
                value={`${simulation.customerSatisfaction.toFixed(1)}%`}
              />
              <ResultMetric
                label="Latency"
                value={`${simulation.applicationLatencyMs} ms`}
              />
            </>
          )}
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

        {stageWon && (
          <div className="stage-recap">
            <div>
              <span>Infrastructure</span>
              <ul>
                {getInfrastructureSummary(campaign).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <span>What you learned</span>
              <ul>
                {stage.learningGoals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {stageWon && hasNextStage && (
          <button type="button" onClick={onContinueToNextStage}>
            Continue to Next Stage
          </button>
        )}
        {stageWon && !hasNextStage && (
          <p className="game-state-card__campaign-end">
            All currently available stages are complete.
          </p>
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

function ResultMetric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
