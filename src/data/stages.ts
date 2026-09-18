import type { InfrastructureFailure } from '../simulation/reliabilitySimulation'
import type { SecuritySettings } from '../simulation/securitySimulation'
import { databaseBottleneckStage, readHeavyStage, backgroundStage, uploadsStage, securityStage, recoveryStage } from './expandedStages'
import { gameStateConfig } from '../simulation/config'
import type { CampaignResourceType, CampaignControl } from '../simulation/campaignSimulation'
import type { ServerTierId } from '../simulation/config'
import type { TranslationKey } from '../i18n/translations'

export type StageObjectiveDefinition =
  | { id: string; type: 'durable-storage' | 'secure-configuration' | 'recovered-data'; titleKey: TranslationKey; descriptionKey: TranslationKey }

  | { id: string; type: 'healthy-background'; titleKey: TranslationKey; descriptionKey: TranslationKey; maximumAgeSeconds: number }

  | {
      id: string
      type: 'survive-duration'
      titleKey: TranslationKey
      descriptionKey: TranslationKey
      durationSeconds: number
    }
  | {
      id: string
      type: 'finish-satisfaction'
      titleKey: TranslationKey
      descriptionKey: TranslationKey
      minimumSatisfaction: number
    }
  | {
      id: string
      type: 'finish-balance'
      titleKey: TranslationKey
      descriptionKey: TranslationKey
      minimumBalance: number
    }
  | {
      id: string
      type: 'maintain-satisfaction'
      titleKey: TranslationKey
      descriptionKey: TranslationKey
      minimumSatisfaction: number
      durationSeconds: number
    }
  | {
      id: string
      type: 'maintain-latency'
      titleKey: TranslationKey
      descriptionKey: TranslationKey
      maximumLatencyMs: number
      durationSeconds: number
    }
  | {
      id: string
      type: 'handle-traffic-event'
      titleKey: TranslationKey
      descriptionKey: TranslationKey
      eventId: string
    }

export type StageFailureCondition =
  | {
      type: 'balance-zero'
    }
  | {
      type: 'satisfaction-zero-grace'
      gracePeriodSeconds: number
    }

export type StageTrafficProfile = {
  maximumRevenuePerPeriod?: number
  failures?: InfrastructureFailure[]
  dataLossAtSecond?: number
  uploadsPerRequest?: number
  backgroundJobsPerRequest?: number
  queriesPerRequest?: number
  initialActiveUsers: number
  activeUserGrowthIntervalSeconds: number
  activeUsersAddedPerInterval: number
  requestsPerUserPerSecond: number
}

export type TutorialStep = {
  titleKey: TranslationKey
  messageKey: TranslationKey
}

export type StageLearningStepDefinition =
  | {
      id: string
      type: 'place-resource'
      resourceType: CampaignResourceType
      titleKey: TranslationKey
    }
  | {
      id: string
      type: 'connect-resources'
      sourceType: CampaignResourceType
      targetType: CampaignResourceType
      titleKey: TranslationKey
    }
  | {
      id: string
      type: 'start-service'
      titleKey: TranslationKey
    }
  | {
      id: string
      type: 'observe-growth'
      durationSeconds: number
      titleKey: TranslationKey
    }
  | {
      id: string
      type: 'reach-server-tier'
      tierId: ServerTierId
      titleKey: TranslationKey
    }
  | {
      id: string
      type: 'complete-stage'
      titleKey: TranslationKey
    }

export type StageResourceUnlock = CampaignResourceType

export type TrafficEventDefinition = {
  id: string
  type: 'traffic-multiplier'
  senderKey: TranslationKey
  titleKey: TranslationKey
  messageKey: TranslationKey
  startsAtSecond: number
  durationSeconds: number
  forecastMinimumMultiplier: number
  forecastMaximumMultiplier: number
  outcomeProfile: {
    typicalProbability: number
    moderatelyLowerProbability: number
    moderatelyHigherProbability: number
    tailProbability: number
    typicalRange: readonly [number, number]
    moderatelyLowerRange: readonly [number, number]
    moderatelyHigherRange: readonly [number, number]
    tailRange: readonly [number, number]
    tailExplanationKey: TranslationKey
  }
}

