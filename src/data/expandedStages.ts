import type { StageConfig, StageTrafficProfile } from './stages'
import type { TranslationKey } from '../i18n/translations'
import { gameStateConfig } from '../simulation/config'

/** Later stages reuse objective semantics; their workload and learning goals differ. */
export function createExpandedStage(options: {
  id: string
  sequence: number
  nameKey: TranslationKey
  storyKey: TranslationKey
  lessonKey: TranslationKey
  durationSeconds: number
  trafficProfile: StageTrafficProfile
  unlocks?: StageConfig['unlocksResourceTypes']
}): StageConfig {
  return {
    id: options.id, sequence: options.sequence, nameKey: options.nameKey,
    storyBriefingKey: options.storyKey,
    trafficProfile: options.trafficProfile,
    tutorialSteps: [{ titleKey: options.nameKey, messageKey: options.storyKey }],
    learningSteps: [], learningGoalKeys: [options.lessonKey], trafficEvents: [],
    unlocksResourceTypes: options.unlocks ?? [],
    minimumSurvivalDurationSeconds: options.durationSeconds,
    primaryObjective: { id: 'survive', type: 'survive-duration', titleKey: 'advanced.objective', descriptionKey: 'advanced.objectiveDescription', durationSeconds: options.durationSeconds },
    secondaryObjectives: [
      { id: 'responsive', type: 'maintain-latency', titleKey: 'advanced.responsive', descriptionKey: 'advanced.responsiveDescription', maximumLatencyMs: 350, durationSeconds: 60 },
      { id: 'satisfied', type: 'finish-satisfaction', titleKey: 'metric.satisfaction', descriptionKey: 'advanced.satisfactionGoal', minimumSatisfaction: 40 },
      { id: 'solvent', type: 'finish-balance', titleKey: 'metric.balance', descriptionKey: 'advanced.solvent', minimumBalance: 1 },
    ],
    winCondition: { type: 'all-required-objectives', requiredObjectiveIds: ['survive', 'responsive', 'satisfied', 'solvent'] },
    failureConditions: [{ type: 'balance-zero' }, { type: 'satisfaction-zero-grace', gracePeriodSeconds: gameStateConfig.zeroSatisfactionGracePeriodSeconds }],
    starCriteria: { twoStars: { minimumSatisfaction: 75 }, threeStars: { minimumSatisfaction: 90, minimumBalance: 150 } },
  }
}

export const databaseBottleneckStage = createExpandedStage({
  id: 'database-bottleneck', sequence: 5,
  nameKey: 'advanced.stage5', storyKey: 'advanced.stage5Story', lessonKey: 'advanced.stage5Lesson',
  durationSeconds: 330,
  trafficProfile: { initialActiveUsers: 120, activeUserGrowthIntervalSeconds: 10, activeUsersAddedPerInterval: 1, requestsPerUserPerSecond: .1, queriesPerRequest: 5 },
})

export const readHeavyStage = createExpandedStage({
  id: 'read-heavy-traffic', sequence: 6,
  nameKey: 'advanced.stage6', storyKey: 'advanced.stage6Story', lessonKey: 'advanced.stage6Lesson',
  durationSeconds: 360, unlocks: ['cache'],
  trafficProfile: { initialActiveUsers: 150, activeUserGrowthIntervalSeconds: 20, activeUsersAddedPerInterval: 1, requestsPerUserPerSecond: .1, queriesPerRequest: 8 },
})
