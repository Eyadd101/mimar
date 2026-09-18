import { expansionEconomyConfig } from '../simulation/expansionConfig'
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
    trafficProfile: { ...options.trafficProfile, maximumRevenuePerPeriod: expansionEconomyConfig.maximumRevenuePerPeriod },
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

databaseBottleneckStage.unlocksControls = ['database-scaling']

export const readHeavyStage = createExpandedStage({
  id: 'read-heavy-traffic', sequence: 6,
  nameKey: 'advanced.stage6', storyKey: 'advanced.stage6Story', lessonKey: 'advanced.stage6Lesson',
  durationSeconds: 360, unlocks: ['cache'],
  trafficProfile: { initialActiveUsers: 150, activeUserGrowthIntervalSeconds: 20, activeUsersAddedPerInterval: 1, requestsPerUserPerSecond: .1, queriesPerRequest: 8 },
})

export const backgroundStage = createExpandedStage({
  id: 'too-much-work', sequence: 7,
  nameKey: 'advanced.stage7', storyKey: 'advanced.stage7Story', lessonKey: 'advanced.stage7Lesson',
  durationSeconds: 390, unlocks: ['queue', 'worker'],
  trafficProfile: { initialActiveUsers: 150, activeUserGrowthIntervalSeconds: 20, activeUsersAddedPerInterval: 1, requestsPerUserPerSecond: .1, queriesPerRequest: 5, backgroundJobsPerRequest: .25 },
})
backgroundStage.secondaryObjectives.push({ id: 'background', type: 'healthy-background', titleKey: 'advanced.processingRate', descriptionKey: 'advanced.backgroundGoal', maximumAgeSeconds: 30 })
backgroundStage.winCondition.requiredObjectiveIds.push('background')

export const uploadsStage = createExpandedStage({
  id: 'growing-uploads', sequence: 8,
  nameKey: 'advanced.stage8', storyKey: 'advanced.stage8Story', lessonKey: 'advanced.stage8Lesson',
  durationSeconds: 360, unlocks: ['object-storage'],
  trafficProfile: { initialActiveUsers: 150, activeUserGrowthIntervalSeconds: 20, activeUsersAddedPerInterval: 1, requestsPerUserPerSecond: .1, queriesPerRequest: 5, backgroundJobsPerRequest: .25, uploadsPerRequest: .1 },
})
uploadsStage.secondaryObjectives.push({ id: 'durable-files', type: 'durable-storage', titleKey: 'advanced.storage', descriptionKey: 'advanced.storageGoal' })
uploadsStage.winCondition.requiredObjectiveIds.push('durable-files')

export const securityStage = createExpandedStage({
  id: 'too-public', sequence: 9,
  nameKey: 'advanced.stage9', storyKey: 'advanced.stage9Story', lessonKey: 'advanced.stage9Lesson',
  durationSeconds: 330,
  trafficProfile: { initialActiveUsers: 160, activeUserGrowthIntervalSeconds: 30, activeUsersAddedPerInterval: 1, requestsPerUserPerSecond: .1, queriesPerRequest: 5, backgroundJobsPerRequest: .25, uploadsPerRequest: .1 },
})
securityStage.unlocksControls = ['security']
securityStage.initialSecurity = { publicDatabase: true, weakCredentials: false, excessivePermissions: true, openNetwork: true }
securityStage.secondaryObjectives.push({ id: 'secure', type: 'secure-configuration', titleKey: 'advanced.security', descriptionKey: 'advanced.securityGoal' })
securityStage.winCondition.requiredObjectiveIds.push('secure')

export const recoveryStage = createExpandedStage({
  id: 'recover-the-data', sequence: 10,
  nameKey: 'advanced.stage10', storyKey: 'advanced.stage10Story', lessonKey: 'advanced.stage10Lesson',
  durationSeconds: 420,
  trafficProfile: { initialActiveUsers: 160, activeUserGrowthIntervalSeconds: 30, activeUsersAddedPerInterval: 1, requestsPerUserPerSecond: .1, queriesPerRequest: 5, backgroundJobsPerRequest: .25, uploadsPerRequest: .1, dataLossAtSecond: 180 },
})
recoveryStage.unlocksControls = ['backups']
recoveryStage.secondaryObjectives.push({ id: 'recovered', type: 'recovered-data', titleKey: 'advanced.restore', descriptionKey: 'advanced.recoveryGoal' })
recoveryStage.winCondition.requiredObjectiveIds.push('recovered')

// Scheduled exercises teach backlog recovery and redundancy without random attacks.
backgroundStage.trafficProfile.failures = [{ id: 'worker-maintenance', resourceId: 'worker', labelKey: 'advanced.worker', startsAtSecond: 240, durationSeconds: 25 }]
uploadsStage.trafficProfile.failures = [{ id: 'server-restart', resourceId: 'server', labelKey: 'resource.appServer', startsAtSecond: 240, durationSeconds: 20 }]
recoveryStage.trafficProfile.failures = [{ id: 'database-maintenance', resourceId: 'database', labelKey: 'advanced.database', startsAtSecond: 300, durationSeconds: 15 }]

/** Small, forecasted traffic lifts provide a second observation point after deployment. */
function workloadEvent(id: string, durationSeconds: number, range: readonly [number, number]): StageConfig['trafficEvents'][number] {
  return {
    id, type: 'traffic-multiplier', senderKey: 'advanced.productTeam', titleKey: 'advanced.featureAdoption', messageKey: 'advanced.featureAdoptionStory',
    startsAtSecond: 90, durationSeconds,
    forecastMinimumMultiplier: range[0], forecastMaximumMultiplier: range[1],
    outcomeProfile: { typicalProbability: 1, moderatelyLowerProbability: 0, moderatelyHigherProbability: 0, tailProbability: 0,
      typicalRange: range, moderatelyLowerRange: range, moderatelyHigherRange: range, tailRange: range, tailExplanationKey: 'advanced.featureAdoptionStory' },
  }
}
databaseBottleneckStage.trafficEvents = [workloadEvent('database-adoption', 150, [1.1, 1.2])]
readHeavyStage.trafficEvents = [workloadEvent('dashboard-adoption', 180, [1.08, 1.12])]
