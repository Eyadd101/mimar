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

export type TrafficEventDefinition = {
  id: string
  type: 'traffic-multiplier'
  sender: string
  title: string
  message: string
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
    tailExplanation: string
  }
}

export type StageConfig = {
  id: string
  sequence: number
  name: string
  storyBriefing: string
  trafficProfile: StageTrafficProfile
  tutorialSteps: TutorialStep[]
  learningGoals: string[]
  trafficEvents: TrafficEventDefinition[]
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
  trafficEvents: [],
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
  id: 'marketing-campaign',
  sequence: 2,
  name: 'Marketing Campaign',
  storyBriefing:
    'Marketing is launching a major campaign. Read the forecast and prepare the infrastructure before customers arrive.',
  trafficProfile: {
    initialActiveUsers: 20,
    activeUserGrowthIntervalSeconds: 10,
    activeUsersAddedPerInterval: 1,
    requestsPerUserPerSecond: 0.1,
  },
  tutorialSteps: [],
  learningGoals: [
    'Capacity planning uses forecasts to prepare before demand arrives.',
    'Forecasts describe a range rather than a guaranteed result.',
  ],
  trafficEvents: [
    {
      id: 'marketing-launch',
      type: 'traffic-multiplier',
      sender: 'Marketing Team',
      title: 'Major campaign launch',
      message: "We're launching a major campaign soon.",
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
        tailExplanation:
          'Your campaign went viral after a large creator shared the product.',
      },
    },
  ],
  primaryObjective: {
    id: 'survive-growth-preview',
    type: 'survive-duration',
    title: 'Keep growing',
    description: 'Stay operational through the marketing campaign.',
    durationSeconds: 300,
  },
  secondaryObjectives: [
    {
      id: 'handle-marketing-launch',
      type: 'handle-traffic-event',
      title: 'Handle the campaign',
      description: 'Remain operational until the campaign traffic ends.',
      eventId: 'marketing-launch',
    },
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

export const verticalScalingLimitStageConfig: StageConfig = {
  ...prototypeStageConfig,
  id: 'vertical-scaling-limit',
  sequence: 3,
  name: 'Vertical Scaling Limit',
  storyBriefing:
    'The company is growing faster. The Medium Server is the largest vertical tier available, and one machine still handles every request.',
  trafficProfile: {
    initialActiveUsers: 40,
    activeUserGrowthIntervalSeconds: 5,
    activeUsersAddedPerInterval: 2,
    requestsPerUserPerSecond: 0.1,
  },
  tutorialSteps: [
    {
      title: 'A new kind of limit',
      message:
        'Vertical scaling made one server stronger. Watch what happens when growth catches up with the largest available tier.',
    },
  ],
  learningGoals: [
    'Vertical scaling eventually reaches a practical ceiling.',
    'Horizontal scaling means sharing traffic across multiple servers.',
  ],
  trafficEvents: [],
  minimumSurvivalDurationSeconds: 330,
  primaryObjective: {
    id: 'observe-vertical-limit',
    type: 'survive-duration',
    title: 'Reach the scaling ceiling',
    description: 'Keep the company operating for 5½ game minutes.',
    durationSeconds: 330,
  },
  secondaryObjectives: [
    {
      id: 'vertical-limit-satisfaction',
      type: 'finish-satisfaction',
      title: 'Protect customer trust',
      description: 'Finish with at least 70% satisfaction.',
      minimumSatisfaction: 70,
    },
    {
      id: 'vertical-limit-latency',
      type: 'maintain-latency',
      title: 'Keep response time controlled',
      description: 'Maintain latency below 600 ms for 60 seconds.',
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

export const campaignStageConfigs: readonly StageConfig[] = [
  prototypeStageConfig,
  growthPreviewStageConfig,
  verticalScalingLimitStageConfig,
]

export function getCampaignStage(stageIndex: number) {
  return campaignStageConfigs[stageIndex]
}