export type StageConfig = {
  unlocksControls?: CampaignControl[]
  initialSecurity?: SecuritySettings
  id: string
  sequence: number
  nameKey: TranslationKey
  storyBriefingKey: TranslationKey
  trafficProfile: StageTrafficProfile
  tutorialSteps: TutorialStep[]
  learningSteps: StageLearningStepDefinition[]
  learningGoalKeys: TranslationKey[]
  trafficEvents: TrafficEventDefinition[]
  unlocksResourceTypes: StageResourceUnlock[]
  minimumSurvivalDurationSeconds: number
  primaryObjective: StageObjectiveDefinition
  secondaryObjectives: StageObjectiveDefinition[]
  winCondition: {
    type: 'all-required-objectives'
    requiredObjectiveIds: string[]
  }
  starCriteria: {
    twoStars: {
      minimumSatisfaction: number
    }
    threeStars: {
      minimumSatisfaction: number
      minimumBalance: number
    }
  }
  failureConditions: StageFailureCondition[]
}

export const prototypeStageConfig: StageConfig = {
  id: 'first-users',
  sequence: 1,
  nameKey: 'stage.firstUsers.name',
  storyBriefingKey: 'stage.firstUsers.briefing',
  trafficProfile: {
    initialActiveUsers: 20,
    activeUserGrowthIntervalSeconds: 5,
    activeUsersAddedPerInterval: 1,
    requestsPerUserPerSecond: 0.1,
  },
  tutorialSteps: [
    {
      titleKey: 'stage.firstUsers.tutorialTitle',
      messageKey: 'stage.firstUsers.tutorialMessage',
    },
  ],
  learningSteps: [
    {
      id: 'place-users',
      type: 'place-resource',
      resourceType: 'users',
      titleKey: 'learning.placeUsers',
    },
    {
      id: 'place-app-server',
      type: 'place-resource',
      resourceType: 'app-server',
      titleKey: 'learning.placeAppServer',
    },
    {
      id: 'connect-users-server',
      type: 'connect-resources',
      sourceType: 'users',
      targetType: 'app-server',
      titleKey: 'learning.connectUsersServer',
    },
    {
      id: 'place-database',
      type: 'place-resource',
      resourceType: 'database',
      titleKey: 'learning.placeDatabase',
    },
    {
      id: 'connect-server-database',
      type: 'connect-resources',
      sourceType: 'app-server',
      targetType: 'database',
      titleKey: 'learning.connectServerDatabase',
    },
    {
      id: 'start-service',
      type: 'start-service',
      titleKey: 'learning.startService',
    },
    {
      id: 'observe-growth',
      type: 'observe-growth',
      durationSeconds: 30,
      titleKey: 'learning.observeGrowth',
    },
    {
      id: 'respond-load',
      type: 'reach-server-tier',
      tierId: 'medium',
      titleKey: 'learning.respondLoad',
    },
    {
      id: 'complete-stage',
      type: 'complete-stage',
      titleKey: 'learning.completeStage',
    },
  ],
  learningGoalKeys: [
    'learning.goal.requestsLoad',
    'learning.goal.verticalCapacity',
  ],
  trafficEvents: [],
  unlocksResourceTypes: [],
  minimumSurvivalDurationSeconds: 270,
  primaryObjective: {
    id: 'survive-first-users',
    type: 'survive-duration',
    titleKey: 'objective.surviveGrowth.title',
    descriptionKey: 'objective.surviveGrowth.description',
    durationSeconds: 270,
  },
  secondaryObjectives: [
    {
      id: 'healthy-customers',
      type: 'finish-satisfaction',
      titleKey: 'objective.healthyCustomers.title',
      descriptionKey: 'objective.healthyCustomers.description',
      minimumSatisfaction: 75,
    },
    {
      id: 'cash-reserve',
      type: 'finish-balance',
      titleKey: 'objective.cashReserve.title',
      descriptionKey: 'objective.cashReserve.description',
      minimumBalance: 50,
    },
  ],
  winCondition: {
    type: 'all-required-objectives',
    requiredObjectiveIds: ['survive-first-users'],
  },
  starCriteria: {
    twoStars: {
      minimumSatisfaction: 85,
    },
    threeStars: {
      minimumSatisfaction: 95,
      minimumBalance: 75,
    },
  },
  failureConditions: [
    { type: 'balance-zero' },
    {
      type: 'satisfaction-zero-grace',
      gracePeriodSeconds:
        gameStateConfig.zeroSatisfactionGracePeriodSeconds,
    },
  ],
}

