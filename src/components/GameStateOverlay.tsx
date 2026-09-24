import { advancedResourceConfigs, type AdvancedResourceType } from '../simulation/expansionConfig'
import type {
  GameOverReason,
  GameStatus,
} from '../simulation/gameStateSimulation'
import type { TrafficSimulationState } from '../simulation/trafficSimulation'
import type { StageRating } from '../simulation/starRatingSimulation'
import type { CampaignState } from '../simulation/campaignSimulation'
import type { StageConfig } from '../data/stages'
import {
  calculateAverageLatency,
  type StageStatistics,
} from '../simulation/stageStatisticsSimulation'
import { createGameOverFailureChain } from '../simulation/gameOverExplanationSimulation'
import { useLanguage } from '../i18n/useLanguage'
import { TechnicalTerm } from './TechnicalTerm'
import type { TranslationKey } from '../i18n/translations'

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
  onRestartCampaign: () => void
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
  onRestartCampaign,
  onContinueToNextStage,
}: GameStateOverlayProps) {
  const { direction, t } = useLanguage()

  if (status === 'playing') {
    return null
  }

  const stageWon = status === 'stage-won'
  const failureChain = reason
    ? createGameOverFailureChain(reason, simulation, stageStatistics)
    : []
  const getStarExplanation = (star: 1 | 2 | 3, earned: boolean) => {
    if (star === 1) {
      return t(earned ? 'game.star1Earned' : 'game.star1Missed')
    }

    if (star === 2) {
      return t(earned ? 'game.star2Earned' : 'game.star2Missed', {
        satisfaction: earned
          ? simulation.customerSatisfaction.toFixed(1)
          : stage.starCriteria.twoStars.minimumSatisfaction,
      })
    }

    return t(earned ? 'game.star3Earned' : 'game.star3Missed', {
      satisfaction: stage.starCriteria.threeStars.minimumSatisfaction,
      balance: earned
        ? simulation.balance.toFixed(1)
        : stage.starCriteria.threeStars.minimumBalance,
    })
  }

  return (
    <div className="game-state-overlay" role="dialog" aria-modal="true">
      <section className="game-state-card" dir={direction}>
        <p className="game-state-card__eyebrow">
          {stageWon ? t('game.stageComplete') : t('game.gameOver')}
        </p>
        <h2>
          {stageWon
            ? t(stage.nameKey)
            : reason?.code === 'bankruptcy'
              ? t('game.bankruptcyTitle')
              : t('game.serviceFailureTitle')}
        </h2>
        <p className="game-state-card__message">
          {stageWon
            ? t('game.primaryComplete')
            : reason?.code === 'bankruptcy'
              ? t('game.bankruptcyMessage')
              : t('game.serviceFailureMessage')}
        </p>

        <dl className="game-state-card__metrics">
          {stageWon ? (
            <>
              <ResultMetric translationKey="metric.peakUsers" value={stageStatistics.peakActiveUsers} />
              <ResultMetric
                translationKey="metric.averageLatency"
                value={`${calculateAverageLatency(stageStatistics)} ms`}
              />
              <ResultMetric
                translationKey="metric.lowestSatisfaction"
                value={`${stageStatistics.lowestSatisfaction.toFixed(1)}%`}
              />
              <ResultMetric
                translationKey="metric.infrastructureCost"
                value={`${stageStatistics.totalInfrastructureCost} cr`}
              />
              <ResultMetric
                translationKey="metric.remainingBalance"
                value={`${simulation.balance.toFixed(1)} cr`}
              />
              <ResultMetric translationKey="metric.gameTime" value={`${simulation.gameTimeSeconds}s`} />
            </>
          ) : (
            <>
              <ResultMetric translationKey="metric.gameTime" value={`${simulation.gameTimeSeconds}s`} />
              <ResultMetric translationKey="metric.balance" value={`${simulation.balance} cr`} />
              <ResultMetric
                translationKey="metric.lowestSatisfaction"
                value={`${stageStatistics.lowestSatisfaction.toFixed(1)}%`}
              />
              <ResultMetric
                translationKey="metric.averageLatency"
                value={`${calculateAverageLatency(stageStatistics)} ms`}
              />
            </>
          )}
        </dl>

        {stageWon && stage.sequence >= 6 && <p className="stage-recap">{t('advanced.cacheRecap', { hits: simulation.cache.requestsServed.toFixed(1), queries: simulation.database.queryLoad.toFixed(1), cost: simulation.infrastructureCostPerPeriod })}</p>}
        {stageWon && stageRating && (
          <div className="stage-rating" aria-label={t('game.starsEarned', { stars: stageRating.stars })}>
            <div className="stage-rating__stars" aria-hidden="true">
              {[1, 2, 3].map((star) => (
                <span key={star} data-earned={star <= stageRating.stars}>★</span>
              ))}
            </div>
            <p>{t('game.starsCount', { stars: stageRating.stars })}</p>
            <ul>
              {stageRating.explanations.map((item) => (
                <li key={item.star} data-earned={item.earned}>
                  <span aria-hidden="true">{item.earned ? '✓' : '×'}</span>
                  <div>
                    <strong>{t(getStarTitleKey(item.star))}</strong>
                    <p>{getStarExplanation(item.star, item.earned)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stageWon && (
          <div className="stage-recap">
            <div>
              <span>{t('game.infrastructure')}</span>
              <ul>
                {campaign.infrastructure.resources
                  .filter((resource) => resource.type !== 'users')
                  .map((resource) => (
                  <li key={resource.id}>
                    <ResourceSummary resource={resource} />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span>{t('game.whatLearned')}</span>
              <ul>
                {stage.learningGoalKeys.map((goalKey) => (
                  <li key={goalKey}>{t(goalKey)}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!stageWon && (
          <div className="failure-chain" aria-label={t('game.whyFailed')}>
            <span>{t('game.whatHappened')}</span>
            <ol>
              {failureChain.map((step, index) => (
                <li key={`${step.key}-${index}`}>{t(step.key, step.variables)}</li>
              ))}
            </ol>
          </div>
        )}

        {stageWon && hasNextStage && (
          <button type="button" onClick={onContinueToNextStage}>
            {t('action.continueNextStage')}
          </button>
        )}
        {stageWon && !hasNextStage && (
          <p className="game-state-card__campaign-end">
            {t('game.allStagesComplete')}
          </p>
        )}
        {!stageWon && (
          <div className="game-state-card__actions">
            <button type="button" onClick={onRestartStage}>
              {t('action.retryStage')}
            </button>
            <button type="button" onClick={onRestartCampaign}>
              {t('action.returnCampaignStart')}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function getStarTitleKey(star: 1 | 2 | 3): TranslationKey {
  const keys: Record<1 | 2 | 3, TranslationKey> = {
    1: 'game.star1Title',
    2: 'game.star2Title',
    3: 'game.star3Title',
  }
  return keys[star]
}

function ResourceSummary({
  resource,
}: {
  resource: CampaignState['infrastructure']['resources'][number]
}) {
  if (resource.type === 'app-server') {
    return (
      <>
        <TechnicalTerm
          translationKey={resource.id === 'server-b' ? 'resource.appServerB' : 'resource.appServer'}
        />{' '}
        —{' '}
        <TechnicalTerm
          translationKey={resource.tierId === 'medium' ? 'resource.mediumServer' : 'resource.smallServer'}
        />
      </>
    )
  }

  return (
    <TechnicalTerm
      translationKey={resource.type in advancedResourceConfigs ? advancedResourceConfigs[resource.type as AdvancedResourceType].labelKey : resource.type === 'database' ? (resource.databaseTierId === 'medium' ? 'advanced.mediumDatabase' : 'advanced.smallDatabase') : resource.type === 'load-balancer' ? 'resource.loadBalancer' : 'resource.database'}
    />
  )
}

function ResultMetric({
  label,
  translationKey,
  value,
}: {
  label?: string
  translationKey?: Parameters<typeof TechnicalTerm>[0]['translationKey']
  value: string | number
}) {
  return (
    <div>
      <dt>
        {translationKey ? (
          <TechnicalTerm translationKey={translationKey} />
        ) : (
          label
        )}
      </dt>
      <dd>{value}</dd>
    </div>
  )
}
