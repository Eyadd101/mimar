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

export type StageConfig = {
  id: string
  sequence: number
  name: string
  storyBriefing: string
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
  id: 'prototype-run',
  sequence: 1,
  name: 'Startup Launch',
  storyBriefing:
    'Keep the startup online while its first wave of customers arrives.',
  minimumSurvivalDurationSeconds: 240,
  primaryObjective: {
    id: 'survive-launch',
    type: 'survive-duration',
    title: 'Keep the service running',
    description: 'Stay operational for 4 game minutes.',
    durationSeconds: 240,
  },
  secondaryObjectives: [
    {
      id: 'healthy-customers',
      type: 'finish-satisfaction',
      title: 'Healthy customers',
      description: 'Finish with at least 70% satisfaction.',
      minimumSatisfaction: 70,
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
    requiredObjectiveIds: ['survive-launch'],
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