export const growthPreviewStageConfig: StageConfig = {
  ...prototypeStageConfig,
  id: 'marketing-campaign',
  sequence: 2,
  nameKey: 'stage.marketingCampaign.name',
  storyBriefingKey: 'stage.marketingCampaign.briefing',
  trafficProfile: {
    initialActiveUsers: 20,
    activeUserGrowthIntervalSeconds: 10,
    activeUsersAddedPerInterval: 1,
    requestsPerUserPerSecond: 0.1,
  },
  tutorialSteps: [],
  learningSteps: [],
  learningGoalKeys: [
    'learning.goal.capacityPlanning',
    'learning.goal.forecastRange',
  ],
  trafficEvents: [
    {
      id: 'marketing-launch',
      type: 'traffic-multiplier',
      senderKey: 'event.marketing.sender',
      titleKey: 'event.marketing.title',
      messageKey: 'event.marketing.message',
      startsAtSecond: 120,
      durationSeconds: 90,
      forecastMinimumMultiplier: 3,
      forecastMaximumMultiplier: 5,
      outcomeProfile: {
        typicalProbability: 0.75,
        moderatelyLowerProbability: 0.105,
        moderatelyHigherProbability: 0.105,
        tailProbability: 0.04,
        typicalRange: [3.5, 5],
        moderatelyLowerRange: [3, 3.5],
        moderatelyHigherRange: [5, 6.5],
        tailRange: [6.5, 7.9],
        tailExplanationKey: 'event.marketing.tail',
      },
    },
  ],
  unlocksResourceTypes: [],
  primaryObjective: {
    id: 'survive-growth-preview',
    type: 'survive-duration',
    titleKey: 'objective.keepGrowing.title',
    descriptionKey: 'objective.keepGrowing.description',
    durationSeconds: 300,
  },
  secondaryObjectives: [
    {
      id: 'handle-marketing-launch',
      type: 'handle-traffic-event',
      titleKey: 'objective.handleCampaign.title',
      descriptionKey: 'objective.handleCampaign.description',
      eventId: 'marketing-launch',
    },
    {
      id: 'growth-preview-satisfaction',
      type: 'finish-satisfaction',
      titleKey: 'objective.protectTrust75.title',
      descriptionKey: 'objective.protectTrust75.description',
      minimumSatisfaction: 75,
    },
  ],
  minimumSurvivalDurationSeconds: 300,
  winCondition: {
    type: 'all-required-objectives',
    requiredObjectiveIds: ['survive-growth-preview'],
  },
}

export const verticalScalingLimitStageConfig: StageConfig = {
  ...prototypeStageConfig,
  id: 'vertical-scaling-limit',
  sequence: 3,
  nameKey: 'stage.verticalScalingLimit.name',
  storyBriefingKey: 'stage.verticalScalingLimit.briefing',
  trafficProfile: {
    initialActiveUsers: 40,
    activeUserGrowthIntervalSeconds: 5,
    activeUsersAddedPerInterval: 2,
    requestsPerUserPerSecond: 0.1,
  },
  tutorialSteps: [
    {
      titleKey: 'stage.verticalScalingLimit.tutorialTitle',
      messageKey: 'stage.verticalScalingLimit.tutorialMessage',
    },
  ],
  learningSteps: [],
  learningGoalKeys: [
    'learning.goal.verticalCeiling',
    'learning.goal.horizontalSharing',
  ],
  trafficEvents: [],
  unlocksResourceTypes: [],
  minimumSurvivalDurationSeconds: 330,
  primaryObjective: {
    id: 'observe-vertical-limit',
    type: 'survive-duration',
    titleKey: 'objective.scalingCeiling.title',
    descriptionKey: 'objective.scalingCeiling.description',
    durationSeconds: 330,
  },
  secondaryObjectives: [
    {
      id: 'vertical-limit-satisfaction',
      type: 'finish-satisfaction',
      titleKey: 'objective.protectTrust70.title',
      descriptionKey: 'objective.protectTrust70.description',
      minimumSatisfaction: 70,
    },
    {
      id: 'vertical-limit-latency',
      type: 'maintain-latency',
      titleKey: 'objective.controlLatency600.title',
      descriptionKey: 'objective.controlLatency600.description',
      maximumLatencyMs: 600,
      durationSeconds: 60,
    },
  ],
  winCondition: {
    type: 'all-required-objectives',
    requiredObjectiveIds: ['observe-vertical-limit'],
  },
  starCriteria: {
    twoStars: {
      minimumSatisfaction: 75,
    },
    threeStars: {
      minimumSatisfaction: 90,
      minimumBalance: 100,
    },
  },
}

