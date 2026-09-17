import { gameStateConfig } from '../simulation/config'

export type StageObjectiveDefinition =
  | {
      id: string
      type: 'survive-duration'
      title: string
      description: string
      durationSeconds: number
    }
  | {
      id: string
      type: 'finish-satisfaction'
      title: string
      description: string
      minimumSatisfaction: number
    }
  | {
      id: string
      type: 'finish-balance'
      title: string
      description: string
      minimumBalance: number
    }
  | {
      id: string
      type: 'maintain-satisfaction'
      title: string
      description: string
      minimumSatisfaction: number
      durationSeconds: number
    }
  | {
      id: string
      type: 'maintain-latency'
      title: string
      description: string
      maximumLatencyMs: number
      durationSeconds: number
    }
  | {
      id: string
      type: 'handle-traffic-event'
      title: string
      description: string
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
  initialActiveUsers: number
  activeUserGrowthIntervalSeconds: number
  activeUsersAddedPerInterval: number
  requestsPerUserPerSecond: number
}

export type TutorialStep = {
  title: string
  message: string
}

export type StageConfig = {
  id: string
  sequence: number
  name: string
  storyBriefing: string
  trafficProfile: StageTrafficProfile
  tutorialSteps: TutorialStep[]
  learningGoals: string[]
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
  name: 'First Users',
  storyBriefing:
    'The SaaS startup has launched. Only a small number of customers are using it—for now.',
  trafficProfile: {
    initialActiveUsers: 20,
    activeUserGrowthIntervalSeconds: 5,
    activeUsersAddedPerInterval: 1,
    requestsPerUserPerSecond: 0.1,
  },
  tutorialSteps: [
    {
      title: 'Watch the demand',
      message:
        'Active users create requests. Watch Requests/sec as the customer base grows.',
    },
    {
      title: 'Read the server',
      message:
        'CPU shows how much request capacity the App Server is using. Latency shows how long customers wait.',
    },
    {
      title: 'Make the call',
      message:
        'Open the App Server when pressure rises. You decide whether the current tier is still enough.',
    },
  ],
  learningGoals: [
    'Requests turn user activity into server load.',
    'Vertical scaling increases one server’s capacity.',
  ],
  minimumSurvivalDurationSeconds: 270,
  primaryObjective: {
    id: 'survive-first-users',
    type: 'survive-duration',
    title: 'Survive the growth period',
    description: 'Stay solvent and operational for 4½ game minutes.',
    durationSeconds: 270,
  },
  secondaryObjectives: [
    {
      id: 'healthy-customers',
      type: 'finish-satisfaction',
      title: 'Healthy customers',
      description: 'Finish with at least 75% satisfaction.',
      minimumSatisfaction: 75,
    },
    {
      id: 'cash-reserve',
      type: 'finish-balance',
      title: 'Protect the runway',
      description: 'Finish with at least 50 credits.',
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
  id: 'growth-preview',
  sequence: 2,
  name: 'Growth Preview',
  storyBriefing:
    'The startup is growing. Keep the infrastructure you built ready for the next challenge.',
  trafficProfile: {
    ...prototypeStageConfig.trafficProfile,
  },
  tutorialSteps: [],
  learningGoals: [],
  primaryObjective: {
    id: 'survive-growth-preview',
    type: 'survive-duration',
    title: 'Keep growing',
    description: 'Stay operational for 5 game minutes.',
    durationSeconds: 300,
  },
  secondaryObjectives: [
    {
      id: 'growth-preview-satisfaction',
      type: 'finish-satisfaction',
      title: 'Protect customer trust',
      description: 'Finish with at least 75% satisfaction.',
      minimumSatisfaction: 75,
    },
  ],
  minimumSurvivalDurationSeconds: 300,
  winCondition: {
    type: 'all-required-objectives',
    requiredObjectiveIds: ['survive-growth-preview'],
  },
}

export const campaignStageConfigs: readonly StageConfig[] = [
  prototypeStageConfig,
  growthPreviewStageConfig,
]

export function getCampaignStage(stageIndex: number) {
  return campaignStageConfigs[stageIndex]
}
