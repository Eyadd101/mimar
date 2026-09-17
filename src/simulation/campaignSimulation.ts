import {
  appServerResourceConfig,
  campaignProgressionConfig,
  economyConfig,
  type ServerTierId,
} from './config'
import type { StageRating } from './starRatingSimulation'
import type { TrafficSimulationState } from './trafficSimulation'

export type CampaignResourceType = 'users' | 'app-server' | 'database'

export type ResourcePosition = {
  x: number
  y: number
}

type CampaignResourceBase = {
  id: string
  name: string
  position: ResourcePosition
}

export type CampaignResource =
  | (CampaignResourceBase & {
      type: 'users' | 'database'
    })
  | (CampaignResourceBase & {
      type: 'app-server'
      tierId: ServerTierId
    })

export type CampaignConnection = {
  id: string
  sourceId: string
  targetId: string
}

export type CampaignInfrastructureState = {
  resources: CampaignResource[]
  connections: CampaignConnection[]
}

export type CampaignStageRecord = {
  stageId: string
  stars: 1 | 2 | 3
}

export type CampaignState = {
  currentStageIndex: number
  balance: number
  infrastructure: CampaignInfrastructureState
  unlockedResourceTypes: CampaignResourceType[]
  completedStages: CampaignStageRecord[]
}

export function createInitialCampaignState(): CampaignState {
  return {
    currentStageIndex: 0,
    balance: economyConfig.initialBalance,
    infrastructure: {
      resources: [
        {
          id: 'users',
          type: 'users',
          name: 'Users',
          position: { x: 0, y: 0 },
        },
        {
          id: 'server',
          type: 'app-server',
          name: appServerResourceConfig.name,
          tierId: appServerResourceConfig.initialTierId,
          position: { x: 340, y: 0 },
        },
        {
          id: 'database',
          type: 'database',
          name: 'Database',
          position: { x: 680, y: 0 },
        },
      ],
      connections: [
        { id: 'users-server', sourceId: 'users', targetId: 'server' },
        { id: 'server-database', sourceId: 'server', targetId: 'database' },
      ],
    },
    unlockedResourceTypes: ['users', 'app-server', 'database'],
    completedStages: [],
  }
}

export function getPrimaryAppServer(campaign: CampaignState) {
  const appServer = campaign.infrastructure.resources.find(
    (resource) => resource.type === 'app-server',
  )

  if (!appServer || appServer.type !== 'app-server') {
    throw new Error('Campaign infrastructure requires an App Server.')
  }

  return appServer
}

export function syncCampaignWithSimulation(
  campaign: CampaignState,
  simulation: TrafficSimulationState,
): CampaignState {
  const primaryAppServer = getPrimaryAppServer(campaign)
  const balanceChanged = campaign.balance !== simulation.balance
  const tierChanged = primaryAppServer.tierId !== simulation.appServer.tierId

  if (!balanceChanged && !tierChanged) {
    return campaign
  }

  return {
    ...campaign,
    balance: simulation.balance,
    infrastructure: tierChanged
      ? {
          ...campaign.infrastructure,
          resources: campaign.infrastructure.resources.map((resource) =>
            resource.id === primaryAppServer.id &&
            resource.type === 'app-server'
              ? { ...resource, tierId: simulation.appServer.tierId }
              : resource,
          ),
        }
      : campaign.infrastructure,
  }
}

export function updateResourcePosition(
  campaign: CampaignState,
  resourceId: string,
  position: ResourcePosition,
): CampaignState {
  return {
    ...campaign,
    infrastructure: {
      ...campaign.infrastructure,
      resources: campaign.infrastructure.resources.map((resource) =>
        resource.id === resourceId ? { ...resource, position } : resource,
      ),
    },
  }
}

export function createNextCampaignState(
  campaign: CampaignState,
  completedStageId: string,
  rating: StageRating,
): CampaignState {
  const stars = Math.max(1, rating.stars) as 1 | 2 | 3
  const carriedBalance = Math.max(
    Math.round(
      campaign.balance * campaignProgressionConfig.balanceCarryoverRatio * 10,
    ) / 10,
    campaignProgressionConfig.minimumNextStageBalance,
  )

  return {
    ...campaign,
    currentStageIndex: campaign.currentStageIndex + 1,
    balance: carriedBalance,
    completedStages: [
      ...campaign.completedStages,
      { stageId: completedStageId, stars },
    ],
  }
}