export const surviveTheLaunchStageConfig: StageConfig = {
  ...prototypeStageConfig,
  id: 'survive-the-launch',
  sequence: 4,
  nameKey: 'stage.surviveLaunch.name',
  storyBriefingKey: 'stage.surviveLaunch.briefing',
  trafficProfile: {
    initialActiveUsers: 30,
    activeUserGrowthIntervalSeconds: 20,
    activeUsersAddedPerInterval: 1,
    requestsPerUserPerSecond: 0.1,
  },
  tutorialSteps: [],
  learningSteps: [],
  learningGoalKeys: [
    'learning.goal.loadBalancer',
    'learning.goal.multipleServers',
  ],
  trafficEvents: [
    {
      id: 'feature-launch',
      type: 'traffic-multiplier',
      senderKey: 'event.launch.sender',
      titleKey: 'event.launch.title',
      messageKey: 'event.launch.message',
      startsAtSecond: 60,
      durationSeconds: 300,
      forecastMinimumMultiplier: 4.5,
      forecastMaximumMultiplier: 6.5,
      outcomeProfile: {
        typicalProbability: 0.75,
        moderatelyLowerProbability: 0.105,
        moderatelyHigherProbability: 0.105,
        tailProbability: 0.04,
        typicalRange: [5, 6],
        moderatelyLowerRange: [4.5, 5],
        moderatelyHigherRange: [6, 7],
        tailRange: [7, 7.5],
        tailExplanationKey: 'event.launch.tail',
      },
    },
  ],
  unlocksResourceTypes: ['load-balancer'],
  minimumSurvivalDurationSeconds: 390,
  primaryObjective: {
    id: 'survive-feature-launch',
    type: 'survive-duration',
    titleKey: 'objective.surviveLaunch.title',
    descriptionKey: 'objective.surviveLaunch.description',
    durationSeconds: 390,
  },
  secondaryObjectives: [
    {
      id: 'handle-feature-launch',
      type: 'handle-traffic-event',
      titleKey: 'objective.handleLaunch.title',
      descriptionKey: 'objective.handleLaunch.description',
      eventId: 'feature-launch',
    },
    {
      id: 'launch-satisfaction',
      type: 'finish-satisfaction',
      titleKey: 'objective.protectTrust80.title',
      descriptionKey: 'objective.protectTrust80.description',
      minimumSatisfaction: 80,
    },
    {
      id: 'launch-latency',
      type: 'maintain-latency',
      titleKey: 'objective.responsiveLaunch.title',
      descriptionKey: 'objective.responsiveLaunch.description',
      maximumLatencyMs: 400,
      durationSeconds: 120,
    },
  ],
  winCondition: {
    type: 'all-required-objectives',
    requiredObjectiveIds: ['survive-feature-launch'],
  },
  starCriteria: {
    twoStars: {
      minimumSatisfaction: 80,
    },
    threeStars: {
      minimumSatisfaction: 95,
      minimumBalance: 120,
    },
  },
}

export const campaignStageConfigs: readonly StageConfig[] = [
  prototypeStageConfig,
  growthPreviewStageConfig,
  verticalScalingLimitStageConfig,
  surviveTheLaunchStageConfig,
  databaseBottleneckStage,
  readHeavyStage,
  backgroundStage,
  uploadsStage,
  securityStage,
  recoveryStage,
]

export function getCampaignStage(stageIndex: number) {
  return campaignStageConfigs[stageIndex]
}
